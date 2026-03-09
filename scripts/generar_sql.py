#!/usr/bin/env python3
"""
Genera un fichero SQL con los INSERTs de todos los locales para importar a D1.
Uso: python3 generar_sql.py > ../data/import.sql
"""

import json
import sys
from pathlib import Path

CIUDADES = {
    "madrid": "Madrid",
    "barcelona": "Barcelona",
    "valencia": "Valencia",
    "sevilla": "Sevilla",
    "bilbao": "Bilbao",
    "zaragoza": "Zaragoza",
    "murcia": "Murcia",
    "malaga": "Málaga",
}

def esc(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def main():
    data_dir = Path(__file__).parent.parent / "data"
    total = 0

    for fichero, ciudad in CIUDADES.items():
        path = data_dir / f"{fichero}.json"
        if not path.exists():
            continue

        with open(path, encoding="utf-8") as f:
            datos = json.load(f)

        locales = datos.get("locales", [])
        for local in locales:
            vals = ", ".join([
                esc(local["id"]),
                esc(local["nombre"]),
                esc(local.get("tipo")),
                esc(ciudad),
                str(local["lat"]) if local.get("lat") is not None else "NULL",
                str(local["lon"]) if local.get("lon") is not None else "NULL",
                esc(local.get("direccion")),
                esc(local.get("codigo_postal")),
                esc(local.get("telefono")),
                esc(local.get("web")),
                esc(local.get("instagram")),
                esc(local.get("horario")),
                "1" if local.get("terraza") else "0",
                esc(local.get("musica")),
                esc(local.get("fuente", "openstreetmap")),
            ])
            print(f"INSERT OR IGNORE INTO locales (id,nombre,tipo,ciudad,lat,lon,direccion,codigo_postal,telefono,web,instagram,horario,terraza,musica,fuente) VALUES ({vals});")
            total += 1

    print(f"-- Total: {total} locales", file=sys.stderr)

if __name__ == "__main__":
    main()
