#!/usr/bin/env python3
"""
Descarga fotos de Mapillary para locales sin foto.
Busca imágenes de calle en radio de 30m alrededor de las coordenadas del local.
Sube la imagen a Cloudflare R2 y actualiza D1.
"""
import os, sys, time, json, subprocess, tempfile, requests, argparse
from pathlib import Path

MAPILLARY_TOKEN = "MLY|26676068378748306|aaba4434f5814003d00437af9479c302"
R2_BUCKET = "tresycuarto-media"
R2_PUBLIC = "https://media.tresycuarto.com"
RADIO_GRADOS = 0.0003  # ~33 metros
MIN_BYTES = 20_000     # mínimo 20KB
MAX_POR_CIUDAD = 200   # locales a procesar por ejecución

CF_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
DB_ID = "458672aa-392f-4767-8d2b-926406628ba0"

HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}


def d1_query(sql, params=None):
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
    payload = {"sql": sql, "params": params or []}
    r = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data}")
    return data["result"][0].get("results", [])


def buscar_mapillary(lat, lon):
    """Busca la imagen más reciente de Mapillary cerca del punto dado."""
    lat, lon = float(lat), float(lon)
    bbox = f"{lon - RADIO_GRADOS},{lat - RADIO_GRADOS},{lon + RADIO_GRADOS},{lat + RADIO_GRADOS}"
    url = "https://graph.mapillary.com/images"
    params = {
        "access_token": MAPILLARY_TOKEN,
        "fields": "id,thumb_1024_url,captured_at,is_pano",
        "bbox": bbox,
        "limit": 10,
    }
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json().get("data", [])
        # Filtrar panorámicas, ordenar por más reciente
        fotos = [f for f in data if not f.get("is_pano", False)]
        if not fotos:
            fotos = data  # si solo hay panos, usarlas igual
        if not fotos:
            return None
        fotos.sort(key=lambda x: x.get("captured_at", 0), reverse=True)
        return fotos[0].get("thumb_1024_url")
    except Exception as e:
        print(f"    [Mapillary error] {e}")
        return None


def descargar_imagen(url):
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200 and len(r.content) >= MIN_BYTES:
            ct = r.headers.get("content-type", "")
            ext = "jpg" if "jpeg" in ct or "jpg" in ct else "webp" if "webp" in ct else "jpg"
            return r.content, ext
    except Exception as e:
        print(f"    [Download error] {e}")
    return None


def subir_foto_r2(local_id, data, ext):
    key = f"fotos/{local_id}.{ext}"
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        result = subprocess.run(
            ["npx", "wrangler", "r2", "object", "put", "--remote",
             f"{R2_BUCKET}/{key}", "--file", tmp_path,
             "--content-type", f"image/{ext}"],
            capture_output=True, text=True, cwd="/root/tresycuarto-sync"
        )
        if result.returncode == 0:
            return f"{R2_PUBLIC}/{key}"
        else:
            print(f"    [R2 error] {result.stderr[:200]}")
    finally:
        os.unlink(tmp_path)
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ciudad", required=True)
    parser.add_argument("--limite", type=int, default=MAX_POR_CIUDAD)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    ciudad = args.ciudad
    dry_run = args.dry_run

    print(f"\n=== Mapillary fotos — {ciudad} {'[DRY-RUN]' if dry_run else '[PRODUCCIÓN]'} ===")

    locales = d1_query(
        "SELECT id, nombre, lat, lon FROM locales "
        "WHERE ciudad = ? AND (photo_url IS NULL OR photo_url = '') "
        "AND lat IS NOT NULL AND lon IS NOT NULL "
        "ORDER BY nombre LIMIT ?",
        [ciudad, args.limite]
    )
    print(f"  Locales sin foto con coordenadas: {len(locales)}")

    encontradas = 0
    for i, local in enumerate(locales, 1):
        lid = local["id"]
        nombre = local["nombre"]
        lat = local["lat"]
        lon = local["lon"]

        img_url = buscar_mapillary(lat, lon)
        if not img_url:
            print(f"  [{i}/{len(locales)}] {nombre} → sin imagen Mapillary")
            time.sleep(0.3)
            continue

        resultado = descargar_imagen(img_url)
        if not resultado:
            print(f"  [{i}/{len(locales)}] {nombre} → imagen no descargable")
            time.sleep(0.3)
            continue

        data, ext = resultado
        if dry_run:
            print(f"  [{i}/{len(locales)}] {nombre} → [dry-run] {img_url[:60]}... ({len(data)//1024}KB)")
            encontradas += 1
            continue

        r2_url = subir_foto_r2(lid, data, ext)
        if r2_url:
            d1_query("UPDATE locales SET photo_url = ? WHERE id = ?", [r2_url, lid])
            print(f"  [{i}/{len(locales)}] {nombre} → foto OK ({len(data)//1024}KB) → {r2_url.split('/')[-1]}")
            encontradas += 1
        else:
            print(f"  [{i}/{len(locales)}] {nombre} → error subiendo a R2")

        time.sleep(0.5)  # respetar rate limit Mapillary

    print(f"\nResumen: {encontradas}/{len(locales)} fotos obtenidas")


if __name__ == "__main__":
    main()
