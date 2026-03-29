#!/usr/bin/env python3
"""
Importa los JSONs de locales a Cloudflare D1 via API REST.
Uso: python3 importar_d1.py
"""

import json
import urllib.request
import urllib.parse
import os
from pathlib import Path

API_TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID = "458672aa-392f-4767-8d2b-926406628ba0"
API_BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

CIUDADES = {
    "madrid": "Madrid",
    "barcelona": "Barcelona",
    "valencia": "Valencia",
    "sevilla": "Sevilla",
    "bilbao": "Bilbao",
    "zaragoza": "Zaragoza",
    "murcia": "Murcia",
    "malaga": "Málaga",
    "cadiz": "Cádiz",
    "cartagena": "Cartagena",
    "cordoba": "Córdoba",
    "cuenca": "Cuenca",
    "granada": "Granada",
    "jerez_de_la_frontera": "Jerez de la Frontera",
    "leon": "León",
    "lorca": "Lorca",
    "valladolid": "Valladolid",
    "zamora": "Zamora",
}

def ejecutar_sql(sql: str, params: list) -> dict:
    payload = json.dumps({"sql": sql, "params": params}).encode()
    req = urllib.request.Request(API_BASE, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {API_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def insertar_lote(locales: list, ciudad: str):
    sql = """
    INSERT OR IGNORE INTO locales
      (id, nombre, tipo, ciudad, lat, lon, direccion, codigo_postal, telefono, web, instagram, horario, terraza, musica, fuente)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    for local in locales:
        params = [
            local["id"], local["nombre"], local.get("tipo"), ciudad,
            local.get("lat"), local.get("lon"), local.get("direccion"),
            local.get("codigo_postal"), local.get("telefono"), local.get("web"),
            local.get("instagram"), local.get("horario"),
            1 if local.get("terraza") else 0,
            local.get("musica"), local.get("fuente", "openstreetmap"),
        ]
        ejecutar_sql(sql, params)

def main():
    data_dir = Path(__file__).parent.parent / "data"
    total = 0

    for fichero, ciudad in CIUDADES.items():
        path = data_dir / f"{fichero}.json"
        if not path.exists():
            print(f"  Saltando {ciudad} (no hay fichero)")
            continue

        with open(path, encoding="utf-8") as f:
            datos = json.load(f)

        locales = datos.get("locales", [])
        print(f"  Importando {ciudad}: {len(locales)} locales...", end=" ", flush=True)
        insertar_lote(locales, ciudad)
        total += len(locales)
        print("OK")

    print(f"\nTotal importado: {total} locales")

if __name__ == "__main__":
    main()
