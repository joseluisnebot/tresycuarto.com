#!/usr/bin/env python3
"""
generar_descripciones.py — Genera descripciones para locales sin descripción usando Ollama local.

Modelo: llama3.2:3b en localhost:11434 — gratis, sin límites, mismo modelo que Workers AI.

Uso:
  python3 generar_descripciones.py                  # 500 locales (defecto)
  python3 generar_descripciones.py --limite 200
  python3 generar_descripciones.py --ciudad Madrid --limite 100
  python3 generar_descripciones.py --dry-run         # sin guardar en D1

Cron sugerido: 0 6 * * * (cada mañana, tras el enriquecedor)
"""

import os
import requests
import json
import time
import argparse
import logging
from datetime import datetime

# ── Configuración ──────────────────────────────────────────────────────────────
CF_ACCOUNT  = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
CF_TOKEN    = os.environ.get("CLOUDFLARE_API_TOKEN", "")
DB_ID       = "458672aa-392f-4767-8d2b-926406628ba0"

if not CF_TOKEN:
    raise SystemExit("ERROR: CLOUDFLARE_API_TOKEN no definido")

D1_URL    = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
D1_HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

# Ollama local — gratis, sin límites
OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3.2:3b"

PAUSA_ENTRE_LLAMADAS = 0.5   # Ollama es local, no necesita tanta pausa
LIMITE_DEFECTO       = 500   # sin límite de coste, podemos procesar más
MAX_TOKENS_RESPUESTA = 120   # ~80 palabras máximo

TIPO_LABEL = {
    "bar": "bar", "pub": "pub", "cafe": "cafetería",
    "restaurant": "restaurante", "nightclub": "discoteca", "lounge": "lounge",
    "biergarten": "terraza-cervecería",
}

# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/root/tresycuarto-sync/logs/generar_descripciones.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

# ── Helpers D1 ─────────────────────────────────────────────────────────────────
def d1_query(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL, headers=D1_HEADERS, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise Exception(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]

def d1_run(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL, headers=D1_HEADERS, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise Exception(f"D1 error: {data.get('errors')}")
    return data["result"][0]

# ── Prompt ─────────────────────────────────────────────────────────────────────
def construir_prompt(local):
    tipo  = TIPO_LABEL.get(local.get("tipo", ""), "local")
    parts = []

    if local.get("direccion"):
        parts.append(f"Dirección: {local['direccion']}")
    if local.get("horario"):
        parts.append(f"Horario: {local['horario']}")
    if local.get("terraza") == 1 or local.get("outdoor_seating") == 1:
        parts.append("Tiene terraza exterior")
    if local.get("live_music") == 1:
        parts.append("Tiene música en directo")
    if local.get("instagram"):
        parts.append(f"Instagram: @{local['instagram']}")

    datos = "\n".join(f"- {p}" for p in parts) if parts else "- Sin datos adicionales"

    return f"""Escribe una descripción breve y atractiva (máximo 60 palabras) para este {tipo} de tardeo en España.
NO inventes datos que no aparezcan abajo. Tono cercano e informal. Sin comillas. Sin introducción.

Local: {local['nombre']}
Ciudad: {local['ciudad']}
{datos}

Descripción:"""

# ── Ollama local ───────────────────────────────────────────────────────────────
def generar_descripcion(local):
    prompt = construir_prompt(local)
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "Eres un experto en ocio y tardeo en España. Escribes descripciones breves y atractivas de bares, pubs y cafeterías."},
            {"role": "user", "content": prompt},
        ],
        "options": {"temperature": 0.7, "num_predict": MAX_TOKENS_RESPUESTA},
        "stream": False,
    }
    r = requests.post(OLLAMA_URL, json=payload, timeout=60)
    r.raise_for_status()
    texto = r.json()["message"]["content"].strip()
    # Limpiar artefactos comunes del modelo
    for prefix in ["Descripción:", "Aquí tienes", "Claro,", "Por supuesto,"]:
        if texto.startswith(prefix):
            texto = texto[len(prefix):].strip()
    return texto

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Genera descripciones de locales con Ollama local (gratis)")
    parser.add_argument("--limite",    type=int, default=LIMITE_DEFECTO, help="Máx. locales a procesar")
    parser.add_argument("--ciudad",    type=str, default=None,           help="Procesar solo esta ciudad")
    parser.add_argument("--dry-run",   action="store_true",              help="No guardar en D1")
    parser.add_argument("--hora-fin",  type=int, default=None,           help="Parar a esta hora UTC (ej: 6 para las 6:00 UTC = 8:00 CEST)")
    args = parser.parse_args()

    from datetime import datetime
    hora_fin = args.hora_fin  # hora UTC en la que parar

    log.info(f"=== Inicio generar_descripciones (Ollama local) | limite={args.limite} ciudad={args.ciudad or 'todas'} hora-fin={hora_fin or 'sin límite'} ===")

    # Obtener locales sin descripción
    sql = """
        SELECT id, nombre, tipo, ciudad, direccion, horario, terraza, outdoor_seating, live_music, instagram, web
        FROM locales
        WHERE (descripcion IS NULL OR descripcion = '')
          AND slug IS NOT NULL AND slug != ''
    """
    params = []
    if args.ciudad:
        sql += " AND ciudad = ?"
        params.append(args.ciudad)
    # Priorizar ciudades pequeñas (menos competencia en Google → posición 1 más fácil)
    # Dentro de cada ciudad, ordenar por rating para priorizar los más buscados
    sql += f"""
        ORDER BY (
            SELECT COUNT(*) FROM locales l2
            WHERE l2.ciudad = locales.ciudad
        ) ASC,
        rating DESC NULLS LAST
        LIMIT {args.limite}"""

    locales = d1_query(sql, params if params else None)
    log.info(f"Locales a procesar: {len(locales)}")

    ok = 0
    errores = 0

    for i, local in enumerate(locales, 1):
        # Parar si hemos llegado a la hora límite
        if hora_fin is not None and datetime.utcnow().hour >= hora_fin:
            log.info(f"Hora límite UTC {hora_fin}:00 alcanzada. Parando ({ok} generadas).")
            break

        try:
            descripcion = generar_descripcion(local)

            if not descripcion or len(descripcion) < 10:
                log.warning(f"  [{i}/{len(locales)}] {local['nombre']} → descripción vacía, saltando")
                errores += 1
                continue

            if not args.dry_run:
                d1_run(
                    "UPDATE locales SET descripcion = ? WHERE id = ?",
                    [descripcion, local["id"]]
                )

            log.info(f"  [{i}/{len(locales)}] {local['nombre']} ({local['ciudad']}) → {descripcion[:60]}...")
            ok += 1

        except Exception as e:
            log.error(f"  [{i}/{len(locales)}] {local['nombre']} → ERROR: {e}")
            errores += 1

        time.sleep(PAUSA_ENTRE_LLAMADAS)

    log.info(f"=== Fin | OK: {ok} | Errores: {errores} | Total: {len(locales)} ===")

if __name__ == "__main__":
    main()
