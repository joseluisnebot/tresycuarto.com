#!/usr/bin/env python3
"""
Envía previews de newsletters a Jose Luis para revisión.
Busca eventos próximos en estado 'pendiente' y N días antes te manda el preview.
Aprobar = programar. El envío real ocurre el día calculado vía enviar_newsletter.py.

Flujo de estados:
  pendiente → revision_enviada → aprobado → enviado
                              └→ rechazado

Uso: python3 preview_newsletter.py [--dias-preview 5]
Cron: cada día a las 9:15 — busca eventos que estén a exactamente N días
"""
import json, urllib.request, os, sys, argparse, smtplib, secrets
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

OLLAMA_URL    = "http://localhost:11434/api/generate"
MODEL_ENRICH  = "mistral:7b"

def mejorar_descripcion(evento):
    """Usa mistral:7b para generar una descripción atractiva del evento si es corta o genérica."""
    desc = (evento.get("descripcion") or "").strip()
    if len(desc) >= 80:
        return desc  # ya tiene descripción suficiente

    meses = ["enero","febrero","marzo","abril","mayo","junio","julio",
             "agosto","septiembre","octubre","noviembre","diciembre"]
    try:
        f = datetime.strptime(evento["fecha"], "%Y-%m-%d")
        fecha_es = f"{f.day} de {meses[f.month-1]} de {f.year}"
    except Exception:
        fecha_es = evento["fecha"]

    prompt = (f"Escribe UN párrafo atractivo (2-3 frases, máximo 200 caracteres) para una newsletter "
              f"de ocio y tardeo sobre este evento. Tono cercano, en español. Sin comillas.\n"
              f"Evento: {evento['nombre']}\nCiudad: {evento['ciudad']}\n"
              f"Tipo: {evento['tipo']}\nFecha: {fecha_es}")
    payload = json.dumps({
        "model": MODEL_ENRICH,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.5, "num_predict": 120}
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read()).get("response", "").strip()[:200]
    except Exception:
        return desc

API_TOKEN  = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

SMTP_HOST  = "smtp-relay.brevo.com"
SMTP_PORT  = 587
SMTP_USER  = "hola@tresycuarto.com"
SMTP_PASS  = os.environ.get("BREVO_SMTP_KEY", "")
FROM_EMAIL = "tresycuarto <hola@tresycuarto.com>"
REVIEW_TO  = "joseluisnebot@gmail.com"
BASE_URL   = "https://tresycuarto.com"

# Días antes del evento para enviar el preview según tipo
DIAS_PREVIEW_POR_TIPO = {
    "procesion":  5,
    "festival":   7,
    "futbol":     3,
    "concierto":  5,
}
DIAS_PREVIEW_DEFAULT = 5


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


def generar_html_newsletter(evento, locales):
    fecha = datetime.strptime(evento["fecha"], "%Y-%m-%d")
    meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
             "septiembre","octubre","noviembre","diciembre"]
    fecha_es = f"{fecha.day} de {meses[fecha.month-1]} de {fecha.year}"
    icon = {"procesion": "⛪", "futbol": "⚽", "concierto": "🎵", "festival": "🎭"}.get(evento["tipo"], "📅")
    ciudad_slug = evento["ciudad"].lower().replace(" ", "-")

    tarjetas = ""
    for i, local in enumerate(locales):
        color = "#FB923C" if i == 0 else ("#F59E0B" if local.get("terraza") else "#78716C")
        border = "2px solid #FB923C" if i == 0 else "1px solid #E7E5E4"
        extras = " · ☀️ Terraza" if local.get("terraza") else ""
        web_html = f' &nbsp;<a href="{local["web"]}" style="color:#FB923C;font-weight:600;">{local["web"][:35]}</a>' if local.get("web") else ""
        dir_html = f'&#128205; {local["direccion"]}' if local.get("direccion") else ""
        dist_label = f"{local['distancia_m']}m" if local.get("distancia_m", -1) >= 0 else "en la ciudad"
        tarjetas += f"""<tr><td style="background:#ffffff;padding:4px 40px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:{border};border-radius:12px;margin-bottom:10px;"><tr><td style="padding:16px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:{color};text-transform:uppercase;">#{i+1} &middot; {dist_label}{extras}</p>
<p style="margin:0 0 4px;font-size:17px;font-weight:800;color:#1C1917;">{local['nombre']}</p>
<p style="margin:0;font-size:12px;color:#A8A29E;">{dir_html}{web_html}</p>
</td></tr></table></td></tr>"""

    sin_ubicacion = any(l.get("distancia_m", -1) < 0 for l in locales)
    locales_intro = (
        f'Selección de locales para tardear en {evento["ciudad"]}. '
        f'<span style="color:#F59E0B;font-weight:600;">⚠ Este evento no tiene dirección concreta — '
        f'los locales son una selección de la ciudad.</span>'
        if sin_ubicacion else
        f'{len(locales)} locales a menos de {evento["radio_m"]}m del evento.'
    )

    return f"""<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#1C1917;border-radius:16px 16px 0 0;padding:28px 40px 24px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="font-size:22px;font-weight:800;color:#FB923C;letter-spacing:-0.03em;">tresycuarto</span></td>
<td align="right"><span style="font-size:11px;color:#78716C;">{evento['tipo'].upper()} &middot; {evento['ciudad']}</span></td>
</tr></table></td></tr>
<tr><td style="background:#1E0A2E;padding:40px 40px 32px;">
<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#A78BFA;letter-spacing:0.14em;text-transform:uppercase;">&#x1F4C5; {fecha_es} &middot; {evento['ciudad']}</p>
<h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#FFF8EF;line-height:1.2;">{icon} {evento['nombre']}</h1>
<p style="margin:0 0 24px;font-size:15px;color:#C4B5FD;line-height:1.6;">{mejorar_descripcion(evento)}</p>
<table cellpadding="0" cellspacing="0"><tr><td style="background:#FB923C;border-radius:8px;padding:12px 24px;">
<a href="{BASE_URL}/locales/{ciudad_slug}" style="color:#1C1917;font-weight:700;font-size:14px;text-decoration:none;">Ver todos los locales de {evento['ciudad']} &rarr;</a>
</td></tr></table></td></tr>
<tr><td style="background:#ffffff;padding:28px 40px 8px;">
<h2 style="margin:0 0 6px;font-size:18px;font-weight:800;color:#1C1917;">Mientras esperas...</h2>
<p style="margin:0 0 20px;font-size:14px;color:#78716C;">{locales_intro}</p>
</td></tr>
{tarjetas}
<tr><td style="background:#FFF8EF;border-top:1px solid #E7E5E4;padding:28px 40px;text-align:center;">
<table cellpadding="0" cellspacing="0" align="center"><tr><td style="background:#1C1917;border-radius:8px;padding:14px 28px;">
<a href="{BASE_URL}" style="color:#FFF8EF;font-weight:700;font-size:14px;text-decoration:none;">Explorar todas las ciudades &rarr;</a>
</td></tr></table></td></tr>
<tr><td style="background:#1C1917;border-radius:0 0 16px 16px;padding:24px 40px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="font-size:16px;font-weight:800;color:#FB923C;letter-spacing:-0.03em;">tresycuarto</span><br>
<span style="font-size:11px;color:#78716C;"><a href="{BASE_URL}" style="color:#78716C;">tresycuarto.com</a> &middot; Cada d&iacute;a a las 15:15</span></td>
<td align="right" style="vertical-align:top;font-size:11px;color:#57534E;">Cancelar suscripci&oacute;n</td>
</tr></table></td></tr>
</table></td></tr></table>"""


def generar_email_revision(evento, locales, token, newsletter_html):
    fecha_evento = datetime.strptime(evento["fecha"], "%Y-%m-%d")
    dias_envio = evento.get("dias_previos_envio", 2)
    fecha_envio = fecha_evento - timedelta(days=dias_envio)
    dias_hasta_preview = (fecha_evento - datetime.now()).days

    meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
             "septiembre","octubre","noviembre","diciembre"]
    fecha_evento_es = f"{fecha_evento.day} de {meses[fecha_evento.month-1]}"
    fecha_envio_es  = f"{fecha_envio.day} de {meses[fecha_envio.month-1]}"

    aprobar_url  = f"{BASE_URL}/api/aprobar-evento?id={evento['id']}&token={token}&accion=aprobar"
    rechazar_url = f"{BASE_URL}/api/aprobar-evento?id={evento['id']}&token={token}&accion=rechazar"

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#1C1917;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1C1917;padding:32px 16px;">
<tr><td align="center"><table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

<tr><td style="background:#292524;border-radius:16px 16px 0 0;padding:28px 40px;border-bottom:2px solid #FB923C;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#F59E0B;letter-spacing:0.14em;text-transform:uppercase;">&#x1F916; Agente IA &middot; Revisión previa</p>
<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFF8EF;">Newsletter lista para aprobar</h1>
<p style="margin:0;font-size:14px;color:#A8A29E;"><strong style="color:#FFF8EF;">{evento['nombre']}</strong> &middot; {evento['ciudad']}</p>
</td></tr>

<tr><td style="background:#292524;padding:24px 40px;border-bottom:1px solid #3C3836;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="width:33%;text-align:center;padding:12px;">
  <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#FB923C;">{fecha_evento_es}</p>
  <p style="margin:0;font-size:11px;color:#78716C;text-transform:uppercase;">Fecha del evento</p>
</td>
<td style="width:33%;text-align:center;padding:12px;border-left:1px solid #3C3836;border-right:1px solid #3C3836;">
  <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#22C55E;">{fecha_envio_es}</p>
  <p style="margin:0;font-size:11px;color:#78716C;text-transform:uppercase;">Se enviar&aacute; el</p>
</td>
<td style="width:33%;text-align:center;padding:12px;">
  <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#FB923C;">{dias_envio}d antes</p>
  <p style="margin:0;font-size:11px;color:#78716C;text-transform:uppercase;">Anticipaci&oacute;n</p>
</td>
</tr></table>
</td></tr>

<tr><td style="background:#292524;padding:28px 40px;border-bottom:1px solid #3C3836;">
<p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#FFF8EF;">&#x2709;&#xFE0F; &iquest;Apruebas esta newsletter?</p>
<p style="margin:0 0 20px;font-size:13px;color:#78716C;">Si apruebas, el agente la enviar&aacute; autom&aacute;ticamente el <strong style="color:#FFF8EF;">{fecha_envio_es}</strong> a todos los suscriptores. No se env&iacute;a ahora.</p>
<table cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;">
  <a href="{aprobar_url}" style="display:inline-block;background:#22C55E;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">&#x2713; Aprobar</a>
</td>
<td>
  <a href="{rechazar_url}" style="display:inline-block;background:#3C3836;color:#A8A29E;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;border:1px solid #57534E;">&#x2715; Rechazar</a>
</td>
</tr></table>
</td></tr>

<tr><td style="background:#3C3836;padding:14px 40px;">
<p style="margin:0;font-size:11px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:0.1em;">&#x1F4E7; As&iacute; llegar&aacute; a los suscriptores el {fecha_envio_es}:</p>
</td></tr>
<tr><td style="padding:0;">{newsletter_html}</td></tr>

<tr><td style="background:#292524;border-radius:0 0 16px 16px;padding:20px 40px;">
<p style="margin:0;font-size:12px;color:#57534E;">
  Preview generado autom&aacute;ticamente &middot; ID: <code style="color:#A8A29E;">{evento['id']}</code><br>
  Si rechazas, edita el evento en D1 y ejecuta <code style="color:#A8A29E;">preview_newsletter.py --forzar</code> para regenerar.
</p>
</td></tr>

</table></td></tr></table>
</body></html>"""


def enviar_smtp(to, subject, html):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to
    msg.attach(MIMEText("Versión HTML requerida.", "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    s = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
    s.starttls()
    s.login(SMTP_USER, SMTP_PASS)
    s.sendmail("hola@tresycuarto.com", [to], msg.as_bytes())
    s.quit()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dias-preview", type=int, default=None,
                        help="Días antes del evento para enviar el preview (sobreescribe el valor por tipo)")
    parser.add_argument("--forzar", action="store_true",
                        help="Reenviar preview aunque ya esté en revision_enviada o aprobado")
    parser.add_argument("--evento", help="Procesar solo este evento ID")
    parser.add_argument("--limite", type=int, default=10,
                        help="Máximo de previews a enviar por ejecución (defecto: 10)")
    args = parser.parse_args()

    hoy = datetime.now()

    if args.evento:
        # Modo manual: procesar evento específico
        eventos = d1_query("SELECT * FROM eventos_geo WHERE id = ? AND activo = 1", [args.evento])
    else:
        # Modo automático: buscar eventos cuyo día de preview coincide con hoy
        # Ventana: solo eventos cuya fecha_preview_calculada está entre hoy-1 y hoy
        # (no enviamos previews de eventos muy viejos para evitar spam masivo)
        estados = "('pendiente', 'revision_enviada', 'aprobado')" if args.forzar else "('pendiente')"
        eventos_todos = d1_query(
            f"SELECT * FROM eventos_geo WHERE activo = 1 AND estado IN {estados} AND fecha >= ? ORDER BY fecha",
            [hoy.strftime("%Y-%m-%d")]
        )
        eventos = []
        for ev in eventos_todos:
            dias_preview = args.dias_preview or DIAS_PREVIEW_POR_TIPO.get(ev["tipo"], DIAS_PREVIEW_DEFAULT)
            dias_envio   = ev.get("dias_previos_envio", 2)
            dias_total   = dias_envio + dias_preview
            fecha_evento = datetime.strptime(ev["fecha"], "%Y-%m-%d")
            fecha_preview_calculada = fecha_evento - timedelta(days=dias_total)
            # Solo enviar si la fecha de preview es HOY o AYER (ventana de 2 días)
            # Evita enviar masivamente todos los eventos cuando se añaden de golpe
            dias_retraso = (hoy.date() - fecha_preview_calculada.date()).days
            if 0 <= dias_retraso <= 1:
                eventos.append(ev)

        if not eventos:
            print(f"No hay eventos que necesiten preview hoy ({hoy.strftime('%Y-%m-%d')})")
            return

        # Límite de seguridad: máximo N previews por ejecución
        if len(eventos) > args.limite:
            print(f"⚠ {len(eventos)} eventos pendientes, enviando solo los primeros {args.limite} (usa --limite N para más)")
            eventos = eventos[:args.limite]

    if not eventos:
        print(f"No hay eventos que necesiten preview hoy ({hoy.strftime('%Y-%m-%d')})")
        return

    print(f"Enviando {len(eventos)} preview(s)...")

    for ev in eventos:
        locales = d1_query("""
            SELECT l.id, l.nombre, l.web, l.instagram, l.terraza, l.direccion, el.distancia_m
            FROM eventos_geo_locales el
            JOIN locales l ON l.id = el.local_id
            WHERE el.evento_id = ? ORDER BY el.distancia_m LIMIT 5
        """, [ev["id"]])

        if not locales:
            print(f"  ⚠ {ev['nombre']}: sin locales en el matching, saltando")
            continue

        token = secrets.token_urlsafe(24)
        d1_query(
            "UPDATE eventos_geo SET token_aprobacion = ?, estado = 'revision_enviada' WHERE id = ?",
            [token, ev["id"]]
        )

        newsletter_html = generar_html_newsletter(ev, locales)
        revision_html   = generar_email_revision(ev, locales, token, newsletter_html)

        fecha = datetime.strptime(ev["fecha"], "%Y-%m-%d")
        meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
                 "septiembre","octubre","noviembre","diciembre"]
        subject = f"🔍 Revisión — {ev['nombre']} ({fecha.day} de {meses[fecha.month-1]})"

        enviar_smtp(REVIEW_TO, subject, revision_html)

        dias_envio = ev.get("dias_previos_envio", 2)
        fecha_envio = fecha - timedelta(days=dias_envio)
        print(f"  ✓ {ev['nombre']} ({ev['ciudad']})")
        print(f"    Evento: {ev['fecha']} · Se enviará a suscriptores: {fecha_envio.strftime('%Y-%m-%d')}")

    print(f"\nPreview(s) enviados a {REVIEW_TO}")


if __name__ == "__main__":
    main()
