#!/usr/bin/env python3
"""
Scraper batch — raspa todas las ciudades objetivo con Overpass API
e importa directamente a Cloudflare D1.

Uso:
    python3 scraper_batch.py                    # todas las ciudades pendientes
    python3 scraper_batch.py --solo "Alicante"  # una ciudad concreta
    python3 scraper_batch.py --forzar           # re-raspa aunque ya haya datos

Log: /var/log/tresycuarto-scraper-batch.log
"""

import argparse
import json
import os
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime
from pathlib import Path

# ── Configuración ─────────────────────────────────────────────────────────────

CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN",  "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
D1_DB      = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL     = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB}/query"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
DATA_DIR = Path(__file__).parent.parent / "data"

# ── Lista de ciudades objetivo ─────────────────────────────────────────────────
# (nombre OSM, nombre canónico para D1)

CIUDADES_OBJETIVO = [
    # Capitales de provincia ya en D1 — se saltan automáticamente si ya tienen datos
    ("Madrid",          "Madrid"),
    ("Barcelona",       "Barcelona"),
    ("Valencia",        "Valencia"),
    ("Sevilla",         "Sevilla"),
    ("Zaragoza",        "Zaragoza"),
    ("Málaga",          "Málaga"),
    ("Murcia",          "Murcia"),
    ("Bilbao",          "Bilbao"),
    ("Valladolid",      "Valladolid"),
    ("Granada",         "Granada"),
    ("Córdoba",         "Córdoba"),
    ("Cádiz",           "Cádiz"),
    ("León",            "León"),
    ("Zamora",          "Zamora"),
    ("Cuenca",          "Cuenca"),
    ("Lorca",           "Lorca"),

    # Capitales de provincia pendientes
    ("Alicante",                "Alicante"),
    ("Almería",                 "Almería"),
    ("Ávila",                   "Ávila"),
    ("Badajoz",                 "Badajoz"),
    ("Burgos",                  "Burgos"),
    ("Cáceres",                 "Cáceres"),
    ("Castellón de la Plana",   "Castellón"),
    ("Ciudad Real",             "Ciudad Real"),
    ("A Coruña",                "La Coruña"),
    ("Girona",                  "Girona"),
    ("Guadalajara",             "Guadalajara"),
    ("Huelva",                  "Huelva"),
    ("Huesca",                  "Huesca"),
    ("Jaén",                    "Jaén"),
    ("Las Palmas de Gran Canaria", "Las Palmas"),
    ("Lleida",                  "Lleida"),
    ("Logroño",                 "Logroño"),
    ("Lugo",                    "Lugo"),
    ("Oviedo",                  "Oviedo"),
    ("Palencia",                "Palencia"),
    ("Palma",                   "Palma"),
    ("Pamplona",                "Pamplona"),
    ("Pontevedra",              "Pontevedra"),
    ("Salamanca",               "Salamanca"),
    ("San Sebastián",           "San Sebastián"),
    ("Santa Cruz de Tenerife",  "Santa Cruz de Tenerife"),
    ("Santander",               "Santander"),
    ("Segovia",                 "Segovia"),
    ("Soria",                   "Soria"),
    ("Tarragona",               "Tarragona"),
    ("Teruel",                  "Teruel"),
    ("Toledo",                  "Toledo"),
    ("Vitoria-Gasteiz",         "Vitoria"),
    ("Jerez de la Frontera",    "Jerez de la Frontera"),
    ("Cartagena",               "Cartagena"),

    # Ciudades turísticas costeras
    ("Benidorm",        "Benidorm"),
    ("Torremolinos",    "Torremolinos"),
    ("Marbella",        "Marbella"),
    ("Fuengirola",      "Fuengirola"),
    ("Estepona",        "Estepona"),
    ("Gandía",          "Gandía"),
    ("Dénia",           "Dénia"),
    ("Xàbia",           "Xàbia"),
    ("Cullera",         "Cullera"),
    ("Salou",           "Salou"),
    ("Cambrils",        "Cambrils"),
    ("Lloret de Mar",   "Lloret de Mar"),
    ("Roses",           "Roses"),
    ("Calpe",           "Calpe"),
    ("Altea",           "Altea"),
    ("Torrevieja",      "Torrevieja"),
    ("Santa Pola",      "Santa Pola"),
    ("Peñíscola",       "Peñíscola"),
    ("Vinaròs",         "Vinaròs"),
    ("Benicàssim",      "Benicàssim"),
    ("Oropesa del Mar", "Oropesa del Mar"),
    ("Sitges",          "Sitges"),

    # Ciudades medianas con vida de tardeo
    ("Albacete",        "Albacete"),
    ("Alcalá de Henares", "Alcalá de Henares"),
    ("Alcoy",           "Alcoy"),
    ("Algeciras",       "Algeciras"),
    ("Almería",         "Almería"),
    ("Arona",           "Arona"),
    ("Barakaldo",       "Barakaldo"),
    ("Elche",           "Elche"),
    ("Gijón",           "Gijón"),
    ("Getafe",          "Getafe"),
    ("Hospitalet de Llobregat", "Hospitalet"),
    ("Jerez de la Frontera", "Jerez de la Frontera"),
    ("Leganés",         "Leganés"),
    ("Móstoles",        "Móstoles"),
    ("Sabadell",        "Sabadell"),
    ("Terrassa",        "Terrassa"),
    ("Vigo",            "Vigo"),
    ("Villarreal",      "Villarreal"),
]

# Eliminar duplicados manteniendo orden
seen = set()
CIUDADES_OBJETIVO_UNICAS = []
for osm, canon in CIUDADES_OBJETIVO:
    if canon not in seen:
        seen.add(canon)
        CIUDADES_OBJETIVO_UNICAS.append((osm, canon))

# ── D1 helpers ────────────────────────────────────────────────────────────────

def d1_query(sql, params=None):
    payload = json.dumps({"sql": sql, "params": params or []}).encode()
    req = urllib.request.Request(D1_URL, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {CF_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def ciudad_total_en_d1(ciudad_canon):
    res = d1_query(f"SELECT COUNT(*) as n FROM locales WHERE ciudad = ?", [ciudad_canon])
    return res["result"][0]["results"][0]["n"]

def insertar_locales(locales, ciudad_canon):
    sql = """INSERT OR IGNORE INTO locales
      (id, nombre, tipo, ciudad, lat, lon, direccion, codigo_postal,
       telefono, web, instagram, horario, terraza, musica, fuente)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"""
    insertados = 0
    for l in locales:
        params = [
            l["id"], l["nombre"], l.get("tipo"), ciudad_canon,
            l.get("lat"), l.get("lon"), l.get("direccion"), l.get("codigo_postal"),
            l.get("telefono"), l.get("web"), l.get("instagram"), l.get("horario"),
            1 if l.get("terraza") else 0,
            l.get("musica"), "openstreetmap",
        ]
        try:
            d1_query(sql, params)
            insertados += 1
        except Exception:
            pass
    return insertados

# ── Overpass scraper ───────────────────────────────────────────────────────────

QUERY = """[out:json][timeout:120];
area[name="{ciudad}"][boundary=administrative][admin_level~"^(8|6)$"]->.a;
(
  node[amenity~"^(bar|cafe|pub|biergarten)$"](area.a);
  way[amenity~"^(bar|cafe|pub|biergarten)$"](area.a);
);
out body;>;out skel qt;"""

def scrape_overpass(nombre_osm, reintentos=3):
    query = QUERY.format(ciudad=nombre_osm)
    data = urllib.parse.urlencode({"data": query}).encode()
    for intento in range(reintentos):
        try:
            req = urllib.request.Request(OVERPASS_URL, data=data, method="POST")
            req.add_header("User-Agent", "tresycuarto-scraper/1.0 (joseluisnebot@gmail.com)")
            with urllib.request.urlopen(req, timeout=150) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            espera = 45 * (intento + 1)
            print(f"    HTTP {e.code}, esperando {espera}s...")
            time.sleep(espera)
        except Exception as e:
            espera = 20 * (intento + 1)
            print(f"    Error ({e}), esperando {espera}s...")
            time.sleep(espera)
    return None

def parsear_elementos(resultado):
    elementos = resultado.get("elements", [])
    nodos = {e["id"]: e for e in elementos if e["type"] == "node"}
    locales, vistos = [], set()
    for e in elementos:
        if e["type"] not in ("node", "way") or not e.get("tags"):
            continue
        tags = e["tags"]
        nombre = tags.get("name", "").strip()
        if not nombre:
            continue
        if e["type"] == "node":
            lat, lon = e.get("lat"), e.get("lon")
        else:
            refs = [nodos[r] for r in e.get("nodes", []) if r in nodos]
            if not refs:
                continue
            lat = round(sum(n["lat"] for n in refs) / len(refs), 6)
            lon = round(sum(n["lon"] for n in refs) / len(refs), 6)
        lid = f"osm_{e['type']}_{e['id']}"
        if lid in vistos:
            continue
        vistos.add(lid)
        locales.append({
            "id": lid, "nombre": nombre,
            "tipo": tags.get("amenity", "bar"),
            "lat": lat, "lon": lon,
            "direccion": " ".join(filter(None, [tags.get("addr:street",""), tags.get("addr:housenumber","")])) or None,
            "codigo_postal": tags.get("addr:postcode"),
            "telefono": tags.get("phone") or tags.get("contact:phone"),
            "web": tags.get("website") or tags.get("contact:website"),
            "instagram": tags.get("contact:instagram"),
            "horario": tags.get("opening_hours"),
            "terraza": tags.get("outdoor_seating") in ("yes", "terrace"),
        })
    return locales

# ── Main ──────────────────────────────────────────────────────────────────────

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--solo", help="Raspar solo esta ciudad (nombre canónico)")
    parser.add_argument("--forzar", action="store_true", help="Re-raspar aunque ya haya datos en D1")
    args = parser.parse_args()

    ciudades = CIUDADES_OBJETIVO_UNICAS
    if args.solo:
        ciudades = [(osm, c) for osm, c in ciudades if c.lower() == args.solo.lower()]
        if not ciudades:
            print(f"Ciudad '{args.solo}' no encontrada en la lista.")
            return

    log(f"=== Scraper batch — {len(ciudades)} ciudades ===")
    total_nuevos = 0
    ciudades_nuevas = []

    for i, (nombre_osm, ciudad_canon) in enumerate(ciudades, 1):
        log(f"[{i}/{len(ciudades)}] {ciudad_canon}")

        if not args.forzar:
            existentes = ciudad_total_en_d1(ciudad_canon)
            if existentes >= 10:
                log(f"  → Ya tiene {existentes} locales, saltando")
                continue

        resultado = scrape_overpass(nombre_osm)
        if not resultado:
            log(f"  → Error consultando Overpass, saltando")
            time.sleep(10)
            continue

        locales = parsear_elementos(resultado)
        log(f"  → {len(locales)} locales encontrados en OSM")

        if not locales:
            log(f"  → Sin locales, saltando")
            time.sleep(5)
            continue

        insertados = insertar_locales(locales, ciudad_canon)
        con_dir = sum(1 for l in locales if l.get("direccion"))
        pct = round(con_dir * 100 / len(locales)) if locales else 0
        log(f"  → {insertados} insertados en D1 | {con_dir} con dirección ({pct}%)")
        total_nuevos += insertados

        if insertados >= 10:
            ciudades_nuevas.append(ciudad_canon)

        # Guardar JSON de referencia
        out = DATA_DIR / f"{ciudad_canon.lower().replace(' ', '_').replace('/', '_')}.json"
        out.write_text(json.dumps({"ciudad": ciudad_canon, "total": len(locales), "locales": locales},
                                   ensure_ascii=False, indent=2), encoding="utf-8")

        # Pausa entre ciudades para no saturar Overpass
        if i < len(ciudades):
            time.sleep(8)

    log(f"\n=== Fin. {total_nuevos} locales insertados en {len(ciudades_nuevas)} ciudades nuevas ===")
    if ciudades_nuevas:
        log(f"Ciudades nuevas: {', '.join(ciudades_nuevas)}")
        log("El cron de sync_cities.sh las publicará automáticamente a las 7:00.")

if __name__ == "__main__":
    main()
