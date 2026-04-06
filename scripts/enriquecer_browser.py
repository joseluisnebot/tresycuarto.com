#!/usr/bin/env python3
"""
enriquecer_browser.py — Enriquece locales con web/instagram usando Browser Rendering.

Llama al Worker tresycuarto-browser que visita la web del local y extrae:
  telefono, horario, descripcion, photo_url, instagram

Solo procesa locales que tienen web o instagram pero les faltan datos.

Control de gasto:
  - Máx. 100 locales/día (defecto) → ~17 min de las 10h/mes incluidas
  - Timeout: 15s por página (en el Worker)
  - Para automáticamente si acumula más de 480 min en el mes (8h de las 10h incluidas)
  - Log de tiempo acumulado en logs/browser_minutos.txt

Uso:
  python3 enriquecer_browser.py                  # 100 locales (defecto)
  python3 enriquecer_browser.py --limite 50
  python3 enriquecer_browser.py --ciudad Madrid
  python3 enriquecer_browser.py --dry-run

Cron sugerido: 30 6 * * * (cada mañana)
"""

import requests
import json
import time
import argparse
import logging
import os
from datetime import datetime

# ── Configuración ──────────────────────────────────────────────────────────────
CF_ACCOUNT   = "0c4d9c91bb0f3a4c905545ecc158ec65"
CF_TOKEN     = "cfut_qTKfsExOPMBZJDjXoSCpAsJgnIEaBrJlRVtZsBE6f134a6d2"
DB_ID        = "458672aa-392f-4767-8d2b-926406628ba0"
WORKER_URL   = "https://tresycuarto.com"
WORKER_TOKEN = "tc_browser_2026"

D1_URL  = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

PAUSA_ENTRE_PAGINAS  = 2      # segundos entre llamadas al Worker
LIMITE_DEFECTO       = 500    # locales por ejecución (~250 min/día → ~130h/mes, cabe en 10h si solo corre 1x/día)
MAX_MINUTOS_MES      = 540    # 9h de las 10h incluidas → margen de seguridad de 1h ($0.09 si se pasa)
LOG_MINUTOS_FILE     = "/root/tresycuarto-sync/logs/browser_minutos.txt"
TIMEOUT_WORKER       = 25     # segundos para la llamada HTTP al Worker

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/root/tresycuarto-sync/logs/enriquecer_browser.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

# ── Control de gasto ───────────────────────────────────────────────────────────
def leer_minutos_mes():
    """Lee los minutos acumulados este mes calendario."""
    mes_actual = datetime.now().strftime("%Y-%m")
    try:
        with open(LOG_MINUTOS_FILE) as f:
            for line in f:
                if line.startswith(mes_actual):
                    return float(line.split()[1])
    except FileNotFoundError:
        pass
    return 0.0

def guardar_minutos_mes(minutos_nuevos):
    """Acumula minutos al contador del mes actual."""
    mes_actual = datetime.now().strftime("%Y-%m")
    minutos_previos = leer_minutos_mes()
    total = minutos_previos + minutos_nuevos

    lines = []
    try:
        with open(LOG_MINUTOS_FILE) as f:
            lines = [l for l in f if not l.startswith(mes_actual)]
    except FileNotFoundError:
        pass

    lines.append(f"{mes_actual} {total:.2f}\n")
    with open(LOG_MINUTOS_FILE, "w") as f:
        f.writelines(lines)

    return total

# ── D1 ─────────────────────────────────────────────────────────────────────────
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

def d1_run(sql, params):
    body = {"sql": sql, "params": params}
    r = requests.post(D1_URL, headers=HEADERS, json=body, timeout=30)
    r.raise_for_status()

# ── Worker call ────────────────────────────────────────────────────────────────
def extraer_datos_web(url):
    """Llama al Worker para extraer datos de la URL del local."""
    r = requests.get(
        f"{WORKER_URL}/api/browser-extract",
        params={"url": url, "token": WORKER_TOKEN},
        timeout=TIMEOUT_WORKER,
    )
    r.raise_for_status()
    return r.json()

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Enriquece locales con Browser Rendering")
    parser.add_argument("--limite",  type=int, default=LIMITE_DEFECTO)
    parser.add_argument("--ciudad",  type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # Control de gasto mensual
    minutos_mes = leer_minutos_mes()
    if minutos_mes >= MAX_MINUTOS_MES:
        log.warning(f"Límite mensual alcanzado ({minutos_mes:.1f}/{MAX_MINUTOS_MES} min). Abortando.")
        return

    log.info(f"=== Inicio enriquecer_browser | limite={args.limite} ciudad={args.ciudad or 'todas'} | Minutos mes: {minutos_mes:.1f}/{MAX_MINUTOS_MES} ===")

    # Locales con web o instagram pero sin horario o descripcion
    sql = """
        SELECT id, nombre, ciudad, web, instagram
        FROM locales
        WHERE (web IS NOT NULL OR instagram IS NOT NULL)
          AND (horario IS NULL OR horario = '')
          AND (descripcion IS NULL OR descripcion = '')
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
    minutos_sesion = 0.0

    for i, local in enumerate(locales, 1):
        # Verificar límite mensual antes de cada llamada
        if leer_minutos_mes() + minutos_sesion >= MAX_MINUTOS_MES:
            log.warning("Límite mensual alcanzado durante la sesión. Parando.")
            break

        url = local.get("web") or (
            f"https://instagram.com/{local['instagram']}" if local.get("instagram") else None
        )
        if not url:
            continue

        t_inicio = time.time()
        try:
            datos = extraer_datos_web(url)
            t_fin = time.time()
            segundos = t_fin - t_inicio
            minutos_sesion += segundos / 60

            if not datos.get("ok"):
                log.warning(f"  [{i}/{len(locales)}] {local['nombre']} → {datos.get('error', 'sin datos')}")
                errores += 1
                continue

            # Solo actualizar campos que tienen valor y el local no tiene ya
            updates = {}
            if datos.get("telefono") and len(datos["telefono"]) >= 9:
                updates["telefono"] = datos["telefono"]
            if datos.get("horario") and len(datos["horario"]) > 5:
                updates["horario"] = datos["horario"][:300]
            if datos.get("descripcion") and len(datos["descripcion"]) > 20:
                updates["descripcion"] = datos["descripcion"][:400]
            if datos.get("photo_url") and datos["photo_url"].startswith("http"):
                updates["photo_url"] = datos["photo_url"]
            if datos.get("instagram") and not local.get("instagram"):
                updates["instagram"] = datos["instagram"]

            if updates and not args.dry_run:
                set_clause = ", ".join(f"{k} = ?" for k in updates)
                vals = list(updates.values()) + [local["id"]]
                d1_run(f"UPDATE locales SET {set_clause} WHERE id = ?", vals)

            campos = list(updates.keys()) if updates else ["sin datos nuevos"]
            log.info(f"  [{i}/{len(locales)}] {local['nombre']} ({local['ciudad']}) → {', '.join(campos)} ({segundos:.1f}s)")
            ok += 1

        except Exception as e:
            log.error(f"  [{i}/{len(locales)}] {local['nombre']} → ERROR: {e}")
            errores += 1

        time.sleep(PAUSA_ENTRE_PAGINAS)

    # Guardar minutos acumulados
    total_mes = guardar_minutos_mes(minutos_sesion)
    log.info(f"=== Fin | OK: {ok} | Errores: {errores} | Tiempo sesión: {minutos_sesion:.1f}min | Total mes: {total_mes:.1f}/{MAX_MINUTOS_MES}min ===")

if __name__ == "__main__":
    main()
