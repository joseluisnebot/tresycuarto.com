#!/usr/bin/env python3
"""
descripcion_desde_web.py — Extrae descripciones reales de la web de cada local.

Estrategia (sin inventar nada):
1. Fetch de la web del local
2. Extrae meta description o og:description
3. Si tiene ≥30 chars → guarda en D1
4. Si no → deja vacío

Uso:
  python3 descripcion_desde_web.py                  # 200 locales (defecto)
  python3 descripcion_desde_web.py --limite 500
  python3 descripcion_desde_web.py --ciudad Madrid
  python3 descripcion_desde_web.py --dry-run
"""

import os
import re
import time
import logging
import argparse
import requests
from html.parser import HTMLParser

# ── Config ──────────────────────────────────────────────────────────────────
CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN")
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"

D1_URL  = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

PAUSA           = 1.0   # segundos entre webs
TIMEOUT_WEB     = 8     # segundos timeout fetch
MIN_CHARS       = 30    # mínimo para considerar válida una descripción
MAX_CHARS       = 300   # truncar si es muy larga
LIMITE_DEFECTO  = 200

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/root/tresycuarto-sync/logs/descripcion_desde_web.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

# ── D1 helpers ──────────────────────────────────────────────────────────────
def d1_query(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL, headers=HEADERS, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise Exception(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]

def d1_run(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL, headers=HEADERS, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise Exception(f"D1 error: {data.get('errors')}")
    return data["result"][0]

# ── Extractor de meta tags ──────────────────────────────────────────────────
class MetaExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.description = None

    def handle_starttag(self, tag, attrs):
        if self.description:
            return
        if tag != "meta":
            return
        attrs = dict(attrs)
        name    = (attrs.get("name") or "").lower()
        prop    = (attrs.get("property") or "").lower()
        content = attrs.get("content", "").strip()

        if name in ("description",) and content:
            self.description = content
        elif prop in ("og:description",) and content and not self.description:
            self.description = content


def extraer_descripcion_web(url):
    """Descarga la web y extrae meta description / og:description."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; tresycuarto-bot/1.0)",
            "Accept": "text/html",
        }
        r = requests.get(url, headers=headers, timeout=TIMEOUT_WEB, allow_redirects=True)
        if r.status_code != 200:
            return None

        # Solo leer los primeros 20KB (el head suele estar al inicio)
        html = r.content[:20000].decode("utf-8", errors="ignore")

        parser = MetaExtractor()
        parser.feed(html)

        desc = parser.description
        if not desc or len(desc) < MIN_CHARS:
            return None

        # Limpiar espacios múltiples y saltos de línea
        desc = re.sub(r"\s+", " ", desc).strip()

        # Truncar si es muy larga
        if len(desc) > MAX_CHARS:
            desc = desc[:MAX_CHARS].rsplit(" ", 1)[0] + "..."

        # Descartar descripciones genéricas / spam
        BLACKLIST = [
            "wordpress", "best theme", "followers", "following", "posts -",
            "just another", "coming soon", "página de inicio", "home page",
            "cookie", "privacy policy", "política de privacidad",
            "404", "not found", "error",
        ]
        desc_lower = desc.lower()
        if any(kw in desc_lower for kw in BLACKLIST):
            return None

        return desc

    except Exception:
        return None


# ── Main ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limite",  type=int, default=LIMITE_DEFECTO)
    parser.add_argument("--ciudad",  type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not CF_TOKEN:
        raise RuntimeError("CLOUDFLARE_API_TOKEN no definido")

    log.info(f"=== Inicio descripcion_desde_web | limite={args.limite} ciudad={args.ciudad or 'todas'} ===")

    sql = """
        SELECT id, nombre, ciudad, web
        FROM locales
        WHERE web IS NOT NULL
          AND (descripcion IS NULL OR descripcion = '')
          AND (descripcion_google IS NULL OR descripcion_google = '')
    """
    params = []
    if args.ciudad:
        sql += " AND ciudad = ?"
        params.append(args.ciudad)
    sql += f" ORDER BY rating DESC NULLS LAST LIMIT {args.limite}"

    locales = d1_query(sql, params if params else None)
    log.info(f"Locales a procesar: {len(locales)}")

    ok = 0
    sin_desc = 0
    errores = 0

    for i, local in enumerate(locales, 1):
        try:
            desc = extraer_descripcion_web(local["web"])

            if not desc:
                log.info(f"  [{i}/{len(locales)}] {local['nombre']} ({local['ciudad']}) → sin meta description")
                sin_desc += 1
                continue

            if not args.dry_run:
                d1_run(
                    "UPDATE locales SET descripcion = ? WHERE id = ?",
                    [desc, local["id"]]
                )

            log.info(f"  [{i}/{len(locales)}] {local['nombre']} ({local['ciudad']}) → {desc[:80]}...")
            ok += 1

        except Exception as e:
            log.error(f"  [{i}/{len(locales)}] {local['nombre']} → ERROR: {e}")
            errores += 1

        time.sleep(PAUSA)

    log.info(f"=== Fin | Con descripción: {ok} | Sin meta: {sin_desc} | Errores: {errores} ===")


if __name__ == "__main__":
    main()
