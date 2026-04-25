#!/usr/bin/env python3
"""
scraper_emails_web.py — Extrae emails de las webs de los locales.

Visita las webs de locales que tienen URL pero no email,
extrae emails con regex y los guarda en D1.

Uso:
  python3 scraper_emails_web.py              # 200 webs (defecto)
  python3 scraper_emails_web.py --limite 500
  python3 scraper_emails_web.py --dry-run

Cron sugerido: 0 4 * * * (cada noche)
"""

import os, re, time, requests, argparse, logging
from datetime import datetime
from urllib.parse import urljoin, urlparse

CF_ACCOUNT = "0c4d9c91bb0f3a4c905545ecc158ec65"
CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN", "")
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"

if not CF_TOKEN:
    raise SystemExit("ERROR: CLOUDFLARE_API_TOKEN no definido")

D1_URL     = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
D1_HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

LIMITE_DEFECTO   = 200
TIMEOUT_WEB      = 8     # segundos por petición HTTP
PAUSA            = 0.3   # entre webs
MAX_BYTES        = 150_000  # no leer más de 150KB por página

# Dominios de email a ignorar (genéricos, no del local)
EMAIL_BLACKLIST = {
    "gmail.com", "hotmail.com", "yahoo.com", "yahoo.es", "outlook.com",
    "icloud.com", "me.com", "live.com", "msn.com",
    "wix.com", "wordpress.com", "squarespace.com", "godaddy.com",
    "example.com", "test.com", "noreply", "no-reply",
    "sentry.io", "google.com", "facebook.com", "instagram.com",
}

# Páginas de contacto a intentar si la home no tiene email
CONTACT_PATHS = ["/contacto", "/contacta", "/contact", "/sobre-nosotros",
                 "/about", "/info", "/quienes-somos"]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/root/tresycuarto-sync/logs/scraper_emails_web.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; tresycuarto-bot/1.0; +https://tresycuarto.com)",
    "Accept": "text/html",
    "Accept-Language": "es-ES,es;q=0.9",
})

EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE
)

# Prefijos profesionales — solo estos se guardan (base legal B2B más sólida)
EMAIL_PROFESSIONAL_PREFIXES = {
    "info", "hola", "contacto", "contact", "hello", "mail", "email",
    "admin", "administracion", "reservas", "reservas", "booking",
    "eventos", "prensa", "comunicacion", "marketing", "ventas",
    "tienda", "shop", "web", "online", "digital", "general",
    "direccion", "gerencia", "recepcion", "oficina", "bar", "cafe",
}

def es_email_profesional(email):
    """Devuelve True si el email parece profesional (no personal)."""
    prefijo = email.split("@")[0].lower()
    # Prefijos claramente profesionales
    if prefijo in EMAIL_PROFESSIONAL_PREFIXES:
        return True
    # Prefijos que empiezan por palabras profesionales
    if any(prefijo.startswith(p) for p in EMAIL_PROFESSIONAL_PREFIXES):
        return True
    # Descartar si parece nombre personal: tiene punto entre palabras cortas
    # ej: maria.garcia@, juan.lopez@
    partes = prefijo.replace("_", ".").split(".")
    if len(partes) == 2 and all(3 <= len(p) <= 10 and p.isalpha() for p in partes):
        return False
    # Descartar si solo es un nombre corto sin números (ej: maria@, juan@, pedro@)
    if prefijo.isalpha() and len(prefijo) <= 8:
        return False
    return True

def d1_query(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL, headers=D1_HEADERS, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise Exception(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]

def d1_run(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    r = requests.post(D1_URL, headers=D1_HEADERS, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise Exception(f"D1 error: {data.get('errors')}")
    return data["result"][0]

def fetch_text(url, timeout=TIMEOUT_WEB):
    """Descarga una URL y devuelve el texto HTML (limitado a MAX_BYTES)."""
    try:
        r = SESSION.get(url, timeout=timeout, allow_redirects=True, stream=True)
        r.raise_for_status()
        content = b""
        for chunk in r.iter_content(chunk_size=8192):
            content += chunk
            if len(content) >= MAX_BYTES:
                break
        return content.decode("utf-8", errors="replace")
    except Exception:
        return None

def extraer_emails(html, dominio_local):
    """Extrae emails del HTML, filtrando los genéricos."""
    if not html:
        return []

    # Primero buscar en mailto: links (más fiables)
    mailto_re = re.compile(r'mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})', re.IGNORECASE)
    emails = set(mailto_re.findall(html))

    # Luego texto general
    emails.update(EMAIL_RE.findall(html))

    # Extensiones de archivo que no son emails
    FILE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
                       ".css", ".js", ".json", ".xml", ".pdf", ".ico",
                       ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3"}

    # Filtrar
    resultado = []
    for e in emails:
        e = e.lower().strip(".")
        dominio = e.split("@")[-1]
        # Descartar si el dominio termina en extensión de archivo
        if any(dominio.endswith(ext.lstrip(".")) for ext in FILE_EXTENSIONS):
            continue
        if any(bl in dominio for bl in EMAIL_BLACKLIST):
            continue
        if "noreply" in e or "no-reply" in e:
            continue
        # Priorizar emails del mismo dominio que la web
        # Solo emails profesionales (base legal B2B)
        if dominio_local and dominio_local in dominio:
            resultado.insert(0, e)
        else:
            resultado.append(e)

    return resultado[:3]  # máximo 3 candidatos (mezcla profesionales y personales)


def clasificar_emails(emails):
    """Separa la lista en (email_profesional, email_personal)."""
    profesionales = [e for e in emails if es_email_profesional(e)]
    personales    = [e for e in emails if not es_email_profesional(e)]
    return (profesionales[0] if profesionales else None,
            personales[0]    if personales    else None)

def scrape_web(web_url):
    """Intenta extraer emails de una web. Devuelve lista (puede mezclar prof+personal)."""
    parsed = urlparse(web_url)
    dominio = parsed.netloc.replace("www.", "")
    todos = []

    # 1. Intentar home
    html = fetch_text(web_url)
    todos.extend(extraer_emails(html, dominio))

    # 2. Si no hay profesionales, intentar páginas de contacto
    if not any(es_email_profesional(e) for e in todos):
        base = f"{parsed.scheme}://{parsed.netloc}"
        for path in CONTACT_PATHS:
            html = fetch_text(base + path)
            todos.extend(extraer_emails(html, dominio))
            if any(es_email_profesional(e) for e in todos):
                break
            time.sleep(0.1)

    # Deduplicar manteniendo orden
    seen = set()
    result = []
    for e in todos:
        if e not in seen:
            seen.add(e)
            result.append(e)
    return result

def main():
    parser = argparse.ArgumentParser(description="Scraper de emails desde webs de locales")
    parser.add_argument("--limite", type=int, default=LIMITE_DEFECTO)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    log.info(f"=== Inicio scraper_emails_web | limite={args.limite} dry-run={args.dry_run} ===")

    locales = d1_query(f"""
        SELECT id, nombre, ciudad, web
        FROM locales
        WHERE web IS NOT NULL AND web != ''
          AND (email IS NULL OR email = '')
          AND claimed = 0
        ORDER BY
          CASE WHEN instagram IS NOT NULL THEN 0 ELSE 1 END,
          rating DESC NULLS LAST
        LIMIT {args.limite}
    """)

    log.info(f"Locales a procesar: {len(locales)}")

    ok = errores = sin_email = 0

    for i, local in enumerate(locales, 1):
        web = local["web"]
        if not web.startswith("http"):
            web = "https://" + web

        try:
            emails = scrape_web(web)  # ahora devuelve lista
            email_prof, email_pers = clasificar_emails(emails if isinstance(emails, list) else ([emails] if emails else []))

            if email_prof or email_pers:
                tag = f"prof={email_prof or '—'} | pers={email_pers or '—'}"
                log.info(f"  [{i}/{len(locales)}] {local['nombre']} ({local['ciudad']}) → {tag}")
                if not args.dry_run:
                    updates = []
                    params  = []
                    if email_prof:
                        updates.append("email = ?")
                        params.append(email_prof)
                    if email_pers:
                        updates.append("email_personal = ?")
                        params.append(email_pers)
                    params.append(local["id"])
                    d1_run(f"UPDATE locales SET {', '.join(updates)} WHERE id = ?", params)
                ok += 1
            else:
                log.info(f"  [{i}/{len(locales)}] {local['nombre']} → sin email")
                sin_email += 1

        except Exception as e:
            log.error(f"  [{i}/{len(locales)}] {local['nombre']} → ERROR: {e}")
            errores += 1

        time.sleep(PAUSA)

    log.info(f"=== Fin | Emails encontrados: {ok} | Sin email: {sin_email} | Errores: {errores} ===")

if __name__ == "__main__":
    main()
