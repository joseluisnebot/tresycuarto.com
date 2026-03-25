#!/usr/bin/env python3
"""
enviar_newsletter.py
Cada día a las 15:15 envía UN email por suscriptor con hasta 5 eventos
de sus ciudades cuya fecha_envio = hoy (fecha_evento - dias_previos_envio).
Reemplaza el antiguo sistema de campañas Listmonk y el email semanal del viernes.

Cron: 15 15 * * *
"""
import json, urllib.request, os, base64
from datetime import datetime, timedelta

API_TOKEN  = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

LISTMONK_URL  = os.environ.get("LISTMONK_URL", "http://192.168.1.152:9000")
LISTMONK_USER = os.environ.get("LISTMONK_USER", "tresycuarto")
LISTMONK_PASS = os.environ["LISTMONK_PASS"]
LISTMONK_LIST = 3

BREVO_KEY  = os.environ["BREVO_API_KEY"]
FROM_EMAIL = "hola@tresycuarto.com"
BASE_URL   = "https://tresycuarto.com"
ADMIN_EMAIL = "JoseluisNebot@gmail.com"

MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
         "septiembre","octubre","noviembre","diciembre"]

ICONS = {"procesion": "⛪", "futbol": "⚽", "concierto": "🎵", "festival": "🎭",
         "feria": "🎡", "deporte": "🏅", "escena": "🎭", "mercado": "🛍️"}


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


def listmonk_get_subscribers():
    """Devuelve todos los suscriptores activos de la lista con sus ciudades."""
    auth = base64.b64encode(f"{LISTMONK_USER}:{LISTMONK_PASS}".encode()).decode()
    req = urllib.request.Request(
        f"{LISTMONK_URL}/api/subscribers?list_id={LISTMONK_LIST}&per_page=500&page=1",
        method="GET"
    )
    req.add_header("Authorization", f"Basic {auth}")
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    return data.get("data", {}).get("results", [])


def brevo_send(to_email, to_name, subject, html):
    payload = json.dumps({
        "sender": {"name": "tresycuarto", "email": FROM_EMAIL},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html,
    }).encode()
    req = urllib.request.Request("https://api.brevo.com/v3/smtp/email", data=payload, method="POST")
    req.add_header("api-key", BREVO_KEY)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status


def generar_html_digest(eventos):
    """Genera un email resumen con múltiples eventos."""
    bloques = ""
    for ev in eventos:
        fecha = datetime.strptime(ev["fecha"], "%Y-%m-%d")
        fecha_es = f"{fecha.day} de {MESES[fecha.month-1]}"
        icon = ICONS.get(ev["tipo"], "📅")
        ciudad_slug = ev["ciudad"].lower().replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n").replace(" ","-")
        desc = (ev.get("descripcion") or "")[:160]
        if len(ev.get("descripcion") or "") > 160:
            desc += "…"

        bloques += f"""
<tr><td style="padding:0 0 16px;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="border:1px solid #F5E6D3;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1E0A2E;padding:20px 24px;">
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#A78BFA;text-transform:uppercase;letter-spacing:0.12em;">
    {icon} {fecha_es} &middot; {ev['ciudad']}
  </p>
  <p style="margin:0 0 8px;font-size:17px;font-weight:800;color:#FFF8EF;line-height:1.3;">
    {ev['nombre']}
  </p>
  <p style="margin:0 0 14px;font-size:13px;color:#C4B5FD;line-height:1.5;">{desc}</p>
  <a href="{BASE_URL}/locales/{ciudad_slug}?evento={ev['id']}"
     style="display:inline-block;background:#FB923C;color:#1C1917;font-weight:700;
            font-size:13px;text-decoration:none;padding:8px 18px;border-radius:8px;">
    Ver locales cercanos &rarr;
  </a>
</td></tr>
</table>
</td></tr>"""

    ciudades_unicas = list(dict.fromkeys(ev["ciudad"] for ev in eventos))
    ciudades_str = " · ".join(ciudades_unicas)
    n = len(eventos)

    return f"""<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#FFF8EF;padding:32px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr><td style="background:#1C1917;border-radius:16px 16px 0 0;padding:24px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="font-size:20px;font-weight:800;color:#FB923C;letter-spacing:-0.03em;">tresycuarto</span></td>
<td align="right"><span style="font-size:11px;color:#78716C;">Planes de hoy</span></td>
</tr></table>
</td></tr>

<tr><td style="background:#292524;padding:28px 32px 20px;">
<h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#FFF8EF;">
  📅 {n} plan{'es' if n > 1 else ''} en {ciudades_str}
</h1>
<p style="margin:0;font-size:14px;color:#A8A29E;">
  Esto es lo que viene en tu ciudad. Apúntalo ya.
</p>
</td></tr>

<tr><td style="background:#ffffff;padding:24px 32px 8px;">
<table width="100%" cellpadding="0" cellspacing="0">
{bloques}
</table>
</td></tr>

<tr><td style="background:#FFF8EF;border-top:1px solid #F5E6D3;padding:24px 32px;text-align:center;">
<table cellpadding="0" cellspacing="0" align="center"><tr>
<td style="background:#1C1917;border-radius:8px;padding:12px 24px;">
<a href="{BASE_URL}" style="color:#FFF8EF;font-weight:700;font-size:14px;text-decoration:none;">
  Explorar todas las ciudades &rarr;
</a>
</td></tr></table>
</td></tr>

<tr><td style="background:#1C1917;border-radius:0 0 16px 16px;padding:20px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
  <span style="font-size:15px;font-weight:800;color:#FB923C;">tresycuarto</span><br>
  <span style="font-size:11px;color:#78716C;">
    <a href="{BASE_URL}" style="color:#78716C;">tresycuarto.com</a> &middot; Planes de tarde en España
  </span>
</td>
<td align="right" style="vertical-align:middle;">
  <a href="{BASE_URL}/api/unsubscribe"
     style="font-size:11px;color:#57534E;text-decoration:none;">Cancelar suscripci&oacute;n</a>
</td>
</tr></table>
</td></tr>

</table>
</td></tr></table>"""


def notificar_admin(resumen):
    """Email de resumen diario a Jose Luis."""
    lines = "".join(f"<li>{r}</li>" for r in resumen)
    html = f"""<body style="font-family:Arial,sans-serif;padding:24px;">
<h2>📬 Newsletter diaria — resumen</h2>
<ul>{lines}</ul>
</body>"""
    brevo_send(ADMIN_EMAIL, "Jose Luis", f"[tresycuarto] Resumen newsletter {datetime.now().strftime('%d/%m')}", html)


def main():
    hoy = datetime.now().strftime("%Y-%m-%d")
    print(f"=== enviar_newsletter.py {hoy} ===")

    # 1. Eventos con fecha_envio = hoy
    todos = d1_query(
        f"SELECT * FROM eventos_geo WHERE activo=1 AND estado='aprobado' AND fecha >= '{hoy}' ORDER BY fecha"
    )
    eventos_hoy = []
    for ev in todos:
        fecha_evento = datetime.strptime(ev["fecha"], "%Y-%m-%d")
        dias_previos = ev.get("dias_previos_envio") or 2
        fecha_envio  = fecha_evento - timedelta(days=int(dias_previos))
        if fecha_envio.strftime("%Y-%m-%d") == hoy:
            eventos_hoy.append(ev)

    if not eventos_hoy:
        print(f"Sin eventos programados para hoy. Nada que enviar.")
        return

    # Agrupar por ciudad
    por_ciudad = {}
    for ev in eventos_hoy:
        por_ciudad.setdefault(ev["ciudad"], []).append(ev)

    print(f"{len(eventos_hoy)} eventos en {len(por_ciudad)} ciudad(es): {', '.join(por_ciudad.keys())}")

    # 2. Obtener suscriptores
    suscriptores = listmonk_get_subscribers()
    print(f"{len(suscriptores)} suscriptor(es) activos")

    # 3. Un email por suscriptor con sus eventos
    resumen = []
    emails_enviados = 0

    for sub in suscriptores:
        if sub.get("status") != "enabled":
            continue

        attribs = sub.get("attribs") or {}
        ciudades = attribs.get("ciudades") or []
        if not ciudades and attribs.get("ciudad"):
            ciudades = [attribs["ciudad"]]
        if not ciudades:
            continue

        # Recoger hasta 5 eventos de sus ciudades
        eventos_sub = []
        for ciudad in ciudades:
            eventos_sub.extend(por_ciudad.get(ciudad, []))
        eventos_sub = eventos_sub[:5]

        if not eventos_sub:
            continue

        ciudades_str = " · ".join(dict.fromkeys(ev["ciudad"] for ev in eventos_sub))
        n = len(eventos_sub)
        subject = f"📅 {n} plan{'es' if n > 1 else ''} en {ciudades_str} — tresycuarto"
        html = generar_html_digest(eventos_sub)

        try:
            brevo_send(sub["email"], sub.get("name", ""), subject, html)
            emails_enviados += 1
            linea = f"{sub['email']} → {n} eventos ({ciudades_str})"
            print(f"  ✓ {linea}")
            resumen.append(linea)
        except Exception as e:
            print(f"  ✗ Error enviando a {sub['email']}: {e}")

    # 4. Marcar como 'enviado' solo los eventos de ciudades con al menos un suscriptor
    ciudades_notificadas = set()
    for sub in suscriptores:
        if sub.get("status") != "enabled":
            continue
        attribs = sub.get("attribs") or {}
        ciudades = attribs.get("ciudades") or []
        if not ciudades and attribs.get("ciudad"):
            ciudades = [attribs["ciudad"]]
        for ciudad in ciudades:
            if ciudad in por_ciudad:
                ciudades_notificadas.add(ciudad)

    ids_enviados = [ev["id"] for ev in eventos_hoy if ev["ciudad"] in ciudades_notificadas]
    ids_sin_sub  = [ev["id"] for ev in eventos_hoy if ev["ciudad"] not in ciudades_notificadas]

    for ids, estado in [(ids_enviados, "enviado")]:
        for i in range(0, len(ids), 20):
            batch = ids[i:i+20]
            placeholders = ",".join(f"'{x}'" for x in batch)
            d1_query(f"UPDATE eventos_geo SET estado='{estado}' WHERE id IN ({placeholders})")

    if ids_sin_sub:
        ciudades_sin = set(ev["ciudad"] for ev in eventos_hoy if ev["ciudad"] not in ciudades_notificadas)
        print(f"  ⚠ {len(ids_sin_sub)} eventos sin suscriptores en {ciudades_sin} — se quedan en 'aprobado'")

    print(f"\n{emails_enviados} emails enviados. {len(ids_enviados)} eventos marcados como enviado.")

    if emails_enviados > 0 or len(eventos_hoy) > 0:
        resumen.append(f"Total: {emails_enviados} emails, {len(eventos_hoy)} eventos procesados")
        notificar_admin(resumen)

    print("=== Fin ===")


if __name__ == "__main__":
    main()
