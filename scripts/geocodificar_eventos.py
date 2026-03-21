#!/usr/bin/env python3
"""
geocodificar_eventos.py

Dos operaciones:
  1. REVERSE: para eventos con coords específicas (no el centroide de la ciudad),
     hace reverse geocoding con Nominatim y rellena el campo direccion en D1.
  2. FORWARD: para eventos con direccion conocida pero solo coords de ciudad,
     geocodifica la dirección específica y actualiza lat/lon en D1.

Uso:
  python3 geocodificar_eventos.py            # ambas operaciones
  python3 geocodificar_eventos.py --reverse  # solo reverse geocoding
  python3 geocodificar_eventos.py --forward  # solo forward geocoding
  python3 geocodificar_eventos.py --dry-run  # sin escribir en D1
"""
import json, urllib.request, urllib.parse, time, argparse, sys, math, os
from datetime import datetime

API_TOKEN  = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL     = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

# Umbral para considerar que un evento tiene coords específicas (no centroide ciudad)
# Si está a más de 300m del centroide, asumimos coords concretas
UMBRAL_METROS = 300

# Cargar centroides de ciudades desde ciudad-content.json
_script_dir = os.path.dirname(os.path.abspath(__file__))
_content_path = os.path.join(_script_dir, "..", "data", "ciudad-content.json")
with open(_content_path, encoding="utf-8") as f:
    _ciudad_content = json.load(f)

CENTROIDES = {
    ciudad: (data["coords"]["lat"], data["coords"]["lon"])
    for ciudad, data in _ciudad_content.items()
    if "coords" in data
}


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


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    p = math.pi / 180
    a = 0.5 - math.cos((lat2 - lat1) * p) / 2 + \
        math.cos(lat1 * p) * math.cos(lat2 * p) * \
        (1 - math.cos((lon2 - lon1) * p)) / 2
    return 2 * R * math.asin(math.sqrt(a))


def tiene_coords_especificas(ciudad, lat, lon):
    """Devuelve True si las coords son distintas al centroide de la ciudad."""
    if ciudad not in CENTROIDES:
        return True  # ciudad desconocida → asumir que son específicas
    clat, clon = CENTROIDES[ciudad]
    dist = haversine_m(lat, lon, clat, clon)
    return dist > UMBRAL_METROS


def nominatim_reverse(lat, lon):
    """Reverse geocoding con Nominatim. Devuelve dirección legible o None."""
    query = urllib.parse.urlencode({
        "lat": lat, "lon": lon,
        "format": "json", "addressdetails": 1,
        "zoom": 17,  # nivel calle
    })
    url = f"https://nominatim.openstreetmap.org/reverse?{query}"
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "tresycuarto-geocoder/1.0 (joseluisnebot@gmail.com)")
    try:
        time.sleep(1)  # respetar rate limit Nominatim (1 req/s)
        with urllib.request.urlopen(req, timeout=10) as r:
            result = json.loads(r.read())
        if "error" in result:
            return None
        addr = result.get("address", {})
        # Construir dirección limpia: calle + número + barrio/ciudad
        partes = []
        road = addr.get("road") or addr.get("pedestrian") or addr.get("footway")
        if road:
            partes.append(road)
            house = addr.get("house_number")
            if house:
                partes[-1] = f"{road}, {house}"
        neighbourhood = addr.get("neighbourhood") or addr.get("quarter") or addr.get("suburb")
        if neighbourhood and road:
            partes.append(neighbourhood)
        if not partes:
            return None  # sin calle → no sirve
        return ", ".join(partes)
    except Exception as e:
        print(f"    [reverse error] {lat},{lon}: {e}")
        return None


def nominatim_forward(direccion, ciudad):
    """Geocodifica una dirección específica. Devuelve (lat, lon) o (None, None)."""
    query = urllib.parse.urlencode({
        "q": f"{direccion}, {ciudad}, España",
        "format": "json", "limit": 1,
        "addressdetails": 1,
    })
    url = f"https://nominatim.openstreetmap.org/search?{query}"
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "tresycuarto-geocoder/1.0 (joseluisnebot@gmail.com)")
    try:
        time.sleep(1)
        with urllib.request.urlopen(req, timeout=10) as r:
            results = json.loads(r.read())
        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            # Verificar que el resultado es más específico que el centroide
            if tiene_coords_especificas(ciudad, lat, lon):
                return lat, lon
    except Exception as e:
        print(f"    [forward error] {direccion}, {ciudad}: {e}")
    return None, None


def run_reverse(dry_run=False):
    """Para eventos sin dirección con coords específicas → reverse geocode."""
    print("\n── REVERSE GEOCODING ──")
    eventos = d1_query(
        "SELECT id, nombre, ciudad, lat, lon FROM eventos_geo "
        "WHERE direccion IS NULL AND lat IS NOT NULL AND activo = 1"
    )
    print(f"  {len(eventos)} eventos sin dirección")

    actualizados = 0
    sin_coords_especificas = 0
    sin_resultado = 0

    for ev in eventos:
        ciudad = ev["ciudad"]
        lat, lon = ev["lat"], ev["lon"]

        if not tiene_coords_especificas(ciudad, lat, lon):
            sin_coords_especificas += 1
            continue

        direccion = nominatim_reverse(lat, lon)
        if not direccion:
            sin_resultado += 1
            print(f"  ✗ Sin resultado: {ev['nombre'][:50]} ({ciudad})")
            continue

        print(f"  ✓ {ev['nombre'][:45]} → {direccion}")
        if not dry_run:
            d1_query(
                "UPDATE eventos_geo SET direccion = ? WHERE id = ?",
                [direccion, ev["id"]]
            )
        actualizados += 1

    print(f"\n  Resultado reverse: {actualizados} actualizados, "
          f"{sin_coords_especificas} con centroide de ciudad, "
          f"{sin_resultado} sin resultado Nominatim")
    return actualizados


def run_forward(dry_run=False):
    """Para eventos con dirección pero coords de ciudad → forward geocode."""
    print("\n── FORWARD GEOCODING ──")
    # Eventos que tienen dirección pero probablemente coords de ciudad
    eventos = d1_query(
        "SELECT id, nombre, ciudad, lat, lon, direccion FROM eventos_geo "
        "WHERE direccion IS NOT NULL AND lat IS NOT NULL AND activo = 1"
    )

    candidatos = [
        ev for ev in eventos
        if not tiene_coords_especificas(ev["ciudad"], ev["lat"], ev["lon"])
    ]
    print(f"  {len(candidatos)} eventos con dirección pero coords de ciudad")

    actualizados = 0
    sin_resultado = 0

    for ev in candidatos:
        lat, lon = nominatim_forward(ev["direccion"], ev["ciudad"])
        if not lat:
            sin_resultado += 1
            continue

        dist_anterior = haversine_m(ev["lat"], ev["lon"],
                                    *CENTROIDES.get(ev["ciudad"], (ev["lat"], ev["lon"])))
        print(f"  ✓ {ev['nombre'][:40]} | {ev['direccion'][:35]} → {lat:.5f},{lon:.5f}")
        if not dry_run:
            d1_query(
                "UPDATE eventos_geo SET lat = ?, lon = ? WHERE id = ?",
                [lat, lon, ev["id"]]
            )
        actualizados += 1

    print(f"\n  Resultado forward: {actualizados} actualizados, {sin_resultado} sin resultado")
    return actualizados


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5-coder:7b"


def ollama_extract_venue(nombre, ciudad, descripcion):
    """Usa Ollama para extraer el nombre del venue/lugar del evento."""
    prompt = f"""Extrae SOLO el nombre del lugar, sala, teatro, centro cultural o dirección donde se celebra este evento en {ciudad}, España.
Responde ÚNICAMENTE con el nombre del lugar (ej: "Teatro Liceo", "Centro Sociocultural Alfonso XII", "Plaza Mayor").
Si no hay información de lugar específico en el texto, responde exactamente: NO.

Evento: {nombre}
Descripción: {descripcion or ""}

Lugar:"""
    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0, "num_predict": 30},
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            resp = json.loads(r.read())
        venue = resp.get("response", "").strip().strip('"').strip("'")
        if not venue or venue.upper() == "NO" or len(venue) < 3:
            return None
        # Descartar respuestas genéricas o de ciudad
        genericos = {"no", "ninguno", "sin especificar", "no especificado", ciudad.lower(), "españa"}
        if venue.lower() in genericos:
            return None
        return venue
    except Exception as e:
        print(f"    [ollama error] {e}")
        return None


def run_from_desc(dry_run=False):
    """Extrae venue de la descripción con Ollama y geocodifica."""
    print("\n── GEOCODING DESDE DESCRIPCIÓN (Ollama + Nominatim) ──")
    eventos = d1_query(
        "SELECT id, nombre, ciudad, lat, lon, descripcion FROM eventos_geo "
        "WHERE direccion IS NULL AND lat IS NOT NULL AND activo = 1 "
        "AND fecha >= date('now') ORDER BY fecha"
    )
    # Solo los que tienen centroide (son los que necesitan mejora)
    candidatos = [
        ev for ev in eventos
        if not tiene_coords_especificas(ev["ciudad"], ev["lat"], ev["lon"])
    ]
    print(f"  {len(candidatos)} eventos con centroide de ciudad candidatos")

    actualizados = 0
    sin_venue = 0
    sin_geocode = 0

    for ev in candidatos:
        venue = ollama_extract_venue(ev["nombre"], ev["ciudad"], ev["descripcion"])
        if not venue:
            sin_venue += 1
            continue

        lat, lon = nominatim_forward(venue, ev["ciudad"])
        if not lat:
            # Intentar solo con el venue sin ciudad
            lat, lon = nominatim_forward(f"{venue}, {ev['ciudad']}, España", "")
        if not lat:
            sin_geocode += 1
            print(f"  ? {ev['nombre'][:40]} → venue: '{venue}' → sin coords")
            continue

        direccion_rev = nominatim_reverse(lat, lon) or venue
        print(f"  ✓ {ev['nombre'][:40]} → '{venue}' → {direccion_rev}")
        if not dry_run:
            d1_query(
                "UPDATE eventos_geo SET lat = ?, lon = ?, direccion = ? WHERE id = ?",
                [lat, lon, direccion_rev, ev["id"]]
            )
        actualizados += 1

    print(f"\n  Resultado desc: {actualizados} actualizados, "
          f"{sin_venue} sin venue en descripción, "
          f"{sin_geocode} venue encontrado pero no geocodificado")
    return actualizados


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reverse", action="store_true", help="Solo reverse geocoding")
    parser.add_argument("--forward", action="store_true", help="Solo forward geocoding")
    parser.add_argument("--from-desc", action="store_true", help="Extraer venue de descripción con Ollama")
    parser.add_argument("--dry-run", action="store_true", help="Sin escribir en D1")
    args = parser.parse_args()

    print(f"=== geocodificar_eventos.py — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
    if args.dry_run:
        print("  MODO DRY-RUN — no se escribe en D1")

    if args.from_desc:
        total = run_from_desc(dry_run=args.dry_run)
    else:
        do_reverse = args.reverse or not args.forward
        do_forward = args.forward or not args.reverse
        total = 0
        if do_reverse:
            total += run_reverse(dry_run=args.dry_run)
        if do_forward:
            total += run_forward(dry_run=args.dry_run)

    print(f"\n=== Total actualizados: {total} ===")
