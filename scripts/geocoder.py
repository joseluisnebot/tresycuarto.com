#!/usr/bin/env python3
"""
Reverse geocoding de locales sin dirección usando Nominatim (OSM).
Actualiza la columna `direccion` en Cloudflare D1 via API REST.
Ritmo: 1 req/s (límite Nominatim). ~9.000 locales en ~2.5 horas.
"""

import json
import time
import urllib.request
import urllib.error
import os
import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M",
)
log = logging.getLogger(__name__)

CF_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
CF_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
D1_DB_ID = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/d1/database/{D1_DB_ID}/query"
PHOTON_URL = "https://photon.komoot.io/reverse"
BATCH_SIZE = 200


def d1_query(sql, params=None):
    payload = {"sql": sql, "params": params or []}
    req = urllib.request.Request(
        D1_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]


def reverse_geocode(lat, lon):
    url = f"{PHOTON_URL}?lat={lat}&lon={lon}&limit=1"
    req = urllib.request.Request(url, headers={"User-Agent": "tresycuarto.com/geocoder"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            features = data.get("features", [])
            if not features:
                return None
            props = features[0].get("properties", {})
            street = props.get("street", "")
            house = props.get("housenumber", "")
            if street:
                return f"{street} {house}".strip()
            return None
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 10 * (attempt + 1)
                log.warning(f"429 rate limit, esperando {wait}s...")
                time.sleep(wait)
            else:
                log.warning(f"Photon error lat={lat} lon={lon}: {e}")
                return None
        except Exception as e:
            log.warning(f"Photon error lat={lat} lon={lon}: {e}")
            return None
    return None


def main():
    # Contar pendientes
    total_rows = d1_query("SELECT COUNT(*) as n FROM locales WHERE direccion IS NULL AND lat IS NOT NULL")
    total = total_rows[0]["n"]
    log.info(f"Locales sin dirección con coords: {total}")

    procesados = 0
    actualizados = 0
    sin_resultado = 0

    while True:
        rows = d1_query(
            "SELECT id, nombre, lat, lon FROM locales WHERE direccion IS NULL AND lat IS NOT NULL LIMIT ?",
            [BATCH_SIZE],
        )
        if not rows:
            break

        for row in rows:
            osm_id = row["id"]
            nombre = row["nombre"]
            lat = row["lat"]
            lon = row["lon"]

            direccion = reverse_geocode(lat, lon)
            time.sleep(1.5)  # Nominatim: max 1 req/s, usamos 1.5s para margen

            if direccion:
                d1_query(
                    "UPDATE locales SET direccion = ? WHERE id = ?",
                    [direccion, osm_id],
                )
                actualizados += 1
                log.info(f"[{procesados+1}/{total}] {nombre} → {direccion}")
            else:
                # Marcar con cadena vacía para no volver a intentarlo
                d1_query(
                    "UPDATE locales SET direccion = '' WHERE id = ?",
                    [osm_id],
                )
                sin_resultado += 1
                log.info(f"[{procesados+1}/{total}] {nombre} → sin resultado")

            procesados += 1

        log.info(f"Progreso: {procesados}/{total} | actualizados={actualizados} | sin_resultado={sin_resultado}")

    log.info(f"Completado. Total procesados: {procesados}, con dirección: {actualizados}, sin resultado: {sin_resultado}")


if __name__ == "__main__":
    main()
