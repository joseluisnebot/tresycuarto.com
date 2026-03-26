#!/usr/bin/env python3
"""
generar_slugs.py
Genera slugs únicos por ciudad para todos los locales y los guarda en D1.
URL resultante: /locales/{ciudad-slug}/{local-slug}

Ejemplo: "Bodeguita La Reja" en Sevilla → /locales/sevilla/bodeguita-la-reja

Uso:
  python3 generar_slugs.py          # todos los locales sin slug
  python3 generar_slugs.py --reset  # regenerar todos (sobreescribe existentes)
  python3 generar_slugs.py --dry-run # solo mostrar, no escribir
"""

import os, re, sys, time, requests, argparse, unicodedata
from collections import defaultdict

CF_ACCOUNT = os.environ["CLOUDFLARE_ACCOUNT_ID"]
CF_TOKEN   = os.environ["CLOUDFLARE_API_TOKEN"]
D1_DB      = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL     = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB}/query"
BATCH_URL  = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB}/batch"
HEADERS    = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

parser = argparse.ArgumentParser()
parser.add_argument("--reset",   action="store_true", help="Regenerar slugs de todos los locales")
parser.add_argument("--dry-run", action="store_true", help="Solo mostrar, no escribir en D1")
args = parser.parse_args()


def d1(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL, headers=HEADERS, json=body, timeout=30)
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(data.get("errors"))
    return data["result"][0]["results"]


def update_one(id_, slug):
    return d1("UPDATE locales SET slug = ? WHERE id = ?", [slug, id_])


def slugify(text):
    """'Bar El Rincón de Tito' → 'bar-el-rincon-de-tito'"""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text[:80]  # máx 80 chars


# ── Cargar locales ────────────────────────────────────────────────────────────
where = "WHERE 1=1" if args.reset else "WHERE slug IS NULL OR slug = ''"
print(f"Cargando locales ({where})...")

all_locales = []
offset = 0
limit  = 5000
while True:
    batch_rows = d1(f"SELECT id, nombre, ciudad FROM locales {where} ORDER BY ciudad, nombre LIMIT {limit} OFFSET {offset}")
    if not batch_rows:
        break
    all_locales.extend(batch_rows)
    offset += limit
    print(f"  {len(all_locales)} cargados...")
    if len(batch_rows) < limit:
        break

print(f"Total a procesar: {len(all_locales)}")

# ── Cargar slugs ya existentes por ciudad (para evitar duplicados) ─────────────
print("Cargando slugs existentes...")
existing = d1("SELECT ciudad, slug FROM locales WHERE slug IS NOT NULL AND slug != ''")
used_slugs = defaultdict(set)
for row in existing:
    used_slugs[row["ciudad"]].add(row["slug"])

# ── Generar slugs únicos ──────────────────────────────────────────────────────
print("Generando slugs...")
updates = []  # lista de (id, slug)

# Agrupar por ciudad para gestionar duplicados en memoria
from itertools import groupby
all_locales.sort(key=lambda x: x["ciudad"])

for ciudad, group in groupby(all_locales, key=lambda x: x["ciudad"]):
    ciudad_used = used_slugs[ciudad].copy()
    for local in group:
        base = slugify(local["nombre"])
        if not base:
            base = slugify(local["id"])
        slug = base
        n = 2
        while slug in ciudad_used:
            slug = f"{base}-{n}"
            n += 1
        ciudad_used.add(slug)
        updates.append((local["id"], slug))

print(f"Slugs generados: {len(updates)}")
if args.dry_run:
    for id_, slug in updates[:20]:
        print(f"  {id_[:30]:30s} → {slug}")
    print("  (dry-run, no se escribe en D1)")
    sys.exit(0)

# ── Escribir en D1 con threading ─────────────────────────────────────────────
from concurrent.futures import ThreadPoolExecutor, as_completed

WORKERS   = 15
total_ok  = 0
total_err = 0

with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = {executor.submit(update_one, id_, slug): (id_, slug) for id_, slug in updates}
    for future in as_completed(futures):
        try:
            future.result()
            total_ok += 1
        except Exception as e:
            total_err += 1
            id_, slug = futures[future]
            print(f"  ERROR {id_}: {e}")
        if (total_ok + total_err) % 1000 == 0:
            print(f"  {total_ok + total_err}/{len(updates)} procesados...")

print(f"\n✓ {total_ok} slugs guardados | {total_err} errores")
