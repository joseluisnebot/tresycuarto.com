#!/usr/bin/env python3
"""
Agente enriquecedor: busca Instagram, web, teléfono, horario y terraza de locales.
Usa DuckDuckGo (sin API key) con rate limiting para no ser bloqueado.
Si el local ya tiene web, la scrapea para extraer teléfono, horario y terraza.

Uso:
    python3 enriquecedor.py --ciudad Madrid --limite 5   # prueba
    python3 enriquecedor.py --ciudad Madrid --limite 50
    python3 enriquecedor.py --ciudad Barcelona --limite 100 --dry-run
"""

import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "WCvwZkoXOw_qE6onJYlsVrqupNoIt3msrgo2WGIM")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
DB_ID = "458672aa-392f-4767-8d2b-926406628ba0"
D1_API = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{DB_ID}/query"

HEADERS_D1 = {
    "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
    "Content-Type": "application/json",
}

HEADERS_DDG = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Accept-Language": "es-ES,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

HEADERS_WEB = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Accept-Language": "es-ES,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

RE_INSTAGRAM = re.compile(r'instagram\.com/([a-zA-Z0-9_.]{2,30})/?(?:["\s<]|$)')
RE_WEB = re.compile(r'https?://([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})')
RE_WEB_FULL = re.compile(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s"<]*')
RE_TELEFONO = re.compile(r'(?<!\d)(?:\+34[\s.-]?)?([6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})(?!\d)')
RE_HORARIO = re.compile(
    r'(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\bL[-–]V\b|\bL[-–]D\b|todos los d[ií]as)'
    r'.{0,60}(?:\d{1,2}[:h]\d{2}\s*(?:h|hrs?)?)',
    re.IGNORECASE
)
KEYWORDS_TERRAZA = {"terraza", "exterior", "jardín", "jardin", "patio", "azotea", "rooftop", "al aire libre", "terrassa"}

EXCLUIR_WEB = {
    "instagram.com", "facebook.com", "twitter.com", "tiktok.com",
    "google.com", "maps.google.com", "tripadvisor.com", "yelp.com",
    "foursquare.com", "duckduckgo.com", "w3.org", "schema.org",
    "wikipedia.org", "youtube.com", "whatsapp.com", "booking.com",
    "eltenedor.es", "thefork.com", "reservas.com", "just-eat.es",
}


def d1_query(sql: str, params: list = None) -> list:
    payload = json.dumps({"sql": sql, "params": params or []}).encode()
    req = urllib.request.Request(D1_API, data=payload, method="POST")
    for k, v in HEADERS_D1.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    return data["result"][0].get("results", [])


def buscar_duckduckgo(query: str) -> str:
    params = urllib.parse.urlencode({"q": query, "kl": "es-es", "ia": "web"})
    url = f"https://html.duckduckgo.com/html/?{params}"
    req = urllib.request.Request(url, method="GET")
    for k, v in HEADERS_DDG.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return ""


def extraer_instagram(html: str, nombre: str) -> str | None:
    matches = RE_INSTAGRAM.findall(html)
    # Filtrar cuentas genéricas
    excluir = {"p", "explore", "reels", "stories", "accounts", "about", "legal", "help", "press"}
    for m in matches:
        if m.lower() not in excluir and len(m) >= 3:
            return m
    return None


def extraer_web(html: str) -> str | None:
    matches = RE_WEB.findall(html)
    for dominio in matches:
        base = dominio.lower().lstrip("www.")
        if not any(excluido in dominio.lower() for excluido in EXCLUIR_WEB):
            return dominio
    return None


def limpiar_telefono(t: str) -> str:
    return re.sub(r'[\s.-]', '', t)


def extraer_telefono(texto: str) -> str | None:
    matches = RE_TELEFONO.findall(texto)
    for m in matches:
        limpio = limpiar_telefono(m)
        if len(limpio) == 9:
            return limpio
    return None


def extraer_horario(texto: str) -> str | None:
    # Eliminar URLs y etiquetas HTML antes de buscar horarios
    limpio = re.sub(r'https?://\S+', ' ', texto)
    limpio = re.sub(r'<[^>]+>', ' ', limpio)
    limpio = re.sub(r'\s+', ' ', limpio)
    matches = RE_HORARIO.findall(limpio)
    if matches:
        horario = matches[0].strip()
        return horario[:120]
    return None


def detectar_terraza(texto: str) -> bool:
    texto_lower = texto.lower()
    return any(kw in texto_lower for kw in KEYWORDS_TERRAZA)


def scrape_web(url: str) -> str:
    """Descarga el HTML de la web del local. Devuelve string vacío si falla."""
    if not url.startswith("http"):
        url = "https://" + url
    req = urllib.request.Request(url, method="GET")
    for k, v in HEADERS_WEB.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read(100_000)  # Máx 100KB
            return raw.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def enriquecer_local(local: dict, dry_run: bool = False) -> dict:
    nombre = local["nombre"]
    ciudad = local["ciudad"]
    cambios = {}

    # Buscar Instagram
    if not local.get("instagram"):
        html = buscar_duckduckgo(f'"{nombre}" {ciudad} instagram')
        ig = extraer_instagram(html, nombre)
        if ig:
            cambios["instagram"] = ig
        time.sleep(8)

    # Buscar web
    html_web_ddg = ""
    if not local.get("web"):
        html_web_ddg = buscar_duckduckgo(f'"{nombre}" bar {ciudad} sitio web')
        web = extraer_web(html_web_ddg)
        if web:
            cambios["web"] = web
        time.sleep(8)

    # Determinar URL web a usar (ya existente o recién encontrada)
    web_url = local.get("web") or cambios.get("web")

    # Scrape web del local para teléfono, horario y terraza
    html_web = ""
    if web_url and (not local.get("telefono") or not local.get("horario") or not local.get("terraza")):
        html_web = scrape_web(web_url)
        time.sleep(3)

    # Teléfono: primero en la web, luego en resultados DDG
    if not local.get("telefono"):
        tel = None
        if html_web:
            tel = extraer_telefono(html_web)
        if not tel:
            # Buscar en DDG si no tenemos web o no encontramos nada
            html_tel = buscar_duckduckgo(f'"{nombre}" {ciudad} teléfono contacto')
            tel = extraer_telefono(html_tel)
            time.sleep(8)
        if tel:
            cambios["telefono"] = tel

    # Horario: de la web del local
    if not local.get("horario") and html_web:
        horario = extraer_horario(html_web)
        if horario:
            cambios["horario"] = horario

    # Terraza: de la web o de snippets DDG (reutilizamos html_web_ddg si lo tenemos)
    if not local.get("terraza"):
        texto_check = html_web + html_web_ddg
        if detectar_terraza(texto_check):
            cambios["terraza"] = 1

    return cambios


def actualizar_d1(local_id: str, cambios: dict):
    if not cambios:
        return
    sets = ", ".join(f"{k} = ?" for k in cambios)
    sql = f"UPDATE locales SET {sets} WHERE id = ?"
    params = list(cambios.values()) + [local_id]
    d1_query(sql, params)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ciudad", required=True)
    parser.add_argument("--limite", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true", help="Muestra lo que encontraría sin guardar en DB")
    args = parser.parse_args()

    modo = "DRY-RUN (sin guardar)" if args.dry_run else "PRODUCCIÓN"
    print(f"\n=== Agente enriquecedor — {args.ciudad} [{modo}] ===")

    locales = d1_query(
        "SELECT id, nombre, ciudad, instagram, web, telefono, horario, terraza FROM locales "
        "WHERE ciudad = ? AND ("
        "  instagram IS NULL OR instagram = '' OR"
        "  web IS NULL OR web = '' OR"
        "  telefono IS NULL OR telefono = '' OR"
        "  horario IS NULL OR horario = '' OR"
        "  terraza IS NULL"
        ") ORDER BY nombre LIMIT ?",
        [args.ciudad, args.limite]
    )

    print(f"  Locales a enriquecer: {len(locales)}")
    encontrados = {"instagram": 0, "web": 0, "telefono": 0, "horario": 0, "terraza": 0}

    for i, local in enumerate(locales, 1):
        print(f"  [{i}/{len(locales)}] {local['nombre']}", end=" ", flush=True)
        cambios = enriquecer_local(local, dry_run=args.dry_run)

        if cambios:
            if not args.dry_run:
                actualizar_d1(local["id"], cambios)
            for k in cambios:
                encontrados[k] += 1
            print(f"→ {', '.join(f'{k}: {v}' for k, v in cambios.items())}")
        else:
            print("→ sin datos")

        # Pausa extra cada 10 locales para no saturar DuckDuckGo
        if i % 10 == 0:
            print("  Pausa de 10s...")
            time.sleep(10)

    print(f"\nResumen:")
    for campo, n in encontrados.items():
        if n > 0:
            print(f"  {campo}: {n}")
    print(f"  Total procesados: {len(locales)}\n")


if __name__ == "__main__":
    main()
