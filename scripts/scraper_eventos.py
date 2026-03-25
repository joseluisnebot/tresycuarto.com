#!/usr/bin/env python3
"""
Scraper de eventos desde portales de turismo regionales.
Extrae eventos con Ollama local, geocodifica con Nominatim, inserta en D1.

Uso:
  python3 scraper_eventos.py                  # todas las fuentes
  python3 scraper_eventos.py --comunidad andalucia
  python3 scraper_eventos.py --dry-run        # no inserta en D1
"""
import json, urllib.request, urllib.parse, os, sys, argparse, hashlib, time, re, smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bs4 import BeautifulSoup

SMTP_HOST  = "smtp-relay.brevo.com"
SMTP_PORT  = 587
SMTP_USER  = "hola@tresycuarto.com"
SMTP_PASS  = os.environ.get("BREVO_SMTP_KEY", "")
NOTIFY_TO  = "joseluisnebot@gmail.com"

API_TOKEN  = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL     = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"
OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_EMBED = "http://localhost:11434/api/embeddings"
MODEL_EXTRACT = "qwen2.5-coder:7b"   # extracción JSON estructurado
MODEL_ENRICH  = "mistral:7b"          # mejorar descripciones en español
MODEL_EMBED   = "nomic-embed-text"    # embeddings para deduplicación

HOY    = datetime.now().strftime("%Y-%m-%d")
LIMITE = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")

# ── Fuentes por comunidad autónoma ─────────────────────────────────────────
FUENTES = [
    # Andalucía
    {
        "id": "andalucia",
        "nombre": "Turismo Andalucía",
        "url": "https://www.andalucia.org/eventos/",
        "ciudades": ["Sevilla", "Málaga", "Cádiz", "Córdoba", "Granada",
                     "Jerez de la Frontera", "Almería", "Huelva", "Jaén"],
        "encoding": "utf-8",
    },
    {
        "id": "cordoba_agenda",
        "nombre": "Agenda Única Córdoba",
        "url": "https://agendaunica.cordoba.es/",
        "ciudades": ["Córdoba"],
        "encoding": "utf-8",
    },
    {
        "id": "jerez_agenda",
        "nombre": "Agenda Jerez",
        "url": "https://www.jerez.es/eventos",
        "ciudades": ["Jerez de la Frontera"],
        "encoding": "utf-8",
    },
    # Castilla y León
    {
        "id": "castilla_leon",
        "nombre": "Turismo Castilla y León",
        "url": "https://www.turismocastillayleon.com/es/servicios/agenda-cultural",
        "ciudades": ["Valladolid", "Zamora", "León", "Salamanca", "Burgos",
                     "Segovia", "Ávila", "Soria", "Palencia"],
        "encoding": "utf-8",
    },
    {
        "id": "salamanca_agenda",
        "nombre": "Agenda Salamanca",
        "url": "https://salamanca.es/es/agenda",
        "ciudades": ["Salamanca"],
        "encoding": "utf-8",
    },
    # Región de Murcia
    {
        "id": "murcia",
        "nombre": "Turismo Región de Murcia",
        "url": "https://www.turismoregiondemurcia.es/es/agenda/",
        "ciudades": ["Murcia", "Cartagena", "Lorca", "Mazarrón", "Águilas"],
        "encoding": "latin-1",
    },
    # Castilla-La Mancha
    {
        "id": "castilla_mancha",
        "nombre": "Turismo Castilla-La Mancha",
        "url": "https://www.turismocastillalamancha.es/es/agenda/",
        "ciudades": ["Cuenca", "Toledo", "Albacete", "Ciudad Real", "Guadalajara"],
        "encoding": "utf-8",
    },
    {
        "id": "toledo_agenda",
        "nombre": "Agenda Toledo",
        "url": "https://www.toledo.es/agenda/",
        "ciudades": ["Toledo"],
        "encoding": "utf-8",
    },
    # Comunitat Valenciana
    {
        "id": "valencia",
        "nombre": "Turisme Comunitat Valenciana",
        "url": "https://www.comunitatvalenciana.com/es/eventos",
        "ciudades": ["Valencia", "Alicante", "Castellón", "Benidorm", "Dénia"],
        "encoding": "utf-8",
    },
    {
        "id": "visitvalencia",
        "nombre": "Agenda Visit Valencia",
        "url": "https://www.visitvalencia.com/agenda-valencia",
        "ciudades": ["Valencia"],
        "encoding": "utf-8",
    },
    # Madrid
    {
        "id": "madrid",
        "nombre": "Open Data Madrid — eventos culturales 100 días",
        "url": "https://datos.madrid.es/dataset/206974-0-agenda-eventos-culturales-100/resource/206974-0-agenda-eventos-culturales-100-json/download/206974-0-agenda-eventos-culturales-100-json.json",
        "ciudades": ["Madrid"],
        "tipo": "json_api_madrid",
    },
    # España — portal nacional
    {
        "id": "spain_info",
        "nombre": "Spain.info — agenda nacional",
        "url": "https://www.spain.info/es/agenda/",
        "ciudades": ["Sevilla", "Málaga", "Cádiz", "Córdoba", "Granada",
                     "Jerez de la Frontera", "Valladolid", "Zamora", "León",
                     "Murcia", "Cartagena", "Lorca", "Cuenca", "Toledo",
                     "Valencia", "Alicante", "Madrid", "Salamanca", "Burgos"],
        "encoding": "utf-8",
    },
]

# Tipos de evento → dias_previos_envio
DIAS_PREVIOS = {
    "procesion": 2, "feria": 3, "festival": 3, "concierto": 1,
    "mercado": 1, "exposicion": 1, "deporte": 1, "otro": 2,
}

RADIO_M = {
    "procesion": 500, "feria": 800, "festival": 600, "concierto": 300,
    "mercado": 400, "exposicion": 300, "deporte": 400, "otro": 400,
}


# ── Helpers HTTP ───────────────────────────────────────────────────────────

def fetch(url, timeout=15, encoding="utf-8"):
    req = urllib.request.Request(url)
    req.add_header("User-Agent",
                   "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36")
    req.add_header("Accept-Language", "es-ES,es;q=0.9")
    req.add_header("Accept", "text/html,application/xhtml+xml,*/*")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return raw.decode(encoding, errors="replace")
    except Exception as e:
        print(f"  [fetch error] {url}: {e}")
        return None


def html_to_text(html, max_chars=12000):
    """Extrae texto limpio del HTML, limitado a max_chars."""
    soup = BeautifulSoup(html, "html.parser")
    # Eliminar scripts, estilos, nav, footer
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Colapsar líneas vacías múltiples
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text[:max_chars]


# ── Ollama ─────────────────────────────────────────────────────────────────

def ollama_extract(texto, ciudades):
    ciudades_str = ", ".join(ciudades)
    anyo = datetime.now().year
    prompt = f"""Extract cultural events from this Spanish tourism website text. Year: {anyo}.

Dates like "MAR 22" mean March 22 {anyo} → "2026-03-22".
Month codes: ENE=01 FEB=02 MAR=03 ABR=04 MAY=05 JUN=06 JUL=07 AGO=08 SEP=09 OCT=10 NOV=11 DIC=12

Rules:
- Only include events from these cities (match nearby villages to nearest city): {ciudades_str}
- Only dates between {HOY} and {LIMITE}
- Use start date if range given
- tipo must be one of: procesion, feria, festival, concierto, mercado, exposicion, deporte, otro
- descripcion max 150 chars
- hora_inicio: time in HH:MM format if mentioned, else null
- direccion: venue address or place name if mentioned, else null
- Return ONLY a JSON array, no other text

Format: [{{"nombre":"...","ciudad":"...","fecha":"YYYY-MM-DD","hora_inicio":"HH:MM or null","direccion":"... or null","tipo":"...","descripcion":"..."}}]

TEXT:
{texto}"""

    payload = json.dumps({
        "model": MODEL_EXTRACT,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 2000}
    }).encode()

    req = urllib.request.Request(OLLAMA_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            resp = json.loads(r.read())
        raw = resp.get("response", "").strip()
        # Extraer JSON del response (puede venir con texto antes/después)
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            return []
        return json.loads(match.group())
    except Exception as e:
        print(f"  [ollama error] {e}")
        return []


# ── Embeddings y deduplicación semántica ──────────────────────────────────

import math as _math

def embedding(texto):
    """Genera embedding con nomic-embed-text."""
    payload = json.dumps({"model": MODEL_EMBED, "prompt": texto}).encode()
    req = urllib.request.Request(OLLAMA_EMBED, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())["embedding"]
    except Exception:
        return None

def cosine(a, b):
    dot  = sum(x*y for x,y in zip(a,b))
    na   = _math.sqrt(sum(x*x for x in a))
    nb   = _math.sqrt(sum(x*x for x in b))
    return dot / (na * nb) if na and nb else 0

_embed_cache = []  # lista de (texto, vector) de eventos ya insertados esta sesión

def es_duplicado_semantico(nombre, ciudad, fecha, umbral=0.92):
    """Devuelve True si ya existe un evento muy similar en la sesión actual."""
    clave = f"{nombre} {ciudad} {fecha}"
    vec = embedding(clave)
    if not vec:
        return False
    for texto_prev, vec_prev in _embed_cache:
        if cosine(vec, vec_prev) >= umbral:
            return True
    _embed_cache.append((clave, vec))
    return False


def enriquecer_descripcion(nombre, ciudad, tipo, fecha):
    """Genera descripción en español con mistral:7b si el evento no tiene una."""
    meses = ["enero","febrero","marzo","abril","mayo","junio","julio",
             "agosto","septiembre","octubre","noviembre","diciembre"]
    try:
        f = datetime.strptime(fecha, "%Y-%m-%d")
        fecha_es = f"{f.day} de {meses[f.month-1]} de {f.year}"
    except Exception:
        fecha_es = fecha

    prompt = (f"Escribe UNA frase corta (máximo 120 caracteres) describiendo este evento español "
              f"para una app de ocio y tardeo. Sin comillas, solo la frase.\n"
              f"Evento: {nombre}\nCiudad: {ciudad}\nTipo: {tipo}\nFecha: {fecha_es}")
    payload = json.dumps({
        "model": MODEL_ENRICH,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.4, "num_predict": 80}
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.loads(r.read()).get("response","").strip()
            return resp[:150]
    except Exception:
        return ""


# ── Geocodificación ────────────────────────────────────────────────────────

_geo_cache = {}

def geocodificar(ciudad, pais="España"):
    key = ciudad.lower()
    if key in _geo_cache:
        return _geo_cache[key]
    query = urllib.parse.urlencode({"q": f"{ciudad}, {pais}", "format": "json", "limit": 1})
    url = f"https://nominatim.openstreetmap.org/search?{query}"
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "tresycuarto-bot/1.0")
    try:
        time.sleep(1)  # respetar rate limit Nominatim
        with urllib.request.urlopen(req, timeout=10) as r:
            results = json.loads(r.read())
        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            _geo_cache[key] = (lat, lon)
            return lat, lon
    except Exception as e:
        print(f"  [geo error] {ciudad}: {e}")
    return None, None


# ── D1 ─────────────────────────────────────────────────────────────────────

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


def evento_existe(ev_id):
    rows = d1_query("SELECT id FROM eventos_geo WHERE id = ?", [ev_id])
    return len(rows) > 0


def insertar_evento(ev, dry_run=False):
    ev_id = "ev_" + hashlib.md5(
        f"{ev['nombre']}_{ev['ciudad']}_{ev['fecha']}".encode()
    ).hexdigest()[:10]

    if evento_existe(ev_id):
        return False, "ya existe"

    # Deduplicación semántica — evita eventos muy similares aunque tengan distinto ID
    if es_duplicado_semantico(ev["nombre"], ev["ciudad"], ev["fecha"]):
        return False, "duplicado semántico"

    tipo      = ev.get("tipo", "otro")
    radio     = RADIO_M.get(tipo, 400)
    dias      = DIAS_PREVIOS.get(tipo, 2)
    desc      = ev.get("descripcion", "").strip()
    hora      = ev.get("hora_inicio") or None
    direccion = ev.get("direccion") or None
    if direccion == "null":
        direccion = None

    # Coordenadas: usar las del evento si las provee la fuente (ej. Madrid Open Data)
    lat = ev.get("_lat") or None
    lon = ev.get("_lon") or None
    # Si no, geocodificar: primero dirección específica, luego ciudad como fallback
    if not lat:
        if direccion:
            lat, lon = geocodificar(f"{direccion}, {ev['ciudad']}")
        if not lat:
            lat, lon = geocodificar(ev["ciudad"])
    if not lat:
        return False, "sin coordenadas"

    # Normalizar hora: aceptar "18:00:00" → "18:00", rechazar null/"null"
    if hora and hora != "null":
        hora = hora[:5]
    else:
        hora = None

    # Si la descripción está vacía o es muy corta, la genera mistral:7b
    if len(desc) < 20:
        desc = enriquecer_descripcion(ev["nombre"], ev["ciudad"], tipo, ev["fecha"])
    desc = desc[:200]

    if dry_run:
        print(f"    [DRY] {ev_id} | {ev['nombre']} | {ev['ciudad']} | {ev['fecha']} | {tipo} | {hora or '-'} | {direccion or '-'}")
        return True, "dry-run"

    d1_query("""
        INSERT OR IGNORE INTO eventos_geo
          (id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, lat, lon,
           radio_m, descripcion, activo, estado, dias_previos_envio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pendiente', ?)
    """, [ev_id, ev["nombre"], tipo, ev["ciudad"], ev["fecha"],
          hora, direccion, lat, lon, radio, desc, dias])
    return True, "insertado"


# ── Scraper principal ──────────────────────────────────────────────────────

def procesar_fuente(fuente, dry_run=False):
    print(f"\n── {fuente['nombre']} ──")

    # Caso especial: API JSON de Madrid
    if fuente.get("tipo") in ("json_api", "json_api_madrid"):
        return procesar_madrid(fuente, dry_run)

    html = fetch(fuente["url"], encoding=fuente.get("encoding", "utf-8"))
    if not html:
        print("  No se pudo descargar la página")
        return 0

    texto = html_to_text(html)
    print(f"  Texto extraído: {len(texto)} chars — llamando a Ollama...")

    eventos = ollama_extract(texto, fuente["ciudades"])
    print(f"  Ollama extrajo {len(eventos)} eventos candidatos")

    insertados = 0
    for ev in eventos:
        if not all(k in ev for k in ("nombre", "ciudad", "fecha", "tipo")):
            continue
        # Validar fecha
        try:
            datetime.strptime(ev["fecha"], "%Y-%m-%d")
        except ValueError:
            continue
        if ev["fecha"] < HOY or ev["fecha"] > LIMITE:
            continue

        ok, motivo = insertar_evento(ev, dry_run)
        estado = "OK" if ok else "skip"
        print(f"    {estado} [{motivo}] {ev['nombre']} — {ev['ciudad']} {ev['fecha']}")
        if ok:
            insertados += 1

    return insertados


def procesar_madrid(fuente, dry_run=False):
    """Madrid Open Data — JSON-LD con @graph."""
    raw = fetch(fuente["url"])
    if not raw:
        return 0
    try:
        data = json.loads(raw)
        # Puede ser lista directa o {@ graph: [...]}
        items = data if isinstance(data, list) else data.get("@graph", [])
    except Exception:
        return 0

    TIPO_MAP = {
        "Conciertos": "concierto", "Teatro": "otro", "Exposiciones": "exposicion",
        "Danza": "otro", "Cine": "otro", "Deporte": "deporte",
        "Fiestas": "feria", "Mercados": "mercado",
    }

    insertados = 0
    for item in items:
        nombre = item.get("title", "") or item.get("dtitle", "")
        fecha_raw = item.get("dtstart", "") or item.get("startDate", "")
        desc = item.get("description", "")[:200]
        categoria = item.get("category", [])
        if isinstance(categoria, list):
            categoria = categoria[0] if categoria else ""
        tipo = TIPO_MAP.get(categoria, "otro")

        fecha = fecha_raw[:10] if fecha_raw else ""
        if not nombre or not fecha or fecha < HOY or fecha > LIMITE:
            continue

        # Hora de inicio: extraer de dtstart si tiene formato datetime
        hora = None
        if fecha_raw and "T" in fecha_raw:
            hora = fecha_raw[11:16]  # "2026-04-01T18:30:00" → "18:30"

        # Coordenadas específicas del venue (Madrid Open Data las provee)
        location = item.get("location", {}) or {}
        ev_lat = location.get("latitude") or None
        ev_lon = location.get("longitude") or None

        # Nombre del venue y dirección
        ev_location_name = (item.get("event-location", "") or "").strip()
        address = item.get("address", {}) or {}
        street = address.get("streetAddress", "") or "" if isinstance(address, dict) else ""
        direccion = ev_location_name or (street[:150] if street else None)

        ev = {"nombre": nombre, "ciudad": "Madrid", "fecha": fecha,
              "hora_inicio": hora, "direccion": direccion or None,
              "tipo": tipo, "descripcion": desc,
              "_lat": ev_lat, "_lon": ev_lon}
        ok, motivo = insertar_evento(ev, dry_run)
        if ok:
            insertados += 1
            print(f"    OK [{motivo}] {nombre} — {fecha}")

    return insertados


# ── Main ───────────────────────────────────────────────────────────────────

def enviar_resumen(resultados, total, dry_run):
    """Envía email con resumen del scraper."""
    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
    modo  = "DRY-RUN" if dry_run else "REAL"

    # Tabla HTML por fuente
    filas = ""
    for fuente_id, datos in resultados.items():
        icono  = "✅" if datos["insertados"] > 0 else ("❌" if datos["error"] else "⚪")
        estado = datos["error"] if datos["error"] else f"{datos['insertados']} nuevos"
        filas += f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #E7E5E4;">{icono}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #E7E5E4;">{datos['nombre']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #E7E5E4;color:#78716C;">{datos['candidatos']} candidatos</td>
          <td style="padding:8px 12px;border-bottom:1px solid #E7E5E4;font-weight:700;">{estado}</td>
        </tr>"""

    # Últimos eventos insertados
    try:
        ultimos = d1_query(
            "SELECT nombre, ciudad, fecha, tipo FROM eventos_geo "
            "WHERE id LIKE 'ev_%' ORDER BY rowid DESC LIMIT 10"
        )
        ev_html = "".join(
            f"<li style='margin:4px 0;'><strong>{e['nombre']}</strong> — "
            f"{e['ciudad']} · {e['fecha']} · <em>{e['tipo']}</em></li>"
            for e in ultimos
        )
    except Exception:
        ev_html = "<li>No disponible</li>"

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F5F0E8;padding:32px;">
<table width="600" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
  <tr><td style="background:#1C1917;padding:24px 32px;">
    <span style="font-size:20px;font-weight:800;color:#FB923C;letter-spacing:-0.03em;">tresycuarto</span>
    <span style="font-size:12px;color:#78716C;margin-left:12px;">Scraper semanal · {fecha} · {modo}</span>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <h2 style="margin:0 0 8px;font-size:22px;color:#1C1917;">
      {"🔍 Simulación" if dry_run else "📥"} {total} eventos nuevos esta semana
    </h2>
    <p style="color:#78716C;margin:0 0 24px;">Resultado del scraper de portales de turismo</p>
    <table width="100%" style="border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#F5F0E8;">
        <th style="padding:8px 12px;text-align:left;"></th>
        <th style="padding:8px 12px;text-align:left;">Fuente</th>
        <th style="padding:8px 12px;text-align:left;">Extraídos</th>
        <th style="padding:8px 12px;text-align:left;">Insertados</th>
      </tr></thead>
      <tbody>{filas}</tbody>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px 28px;">
    <h3 style="font-size:16px;color:#1C1917;margin:0 0 12px;">Últimos 10 eventos en DB</h3>
    <ul style="margin:0;padding-left:20px;font-size:13px;color:#57534E;line-height:1.8;">
      {ev_html}
    </ul>
  </td></tr>
  <tr><td style="background:#1C1917;padding:18px 32px;text-align:center;">
    <span style="font-size:11px;color:#57534E;">tresycuarto.com · Cada día a las 15:15</span>
  </td></tr>
</table>
</body></html>"""

    msg = MIMEMultipart("alternative")
    msg["From"]    = "tresycuarto <hola@tresycuarto.com>"
    msg["To"]      = NOTIFY_TO
    msg["Subject"] = f"Scraper semanal — {total} eventos nuevos ({fecha})"
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        print(f"  Email resumen enviado a {NOTIFY_TO}")
    except Exception as e:
        print(f"  [email error] {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--comunidad", help="ID de comunidad específica")
    parser.add_argument("--dry-run", action="store_true",
                        help="No inserta en D1, solo muestra qué encontraría")
    args = parser.parse_args()

    fuentes = FUENTES
    if args.comunidad:
        fuentes = [f for f in FUENTES if f["id"] == args.comunidad]
        if not fuentes:
            print(f"Comunidad '{args.comunidad}' no encontrada.")
            print("Disponibles:", [f["id"] for f in FUENTES])
            sys.exit(1)

    total       = 0
    resultados  = {}   # fuente_id → {nombre, candidatos, insertados, error}

    for fuente in fuentes:
        resultados[fuente["id"]] = {
            "nombre": fuente["nombre"], "candidatos": 0,
            "insertados": 0, "error": "",
        }

    # Parchear procesar_fuente para recoger estadísticas
    for fuente in fuentes:
        rid = fuente["id"]
        try:
            n = procesar_fuente(fuente, dry_run=args.dry_run)
            resultados[rid]["insertados"] = n
            total += n
        except Exception as e:
            resultados[rid]["error"] = str(e)[:60]
            print(f"  [error] {fuente['nombre']}: {e}")

    print(f"\n{'='*50}")
    print(f"Total eventos {'encontrados' if args.dry_run else 'insertados'}: {total}")

    if not args.dry_run and total > 0:
        print("\nEjecutando matching eventos → locales...")
        import subprocess
        subprocess.run([
            "python3",
            str(__file__).replace("scraper_eventos.py", "matching_eventos.py")
        ])

    # Enviar resumen por email (siempre, no solo en dry-run)
    enviar_resumen(resultados, total, args.dry_run)


if __name__ == "__main__":
    main()
