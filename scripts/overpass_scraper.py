#!/usr/bin/env python3
"""
Scraper de locales de tardeo usando Overpass API (OpenStreetMap).
Extrae bares, cafés, terrazas y pubs de una ciudad española.

Uso:
    python3 overpass_scraper.py --ciudad "Madrid" --output ../data/madrid.json
    python3 overpass_scraper.py --ciudad "Málaga" --radio 8 --output ../data/malaga.json
"""

import argparse
import json
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path


OVERPASS_URL = "https://overpass-api.de/api/interpreter"

AMENIDADES = ["bar", "cafe", "pub", "biergarten"]

QUERY_TEMPLATE = """
[out:json][timeout:120];
area[name="{ciudad}"][boundary=administrative][admin_level=8]->.ciudad;
(
  node[amenity~"^(bar|cafe|pub|biergarten)$"](area.ciudad);
  way[amenity~"^(bar|cafe|pub|biergarten)$"](area.ciudad);
);
out body;
>;
out skel qt;
"""

QUERY_TEMPLATE_BBOX = """
[out:json][timeout:120];
(
  node[amenity~"^(bar|cafe|pub|biergarten)$"]({bbox});
  way[amenity~"^(bar|cafe|pub|biergarten)$"]({bbox});
);
out body;
>;
out skel qt;
"""


def consultar_overpass(ciudad: str, reintentos: int = 3) -> dict:
    query = QUERY_TEMPLATE.format(ciudad=ciudad)
    data = urllib.parse.urlencode({"data": query}).encode()

    print(f"  Consultando Overpass API para '{ciudad}'...")
    for intento in range(reintentos):
        try:
            req = urllib.request.Request(OVERPASS_URL, data=data, method="POST")
            req.add_header("User-Agent", "tresycuarto-scraper/1.0 (joseluisnebot@gmail.com)")
            with urllib.request.urlopen(req, timeout=150) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            espera = 30 * (intento + 1)
            print(f"  Error {e.code}, reintentando en {espera}s...")
            time.sleep(espera)
        except Exception as e:
            espera = 15 * (intento + 1)
            print(f"  Error ({e}), reintentando en {espera}s...")
            time.sleep(espera)
    raise RuntimeError(f"No se pudo obtener datos para '{ciudad}' tras {reintentos} intentos")


def extraer_coords_way(elemento: dict, nodos: dict) -> tuple[float, float] | None:
    refs = elemento.get("nodes", [])
    if not refs:
        return None
    lats = [nodos[r]["lat"] for r in refs if r in nodos]
    lons = [nodos[r]["lon"] for r in refs if r in nodos]
    if not lats:
        return None
    return round(sum(lats) / len(lats), 6), round(sum(lons) / len(lons), 6)


def limpiar_local(elemento: dict, nodos: dict) -> dict | None:
    tags = elemento.get("tags", {})
    nombre = tags.get("name", "").strip()
    if not nombre:
        return None

    if elemento["type"] == "node":
        lat = elemento.get("lat")
        lon = elemento.get("lon")
    else:
        coords = extraer_coords_way(elemento, nodos)
        if not coords:
            return None
        lat, lon = coords

    return {
        "id": f"osm_{elemento['type']}_{elemento['id']}",
        "nombre": nombre,
        "tipo": tags.get("amenity", ""),
        "lat": lat,
        "lon": lon,
        "direccion": " ".join(filter(None, [
            tags.get("addr:street", ""),
            tags.get("addr:housenumber", ""),
        ])) or None,
        "codigo_postal": tags.get("addr:postcode") or None,
        "telefono": tags.get("phone") or tags.get("contact:phone") or None,
        "web": tags.get("website") or tags.get("contact:website") or None,
        "instagram": tags.get("contact:instagram") or None,
        "horario": tags.get("opening_hours") or None,
        "terraza": tags.get("outdoor_seating") in ("yes", "terrace"),
        "musica": tags.get("music") or None,
        "fuente": "openstreetmap",
    }


def scrape_ciudad(ciudad: str) -> list[dict]:
    resultado = consultar_overpass(ciudad)
    elementos = resultado.get("elements", [])

    # Índice de nodos para calcular centros de ways
    nodos = {
        e["id"]: e for e in elementos if e["type"] == "node"
    }

    locales = []
    vistos = set()

    for elemento in elementos:
        if elemento["type"] not in ("node", "way"):
            continue
        if not elemento.get("tags"):
            continue

        local = limpiar_local(elemento, nodos)
        if local and local["id"] not in vistos:
            vistos.add(local["id"])
            locales.append(local)

    return locales


def main():
    parser = argparse.ArgumentParser(description="Scraper de locales de tardeo con Overpass API")
    parser.add_argument("--ciudad", required=True, help="Nombre de la ciudad (ej: Madrid)")
    parser.add_argument("--output", help="Fichero JSON de salida (por defecto: data/<ciudad>.json)")
    args = parser.parse_args()

    ciudad = args.ciudad
    output = args.output or f"../data/{ciudad.lower().replace(' ', '_')}.json"

    Path(output).parent.mkdir(parents=True, exist_ok=True)

    print(f"\n=== Scraper tresycuarto — {ciudad} ===")
    t0 = time.time()

    locales = scrape_ciudad(ciudad)

    print(f"  Locales encontrados: {len(locales)}")
    print(f"  Con terraza: {sum(1 for l in locales if l['terraza'])}")
    print(f"  Con web: {sum(1 for l in locales if l['web'])}")
    print(f"  Con Instagram: {sum(1 for l in locales if l['instagram'])}")
    print(f"  Tiempo: {time.time() - t0:.1f}s")

    with open(output, "w", encoding="utf-8") as f:
        json.dump({"ciudad": ciudad, "total": len(locales), "locales": locales}, f, ensure_ascii=False, indent=2)

    print(f"  Guardado en: {output}\n")


if __name__ == "__main__":
    main()
