#!/usr/bin/env python3
"""
importar_locales.py
Lee el JSON generado por overpass_scraper.py e inserta en D1 los locales
que no existen todavía (INSERT OR IGNORE por id OSM).

Uso:
    python3 importar_locales.py --ciudad "Madrid"
    python3 importar_locales.py --all   (todas las ciudades de cities.json)
"""

import sys, os, json, time, argparse, requests
from datetime import datetime
from pathlib import Path

# ── Constantes ────────────────────────────────────────────────────────────────
CF_ACCOUNT  = "0c4d9c91bb0f3a4c905545ecc158ec65"
CF_TOKEN    = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
D1_DB       = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL      = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB}/query"

SCRIPT_DIR  = Path(__file__).parent
DATA_DIR    = SCRIPT_DIR.parent / "data"
CITIES_JSON = DATA_DIR / "cities.json"

# ── D1 helper ─────────────────────────────────────────────────────────────────
def d1(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL,
        headers={"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"},
        json=body, timeout=30)
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(data.get("errors"))
    return data["result"][0]

# ── Importar ciudad ───────────────────────────────────────────────────────────
def importar_ciudad(ciudad: str) -> dict:
    nombre_fichero = ciudad.lower().replace(" ", "_").replace("/", "_")
    json_path = DATA_DIR / f"{nombre_fichero}.json"

    # Si no existe el JSON, ejecutar el scraper primero
    if not json_path.exists():
        print(f"  [{ciudad}] JSON no existe, ejecutando scraper...")
        import subprocess
        result = subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "overpass_scraper.py"),
             "--ciudad", ciudad, "--output", str(json_path)],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode != 0:
            print(f"  [{ciudad}] ERROR scraper: {result.stderr[:200]}")
            return {"ciudad": ciudad, "nuevos": 0, "error": True}
        time.sleep(2)  # pausa tras scraper

    # Leer JSON
    try:
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"  [{ciudad}] ERROR leyendo JSON: {e}")
        return {"ciudad": ciudad, "nuevos": 0, "error": True}

    locales = data.get("locales", [])
    if not locales:
        print(f"  [{ciudad}] Sin locales en JSON")
        return {"ciudad": ciudad, "nuevos": 0}

    # Insertar en lotes de 20 (límite D1)
    nuevos = 0
    errores = 0
    LOTE = 20

    for i in range(0, len(locales), LOTE):
        lote = locales[i:i + LOTE]
        for local in lote:
            try:
                resultado = d1(
                    """INSERT OR IGNORE INTO locales
                       (id, nombre, tipo, ciudad, lat, lon,
                        direccion, codigo_postal, telefono, web,
                        instagram, horario, terraza, fuente)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    [
                        local["id"],
                        local["nombre"],
                        local.get("tipo") or "bar",
                        ciudad,
                        local.get("lat"),
                        local.get("lon"),
                        local.get("direccion"),
                        local.get("codigo_postal"),
                        local.get("telefono"),
                        local.get("web"),
                        local.get("instagram"),
                        local.get("horario"),
                        1 if local.get("terraza") else 0,
                        "openstreetmap",
                    ]
                )
                if resultado.get("meta", {}).get("changes", 0) > 0:
                    nuevos += 1
            except Exception as e:
                errores += 1
                if errores <= 3:
                    print(f"    ERROR insertando {local.get('id')}: {e}")

        time.sleep(0.1)  # pequeña pausa entre lotes

    return {"ciudad": ciudad, "total_json": len(locales), "nuevos": nuevos, "errores": errores}

# ── Main ──────────────────────────────────────────────────────────────────────
print(f"=== importar_locales.py {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")

parser = argparse.ArgumentParser()
parser.add_argument("--ciudad", type=str, default=None)
parser.add_argument("--all", action="store_true", help="Procesar todas las ciudades")
args = parser.parse_args()

if args.all:
    with open(CITIES_JSON, encoding="utf-8") as f:
        cities = json.load(f)
    ciudades = [c["nombre"] for c in cities]
elif args.ciudad:
    ciudades = [args.ciudad]
else:
    print("Usa --ciudad 'NombreCiudad' o --all")
    sys.exit(1)

print(f"Ciudades a procesar: {len(ciudades)}")
total_nuevos = 0

for idx, ciudad in enumerate(ciudades, 1):
    res = importar_ciudad(ciudad)
    nuevos = res.get("nuevos", 0)
    total = res.get("total_json", 0)
    total_nuevos += nuevos
    estado = "❌" if res.get("error") else ("✓" if nuevos > 0 else "·")
    print(f"  {estado} [{idx}/{len(ciudades)}] {ciudad}: {nuevos} nuevos de {total} en OSM")

    # Pausa entre ciudades para no saturar Overpass ni D1
    if idx < len(ciudades):
        time.sleep(3)

print(f"\n✓ Total locales nuevos añadidos: {total_nuevos}")
print(f"  Próxima ejecución enriquecerá los nuevos con datos de Google Places (cron 04:00)")
