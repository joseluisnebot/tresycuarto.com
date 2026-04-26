#!/usr/bin/env python3
"""
enriquecer_ratings.py
Enriquece locales con datos de Google Places API:
  - rating + nº reseñas
  - foto (URL directa para mostrar en tarjeta)
  - precio (€ / €€ / €€€)
  - horario (de Google, rellena los que no tienen)
  - descripción editorial
  - terraza confirmada (outdoor_seating)
  - música en directo (live_music)
  - coordenadas reales (lat/lon) — corrige coords incorrectas de OSM
  - web y teléfono (si el local no los tiene ya)

LÍMITE FIJO: 150 locales/día (30 por ciudad × 5 ciudades) → dentro del crédito gratuito ($200/mes).
Distribuye equitativamente entre las 5 ciudades con más locales sin enriquecer.
NUNCA modificar POR_CIUDAD sin autorización expresa.

Cron: 0 4 * * * python3 /root/tresycuarto-sync/scripts/enriquecer_ratings.py
"""

import os
import sys, os, json, time, requests, argparse
from datetime import datetime

print(f"=== {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")

# ── Constantes ──────────────────────────────────────────────────────────────
GOOGLE_KEY      = os.environ["GOOGLE_PLACES_API_KEY"]
CF_ACCOUNT      = os.environ["CLOUDFLARE_ACCOUNT_ID"]
CF_TOKEN        = os.environ["CLOUDFLARE_API_TOKEN"]
D1_DB           = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL          = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB}/query"
PLACES_URL      = "https://places.googleapis.com/v1/places:searchText"
PHOTO_BASE      = "https://places.googleapis.com/v1/{name}/media?maxWidthPx=600&key=" + GOOGLE_KEY

# LÍMITE DE SEGURIDAD — NO CAMBIAR. 30/ciudad × 5 ciudades = 150/día máximo.
POR_CIUDAD      = 30
NUM_CIUDADES    = 5

PRICE_LABEL = {
    "PRICE_LEVEL_FREE":          "Gratis",
    "PRICE_LEVEL_INEXPENSIVE":   "€",
    "PRICE_LEVEL_MODERATE":      "€€",
    "PRICE_LEVEL_EXPENSIVE":     "€€€",
    "PRICE_LEVEL_VERY_EXPENSIVE":"€€€€",
}

# ── Argparse ─────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--ciudad", type=str, default=None, help="Procesar solo esta ciudad")
args = parser.parse_args()

# ── D1 helper ────────────────────────────────────────────────────────────────
def d1(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL,
        headers={"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"},
        json=body, timeout=20)
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(data.get("errors"))
    return data["result"][0]["results"]

# ── Google Places ─────────────────────────────────────────────────────────────
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.regularOpeningHours",
    "places.photos",
    "places.editorialSummary",
    "places.outdoorSeating",
    "places.liveMusic",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.location",
    "places.goodForGroups",
    "places.allowsDogs",
])

def buscar_en_google(nombre, ciudad, direccion=None):
    """Devuelve dict con todos los campos, o None si no encuentra."""
    query = f"{nombre} {ciudad}"
    if direccion:
        query += f" {direccion}"
    try:
        r = requests.post(PLACES_URL,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_KEY,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            json={"textQuery": query, "languageCode": "es", "maxResultCount": 1},
            timeout=10,
        )
        places = r.json().get("places", [])
        if not places:
            return None
        return places[0]
    except Exception as e:
        print(f"    ERROR Places API: {e}")
        return None

def extraer_datos(place):
    """Extrae y normaliza todos los campos útiles del resultado de Google."""
    # Foto — primer resultado, URL directa usable en <img>
    photo_url = None
    fotos = place.get("photos", [])
    if fotos:
        photo_name = fotos[0].get("name", "")
        if photo_name:
            photo_url = PHOTO_BASE.replace("{name}", photo_name)

    # Horario — array de strings "Lunes: 17:00 – 23:00"
    horario_google = None
    oh = place.get("regularOpeningHours", {})
    dias = oh.get("weekdayDescriptions", [])
    if dias:
        horario_google = " | ".join(dias)

    # Descripción editorial
    desc = place.get("editorialSummary", {}).get("text")

    # Coordenadas reales de Google (más fiables que OSM para ciudades homónimas)
    location = place.get("location", {})
    lat = location.get("latitude")
    lon = location.get("longitude")

    return {
        "rating":           place.get("rating"),
        "rating_count":     place.get("userRatingCount"),
        "google_place_id":  place.get("id"),
        "photo_url":        photo_url,
        "price_level":      PRICE_LABEL.get(place.get("priceLevel", ""), None),
        "horario_google":   horario_google,
        "descripcion_google": desc,
        "outdoor_seating":  1 if place.get("outdoorSeating") else 0,
        "live_music":       1 if place.get("liveMusic") else 0,
        "good_for_groups":  1 if place.get("goodForGroups") else 0,
        "allows_dogs":      1 if place.get("allowsDogs") else 0,
        "lat":              lat,
        "lon":              lon,
        "web":              place.get("websiteUri"),
        "telefono":         place.get("nationalPhoneNumber"),
    }

# ── Main ──────────────────────────────────────────────────────────────────────
# Si se pasa --ciudad, procesar solo esa ciudad con POR_CIUDAD locales
if args.ciudad:
    ciudades_a_procesar = [args.ciudad]
    print(f"Modo ciudad única: {args.ciudad} ({POR_CIUDAD} locales)")
else:
    # Seleccionar las NUM_CIUDADES ciudades con más locales sin enriquecer
    top = d1(
        f"SELECT ciudad, COUNT(*) as pendientes FROM locales "
        f"WHERE rating IS NULL "
        f"GROUP BY ciudad ORDER BY pendientes DESC LIMIT {NUM_CIUDADES}"
    )
    ciudades_a_procesar = [r["ciudad"] for r in top]
    print(f"Top {NUM_CIUDADES} ciudades con más pendientes: {', '.join(ciudades_a_procesar)}")
    print(f"Plan: {POR_CIUDAD} locales/ciudad = {POR_CIUDAD * len(ciudades_a_procesar)} llamadas hoy")

# Cargar locales: POR_CIUDAD por cada ciudad seleccionada
locales = []
for ciudad in ciudades_a_procesar:
    lote = d1(
        f"SELECT id, nombre, ciudad, direccion, lat, web, telefono FROM locales "
        f"WHERE rating IS NULL AND ciudad=? "
        f"ORDER BY nombre LIMIT {POR_CIUDAD}",
        [ciudad]
    )
    print(f"  {ciudad}: {len(lote)} locales")
    locales.extend(lote)

total = len(locales)
print(f"Total a procesar hoy: {total}")

ok, sin_resultado, errores = 0, 0, 0

for i, local in enumerate(locales):
    place = buscar_en_google(local["nombre"], local["ciudad"], local.get("direccion"))

    if place:
        datos = extraer_datos(place)
        # Si rating no encontrado, poner 0 para no reprocesar
        if datos["rating"] is None:
            datos["rating"] = 0

        # Solo sobreescribir web/telefono si el local no los tiene ya
        web_update      = datos["web"]      if not local.get("web")      else local["web"]
        telefono_update = datos["telefono"] if not local.get("telefono") else local["telefono"]

        d1(
            """UPDATE locales SET
               rating=?, rating_count=?, google_place_id=?,
               photo_url=?, price_level=?,
               horario_google=?, descripcion_google=?,
               outdoor_seating=?, live_music=?,
               good_for_groups=?, allows_dogs=?,
               lat=?, lon=?,
               web=?, telefono=?
               WHERE id=?""",
            [
                datos["rating"], datos["rating_count"], datos["google_place_id"],
                datos["photo_url"], datos["price_level"],
                datos["horario_google"], datos["descripcion_google"],
                datos["outdoor_seating"], datos["live_music"],
                datos["good_for_groups"], datos["allows_dogs"],
                datos["lat"], datos["lon"],
                web_update, telefono_update,
                local["id"],
            ]
        )

        stars = f"⭐ {datos['rating']}" if datos["rating"] else "sin rating"
        price = datos["price_level"] or ""
        photo = "📷" if datos["photo_url"] else ""
        hours = "🕒" if datos["horario_google"] else ""
        desc  = "📝" if datos["descripcion_google"] else ""
        coords = "📍" if datos["lat"] else ""
        print(f"  ✓ {local['nombre'][:35]:35s} {stars} {price} {photo}{hours}{desc}{coords}")
        ok += 1
    else:
        # Marcar como procesado (sin resultado) para no volver a intentar
        d1("UPDATE locales SET rating=0 WHERE id=?", [local["id"]])
        sin_resultado += 1

    # Rate limit: ~8 req/s (Google permite hasta 10/s)
    time.sleep(0.13)

    if (i + 1) % 100 == 0:
        print(f"  ── {i+1}/{total} | con datos: {ok} | sin resultado: {sin_resultado} ──")

print(f"\n✓ {ok} enriquecidos | {sin_resultado} sin resultado | {errores} errores")
print(f"  Peticiones Google usadas hoy: {ok + sin_resultado} / {POR_CIUDAD * len(ciudades_a_procesar)}")
