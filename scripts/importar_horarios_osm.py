#!/usr/bin/env python3
"""
Recupera opening_hours de OSM para locales sin horario.
Consulta por ciudad (no por ID), cruza con nuestros IDs y actualiza D1.

Uso:
    python3 importar_horarios_osm.py              # todas las ciudades
    python3 importar_horarios_osm.py --ciudad Madrid
    python3 importar_horarios_osm.py --dry-run
"""

import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request

CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
DB_ID = "458672aa-392f-4767-8d2b-926406628ba0"
D1_API = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{DB_ID}/query"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

CIUDADES = [
    "Albacete", "Alcalá de Henares", "Algeciras", "Almería", "Altea",
    "Arona", "Ávila", "Badajoz", "Barakaldo", "Barcelona",
    "Benidorm", "Bilbao", "Burgos", "Cáceres", "Cádiz",
    "Cartagena", "Ciudad Real", "Córdoba", "Cuenca", "Cullera",
    "Dénia", "Getafe", "Girona", "Granada", "Guadalajara",
    "Huelva", "Huesca", "Jaén", "Jerez de la Frontera", "La Coruña",
    "Las Palmas", "Leganés", "León", "Lleida", "Logroño",
    "Lorca", "Lugo", "Madrid", "Málaga", "Móstoles",
    "Murcia", "Oviedo", "Palencia", "Palma", "Pontevedra",
    "Salamanca", "San Sebastián", "Santa Cruz de Tenerife", "Santa Pola", "Santander",
    "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel",
    "Toledo", "Torrevieja", "Valencia", "Valladolid", "Vinaròs",
    "Vitoria", "Zamora", "Zaragoza",
]


def d1_query(sql, params=None):
    payload = json.dumps({"sql": sql, "params": params or []}).encode()
    req = urllib.request.Request(D1_API, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {CLOUDFLARE_API_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    return data["result"][0].get("results", [])


def overpass_ciudad(ciudad):
    """Devuelve dict osm_id → opening_hours para todos los bares/pubs/cafés de la ciudad."""
    query = f"""
[out:json][timeout:60];
area["name"="{ciudad}"]["admin_level"~"^(6|7|8)$"];
(
  node(area)["amenity"~"^(bar|pub|cafe|biergarten)$"]["opening_hours"];
  way(area)["amenity"~"^(bar|pub|cafe|biergarten)$"]["opening_hours"];
);
out tags;
"""
    data = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data, method="POST")
    req.add_header("User-Agent", "tresycuarto.com/1.0 (hola@tresycuarto.com)")
    for intento in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                result = json.loads(resp.read().decode())
            return {
                f"osm_{el['type']}_{el['id']}": el["tags"]["opening_hours"]
                for el in result.get("elements", [])
                if el.get("tags", {}).get("opening_hours")
            }
        except Exception as e:
            print(f"    Overpass error (intento {intento+1}/3): {e}")
            if intento < 2:
                time.sleep(30)
    return {}


def formatear_horario(raw):
    raw = raw.replace("Mo", "Lun").replace("Tu", "Mar").replace("We", "Mié")
    raw = raw.replace("Th", "Jue").replace("Fr", "Vie").replace("Sa", "Sáb").replace("Su", "Dom")
    raw = raw.replace("off", "cerrado").replace("PH", "festivos")
    return raw[:200]


def procesar_ciudad(ciudad, dry_run):
    # IDs de locales sin horario en esta ciudad
    locales = d1_query(
        "SELECT id FROM locales WHERE ciudad = ? AND (horario IS NULL OR horario = '') AND id LIKE 'osm_%'",
        [ciudad]
    )
    if not locales:
        return 0

    ids_d1 = {l["id"] for l in locales}

    # Consultar Overpass
    osm_data = overpass_ciudad(ciudad)
    if not osm_data:
        return 0

    # Cruzar
    encontrados = 0
    for osm_id, raw in osm_data.items():
        if osm_id in ids_d1:
            horario = formatear_horario(raw)
            if not dry_run:
                d1_query("UPDATE locales SET horario = ? WHERE id = ?", [horario, osm_id])
            else:
                print(f"      {osm_id}: {horario}")
            encontrados += 1

    return encontrados


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ciudad", help="Procesar solo esta ciudad")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    modo = "DRY-RUN" if args.dry_run else "PRODUCCIÓN"
    print(f"\n=== Importar horarios OSM [{modo}] ===\n")

    ciudades = [args.ciudad] if args.ciudad else CIUDADES
    total = 0

    for ciudad in ciudades:
        print(f"  {ciudad}...", end=" ", flush=True)
        n = procesar_ciudad(ciudad, args.dry_run)
        print(f"→ {n} horarios")
        total += n
        time.sleep(15)  # respetar rate limit Overpass

    print(f"\nTotal: {total} horarios importados\n")


if __name__ == "__main__":
    main()
