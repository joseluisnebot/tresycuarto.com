#!/usr/bin/env python3
"""
generar_rating_horario.py
Genera rating sintético y horario lógico para locales sin datos reales en D1.

Rating: ponderación basada en presencia online (web, instagram, tel, foto, etc.)
Horario: horario lógico según tipo (bar, pub, cafe, biergarten) con variación ±30min

REGLAS:
- Solo toca locales donde rating IS NULL OR rating = 0
- Solo toca locales donde horario IS NULL AND horario_google IS NULL
- Locales con datos reales de Google Places nunca se modifican
"""

import os
import sys
import requests
import random
import time

API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
DB_ID = "458672aa-392f-4767-8d2b-926406628ba0"

if not API_TOKEN:
    print("ERROR: CLOUDFLARE_API_TOKEN no definido")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
}

# ── D1 helpers ─────────────────────────────────────────────────────────────

def d1_query(sql, params=None):
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"
    body = {"sql": sql}
    if params:
        body["params"] = params
    for intento in range(3):
        try:
            r = requests.post(url, headers=HEADERS, json=body, timeout=30)
            r.raise_for_status()
            data = r.json()
            if not data.get("success"):
                raise Exception(f"D1 error: {data.get('errors')}")
            return data["result"][0].get("results", [])
        except Exception as e:
            if intento == 2:
                raise
            time.sleep(2 ** intento)

def update_batch_rating(batch):
    """Actualiza rating y rating_count para un lote usando CASE (1 sola query)."""
    if not batch:
        return
    ids = [str(r["id"]) for r in batch]
    rating_cases  = " ".join(f"WHEN '{r['id']}' THEN {r['rating']}" for r in batch)
    count_cases   = " ".join(f"WHEN '{r['id']}' THEN {r['count']}" for r in batch)
    ids_list = ",".join(f"'{i}'" for i in ids)
    sql = (
        f"UPDATE locales SET "
        f"rating = CASE id {rating_cases} END, "
        f"rating_count = CASE id {count_cases} END "
        f"WHERE id IN ({ids_list})"
    )
    d1_query(sql)
    time.sleep(0.1)

def update_batch_horario(batch):
    """Actualiza horario para un lote usando CASE (1 sola query)."""
    if not batch:
        return
    ids = [str(r["id"]) for r in batch]
    # Los horarios tienen caracteres especiales, usar params no es viable con CASE
    # Construimos el CASE directamente escapando las comillas simples
    cases = " ".join(f"WHEN '{r['id']}' THEN '{r['horario'].replace(chr(39), chr(39)*2)}'" for r in batch)
    ids_list = ",".join(f"'{i}'" for i in ids)
    sql = f"UPDATE locales SET horario = CASE id {cases} END WHERE id IN ({ids_list})"
    d1_query(sql)
    time.sleep(0.1)

# ── Rating sintético ────────────────────────────────────────────────────────

def calcular_rating(local, rng):
    """
    Base 2.8 + señales de presencia online.
    Máx teórico: 4.8 (nunca 5.0 — nadie es perfecto).
    """
    score = 2.8
    if local.get("web"):                                    score += 0.5
    if local.get("instagram"):                              score += 0.4
    if local.get("telefono"):                               score += 0.3
    if local.get("horario") or local.get("horario_google"): score += 0.3
    if local.get("photo_url"):                              score += 0.2
    if local.get("descripcion") or local.get("descripcion_google"): score += 0.2
    if local.get("terraza"):                                score += 0.1

    # Variación aleatoria ±0.15 para naturalidad
    score += rng.uniform(-0.15, 0.15)
    return round(min(max(score, 1.0), 4.9), 1)

def calcular_rating_count(local, rng):
    """Número de reseñas inferido de la presencia online."""
    base = 4
    if local.get("web"):                                    base += 10
    if local.get("instagram"):                              base += 8
    if local.get("telefono"):                               base += 5
    if local.get("horario") or local.get("horario_google"): base += 6
    if local.get("photo_url"):                              base += 8
    if local.get("descripcion") or local.get("descripcion_google"): base += 5
    base += rng.randint(0, 10)
    return min(base, 60)

# ── Horario sintético ───────────────────────────────────────────────────────

def generar_horario(tipo, rng):
    """
    Horario lógico con variación aleatoria de ±30 min para naturalidad.
    Formato: 'Lun-Jue HH:MM-HH:MM; Vie-Sáb HH:MM-HH:MM; Dom HH:MM-HH:MM'
    """
    def hv(hora, minuto=0, variacion=30):
        """Hora con variación aleatoria en minutos."""
        total = hora * 60 + minuto + rng.randint(-variacion, variacion)
        total = max(0, min(total, 23 * 60 + 59))
        return f"{total // 60:02d}:{total % 60:02d}"

    t = (tipo or "bar").lower()

    if t == "cafe":
        ap = hv(8, 0, 20)
        cl_lv = hv(21, 0, 30)
        cl_dom = hv(14, 0, 20)
        return f"Lun-Sáb {ap}-{cl_lv}; Dom {hv(9, 0, 20)}-{cl_dom}"

    elif t == "pub":
        ap = hv(18, 0, 30)
        cl_lj = hv(2, 0, 30)
        cl_fs = hv(3, 30, 30)
        cl_dom = hv(1, 0, 20)
        return f"Lun-Jue {ap}-{cl_lj}; Vie-Sáb {ap}-{cl_fs}; Dom {ap}-{cl_dom}"

    elif t == "biergarten":
        ap = hv(12, 0, 30)
        cl = hv(23, 0, 30)
        return f"Lun-Dom {ap}-{cl}"

    else:  # bar (default)
        ap = hv(12, 0, 30)
        cl_lj = hv(0, 0, 30)
        cl_fs = hv(2, 0, 30)
        cl_dom = hv(23, 0, 30)
        return f"Lun-Jue {ap}-{cl_lj}; Vie-Sáb {ap}-{cl_fs}; Dom {ap}-{cl_dom}"

# ── Main ────────────────────────────────────────────────────────────────────

def paginar(sql_base, page_size=1000):
    """Pagina resultados de D1 usando LIMIT/OFFSET."""
    offset = 0
    while True:
        rows = d1_query(f"{sql_base} LIMIT {page_size} OFFSET {offset}")
        if not rows:
            break
        yield from rows
        if len(rows) < page_size:
            break
        offset += page_size

def main():
    rng = random.Random(2026)  # seed fijo para reproducibilidad

    # ── 1. Ratings ──────────────────────────────────────────────────────────
    print("Cargando locales sin rating real...")
    locales_rating = list(paginar("""
        SELECT id, web, instagram, telefono, horario, horario_google,
               photo_url, descripcion, descripcion_google, terraza, tipo
        FROM locales
        WHERE (rating IS NULL OR rating = 0)
    """))
    print(f"  → {len(locales_rating)} locales sin rating")

    BATCH = 100
    total_rating = 0
    for i in range(0, len(locales_rating), BATCH):
        batch_in = locales_rating[i:i+BATCH]
        batch_out = []
        for local in batch_in:
            batch_out.append({
                "id": local["id"],
                "rating": calcular_rating(local, rng),
                "count": calcular_rating_count(local, rng),
            })
        update_batch_rating(batch_out)
        total_rating += len(batch_in)
        print(f"  Rating: {total_rating}/{len(locales_rating)}", end="\r", flush=True)
    print(f"\n  ✓ {total_rating} locales con rating actualizado")

    # ── 2. Horarios ─────────────────────────────────────────────────────────
    print("\nCargando locales sin horario real...")
    locales_horario = list(paginar("""
        SELECT id, tipo FROM locales
        WHERE (horario IS NULL OR horario = '')
          AND (horario_google IS NULL OR horario_google = '')
    """))
    print(f"  → {len(locales_horario)} locales sin horario")

    total_horario = 0
    for i in range(0, len(locales_horario), BATCH):
        batch_in = locales_horario[i:i+BATCH]
        batch_out = [{"id": l["id"], "horario": generar_horario(l.get("tipo"), rng)} for l in batch_in]
        update_batch_horario(batch_out)
        total_horario += len(batch_in)
        print(f"  Horario: {total_horario}/{len(locales_horario)}", end="\r", flush=True)
    print(f"\n  ✓ {total_horario} locales con horario actualizado")

    print("\n✅ Completado")

if __name__ == "__main__":
    main()
