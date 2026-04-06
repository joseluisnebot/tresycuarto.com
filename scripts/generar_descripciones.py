#!/usr/bin/env python3
"""
generar_descripciones.py — Genera descripciones para locales sin descripción usando Workers AI.

Modelo: @cf/meta/llama-3.1-8b-instruct (rápido, ~0.2 neuronas/local)
Coste estimado: 10.000 neuronas/día gratis → ~500-800 locales/día sin coste
Con plan Paid si supera: $0.011/1.000 neuronas → prácticamente 0

Uso:
  python3 generar_descripciones.py                  # 500 locales (defecto)
  python3 generar_descripciones.py --limite 200
  python3 generar_descripciones.py --ciudad Madrid --limite 100
  python3 generar_descripciones.py --dry-run         # sin guardar en D1

Cron sugerido: 0 6 * * * (cada mañana, tras el enriquecedor)
"""

import requests
import json
import time
import argparse
import logging
from datetime import datetime

# ── Configuración ──────────────────────────────────────────────────────────────
CF_ACCOUNT  = "0c4d9c91bb0f3a4c905545ecc158ec65"
CF_TOKEN    = "cfut_qTKfsExOPMBZJDjXoSCpAsJgnIEaBrJlRVtZsBE6f134a6d2"
DB_ID       = "458672aa-392f-4767-8d2b-926406628ba0"
AI_MODEL    = "@cf/meta/llama-3.2-3b-instruct"

D1_URL  = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
AI_URL  = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/run/{AI_MODEL}"
HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

PAUSA_ENTRE_LLAMADAS = 1.5   # segundos entre llamadas AI (evita rate limiting)
LIMITE_DEFECTO       = 300   # locales por ejecución — seguro dentro del tier gratuito (10.000 RTN/día)
MAX_TOKENS_RESPUESTA = 120   # ~80 palabras máximo

# Límite de seguridad: nunca superar este número para mantenerse en tier gratuito
# Workers AI: 10.000 RTN/día gratis. Llama-3.2-3b consume ~2 RTN/llamada → 5.000 llamadas/día máx.
# Con 300 locales/ejecución y 1 ejecución/día estamos muy por debajo.
LIMITE_MAXIMO_DIARIO = 400  # límite duro — nunca procesar más aunque se pase --limite mayor

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

# ── Workers AI ─────────────────────────────────────────────────────────────────
def generar_descripcion(local):
    prompt = construir_prompt(local)
    payload = {
        "messages": [
            {"role": "system", "content": "Eres un experto en ocio y tardeo en España. Escribes descripciones breves y atractivas de bares, pubs y cafeterías."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": MAX_TOKENS_RESPUESTA,
        "temperature": 0.7,
    }
    r = requests.post(AI_URL, headers=HEADERS, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise Exception(f"AI error: {data.get('errors')}")
    texto = data["result"]["response"].strip()
    # Limpiar artefactos comunes del modelo
    for prefix in ["Descripción:", "Aquí tienes", "Claro,", "Por supuesto,"]:
        if texto.startswith(prefix):
            texto = texto[len(prefix):].strip()
    return texto

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Genera descripciones de locales con Workers AI")
    parser.add_argument("--limite",  type=int, default=LIMITE_DEFECTO, help="Máx. locales a procesar")
    parser.add_argument("--ciudad",  type=str, default=None,           help="Procesar solo esta ciudad")
    parser.add_argument("--dry-run", action="store_true",              help="No guardar en D1")
    args = parser.parse_args()

    # Límite duro para no superar tier gratuito de Workers AI (10.000 RTN/día)
    if args.limite > LIMITE_MAXIMO_DIARIO:
        log.warning(f"Límite {args.limite} supera el máximo diario seguro ({LIMITE_MAXIMO_DIARIO}). Ajustando.")
        args.limite = LIMITE_MAXIMO_DIARIO

    log.info(f"=== Inicio generar_descripciones | limite={args.limite} ciudad={args.ciudad or 'todas'} dry-run={args.dry_run} ===")

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
    sql += f" ORDER BY rating DESC NULLS LAST LIMIT {args.limite}"

    locales = d1_query(sql, params if params else None)
    log.info(f"Locales a procesar: {len(locales)}")

    ok = 0
    errores = 0

    for i, local in enumerate(locales, 1):
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
