#!/usr/bin/env python3
"""
geocodificar_locales_duenos.py — pone lat/lon a los locales creados por propietarios.

POR QUÉ EXISTE
`register_new` (functions/api/local/auth.js) inserta el local con la dirección en
texto pero SIN lat/lon, así que todo local dado de alta por su dueño nace sin mapa
y sin botón "Cómo llegar". Le pasó al primer propietario real del proyecto
(GARCÍA coffee house, Málaga, 11/09/2026), cuyas coordenadas hubo que poner a mano.

Se hace aquí y no en el Worker a propósito: Nominatim limita a 1 petición/segundo y
pide un User-Agent identificable, y no conviene meter una llamada externa —que puede
fallar o tardar— dentro del alta. El dueño ve su mapa en cuanto pase el cron.

ALCANCE: sólo locales con dueño (`fuente` b2b o solicitud). Los ~591 de OpenStreetMap
sin coordenadas son otro asunto y se tratan aparte.

Uso:
  python3 geocodificar_locales_duenos.py [--limite N] [--dry-run]
Requiere CLOUDFLARE_API_TOKEN en el entorno.
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

ACCOUNT_ID = "0c4d9c91bb0f3a4c905545ecc158ec65"
DATABASE_ID = "458672aa-392f-4767-8d2b-926406628ba0"
API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")
if not API_TOKEN:
    sys.exit("ERROR: falta CLOUDFLARE_API_TOKEN en el entorno")

D1_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query"
UA = "tresycuarto-geocoder/1.0 (joseluisnebot@gmail.com)"

# España peninsular + islas. Sirve para descartar un resultado disparatado
# (Nominatim puede devolver una calle con el mismo nombre en otro país).
ESPANA = {"lat_min": 27.5, "lat_max": 44.0, "lon_min": -18.5, "lon_max": 4.5}


def d1_query(sql, params=None):
    payload = json.dumps({"sql": sql, "params": params or []}).encode()
    req = urllib.request.Request(D1_URL, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {API_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    if not data.get("success"):
        raise RuntimeError(data.get("errors"))
    return data["result"][0].get("results", [])


def nominatim_forward(direccion, ciudad):
    """Devuelve (lat, lon) o (None, None)."""
    query = urllib.parse.urlencode({
        "q": f"{direccion}, {ciudad}, España",
        "format": "json", "limit": 1, "countrycodes": "es",
    })
    req = urllib.request.Request(f"https://nominatim.openstreetmap.org/search?{query}")
    req.add_header("User-Agent", UA)
    try:
        time.sleep(1)  # rate limit de Nominatim: 1 req/s
        with urllib.request.urlopen(req, timeout=15) as r:
            results = json.loads(r.read())
        if not results:
            return None, None
        lat, lon = float(results[0]["lat"]), float(results[0]["lon"])
        if not (ESPANA["lat_min"] <= lat <= ESPANA["lat_max"]
                and ESPANA["lon_min"] <= lon <= ESPANA["lon_max"]):
            print(f"    descartado (fuera de España): {lat},{lon}")
            return None, None
        return lat, lon
    except Exception as e:
        print(f"    [error] {direccion}, {ciudad}: {e}")
        return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limite", type=int, default=25)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pendientes = d1_query(
        """SELECT id, nombre, ciudad, direccion FROM locales
           WHERE (lat IS NULL OR lon IS NULL)
             AND direccion IS NOT NULL AND direccion != ''
             AND fuente IN ('b2b', 'solicitud')
           LIMIT ?""",
        [args.limite],
    )

    if not pendientes:
        print("Sin locales de propietarios pendientes de geocodificar.")
        return

    print(f"{len(pendientes)} local(es) pendiente(s).")
    ok = 0
    for l in pendientes:
        print(f"  {l['nombre'][:45]} — {l['direccion']}, {l['ciudad']}")
        lat, lon = nominatim_forward(l["direccion"], l["ciudad"])
        if lat is None:
            print("    sin resultado")
            continue
        print(f"    → {lat}, {lon}")
        if args.dry_run:
            ok += 1
            continue
        # `AND lat IS NULL` evita pisar coordenadas si otro proceso las puso entretanto
        d1_query("UPDATE locales SET lat = ?, lon = ? WHERE id = ? AND lat IS NULL",
                 [lat, lon, l["id"]])
        ok += 1

    print(f"Geocodificados: {ok}/{len(pendientes)}{' (dry-run)' if args.dry_run else ''}")


if __name__ == "__main__":
    main()
