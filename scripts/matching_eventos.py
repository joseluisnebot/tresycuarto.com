#!/usr/bin/env python3
"""
Matching geoespacial: para cada evento próximo encuentra los locales más cercanos.
Guarda resultados en tabla evento_locales.
Uso: python3 matching_eventos.py [--dias 14]
"""
import json, math, urllib.request, os, sys, argparse
from datetime import datetime, timedelta

API_TOKEN  = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

MAX_LOCALES_POR_EVENTO = 10  # máximo locales a guardar por evento
UMBRAL_CENTROIDE_M     = 300  # si el evento está a <300m del centroide, asumimos sin ubicación específica

# Centroides de ciudades (del ciudad-content.json)
_script_dir   = os.path.dirname(os.path.abspath(__file__))
_content_path = os.path.join(_script_dir, "..", "data", "ciudad-content.json")
with open(_content_path, encoding="utf-8") as _f:
    _ciudad_content = json.load(_f)
CENTROIDES = {
    ciudad: (data["coords"]["lat"], data["coords"]["lon"])
    for ciudad, data in _ciudad_content.items()
    if "coords" in data
}


def d1_query(sql, params=None):
    payload = json.dumps({"sql": sql, "params": params or []}).encode()
    req = urllib.request.Request(API_URL, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {API_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    if not data.get("success"):
        raise RuntimeError(data.get("errors"))
    return data["result"][0]["results"]


def haversine_m(lat1, lon1, lat2, lon2):
    """Distancia en metros entre dos puntos."""
    R = 6371000
    p = math.pi / 180
    a = 0.5 - math.cos((lat2 - lat1) * p) / 2 + \
        math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    return 2 * R * math.asin(math.sqrt(a))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dias", type=int, default=14, help="Eventos en los próximos N días")
    args = parser.parse_args()

    hoy = datetime.now().strftime("%Y-%m-%d")
    limite = (datetime.now() + timedelta(days=args.dias)).strftime("%Y-%m-%d")

    eventos = d1_query(
        "SELECT * FROM eventos_geo WHERE activo = 1 AND fecha >= ? AND fecha <= ? ORDER BY fecha",
        [hoy, limite]
    )
    print(f"Eventos próximos ({hoy} → {limite}): {len(eventos)}")

    for ev in eventos:
        lat, lon, radio = ev["lat"], ev["lon"], ev["radio_m"]
        ciudad = ev["ciudad"]

        # Detectar si el evento tiene ubicación específica o solo centroide de ciudad
        centroide = CENTROIDES.get(ciudad)
        es_centroide = False
        if centroide:
            dist_centroide = haversine_m(lat, lon, centroide[0], centroide[1])
            es_centroide = dist_centroide < UMBRAL_CENTROIDE_M

        if es_centroide:
            # Sin ubicación específica → selección aleatoria de locales con datos completos
            aleatorios = d1_query(
                """SELECT id, nombre, web, instagram, terraza
                   FROM locales
                   WHERE ciudad = ? AND lat IS NOT NULL
                   ORDER BY (CASE WHEN web IS NOT NULL OR instagram IS NOT NULL THEN 0 ELSE 1 END),
                            RANDOM()
                   LIMIT ?""",
                [ciudad, MAX_LOCALES_POR_EVENTO]
            )
            cercanos = [{**l, "distancia_m": -1} for l in aleatorios]
            modo = f"aleatorio (centroide ±{int(dist_centroide)}m)"
        else:
            # Ubicación específica → bounding box + haversine
            deg_lat = radio / 111000
            deg_lon = radio / (111000 * math.cos(math.radians(lat)))

            candidatos = d1_query(
                """SELECT id, nombre, lat, lon, web, instagram, terraza
                   FROM locales
                   WHERE ciudad = ?
                     AND lat IS NOT NULL
                     AND lat BETWEEN ? AND ?
                     AND lon BETWEEN ? AND ?""",
                [ciudad, lat - deg_lat, lat + deg_lat, lon - deg_lon, lon + deg_lon]
            )

            cercanos = []
            for l in candidatos:
                dist = haversine_m(lat, lon, l["lat"], l["lon"])
                if dist <= radio:
                    cercanos.append({**l, "distancia_m": int(dist)})

            cercanos.sort(key=lambda x: (
                0 if (x.get("web") or x.get("instagram")) else 1,
                x["distancia_m"]
            ))
            cercanos = cercanos[:MAX_LOCALES_POR_EVENTO]
            modo = f"{len(cercanos)} a ≤{radio}m"

        # Borrar matching anterior para este evento
        d1_query("DELETE FROM eventos_geo_locales WHERE evento_id = ?", [ev["id"]])

        # Insertar nuevos
        for l in cercanos:
            d1_query(
                "INSERT OR REPLACE INTO eventos_geo_locales (evento_id, local_id, distancia_m) VALUES (?, ?, ?)",
                [ev["id"], l["id"], l["distancia_m"]]
            )

        print(f"  [{ev['fecha']}] {ev['nombre']} ({ciudad}) → {modo}")
        for l in cercanos[:3]:
            dist_str = f"{l['distancia_m']}m" if l["distancia_m"] >= 0 else "aleatorio"
            print(f"    📍 {l['nombre']} ({dist_str})")

    print("\nMatching completado.")


if __name__ == "__main__":
    main()
