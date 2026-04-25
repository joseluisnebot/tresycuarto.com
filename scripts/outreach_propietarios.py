#!/usr/bin/env python3
"""
outreach_propietarios.py — Envía email de outreach a propietarios de locales.

Selecciona locales con email pero sin cuenta (claimed=0), les envía un email
personalizado invitándoles a reclamar su ficha.

Características:
- Envía máximo N emails por ejecución (defecto: 50)
- Marca los locales como contactados (email_enviado=1) para no repetir
- Solo contacta locales con slug (ficha pública ya creada)
- Personaliza el mensaje por tipo de local

Uso:
  python3 outreach_propietarios.py              # 50 emails (defecto)
  python3 outreach_propietarios.py --limite 100
  python3 outreach_propietarios.py --dry-run    # sin enviar ni marcar

Cron sugerido: 0 10 * * 1,3,5 (lunes, miércoles y viernes a las 10:00)
"""

import os, requests, time, argparse, logging
from datetime import datetime

CF_ACCOUNT  = "0c4d9c91bb0f3a4c905545ecc158ec65"
CF_TOKEN    = os.environ.get("CLOUDFLARE_API_TOKEN", "")
DB_ID       = "458672aa-392f-4767-8d2b-926406628ba0"
BREVO_KEY   = os.environ.get("BREVO_API_KEY", "")

if not CF_TOKEN:
    raise SystemExit("ERROR: CLOUDFLARE_API_TOKEN no definido")

D1_URL     = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
D1_HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

LIMITE_DEFECTO = 50
PAUSA          = 0.3  # segundos entre emails

# Solo emails con estos prefijos (base legal B2B — LSSI art. 21.2)
EMAIL_PROFESSIONAL_PREFIXES = {
    "info", "hola", "contacto", "contact", "hello", "mail", "email",
    "admin", "administracion", "reservas", "booking", "eventos",
    "prensa", "comunicacion", "marketing", "ventas", "tienda", "shop",
    "web", "online", "digital", "general", "direccion", "gerencia",
    "recepcion", "oficina", "bar", "cafe",
}

def es_email_profesional(email):
    prefijo = email.split("@")[0].lower()
    if prefijo in EMAIL_PROFESSIONAL_PREFIXES:
        return True
    if any(prefijo.startswith(p) for p in EMAIL_PROFESSIONAL_PREFIXES):
        return True
    partes = prefijo.replace("_", ".").split(".")
    if len(partes) == 2 and all(3 <= len(p) <= 10 and p.isalpha() for p in partes):
        return False
    if prefijo.isalpha() and len(prefijo) <= 8:
        return False
    return True

TIPO_LABEL = {
    "bar": "bar", "cafe": "cafetería", "pub": "pub",
    "biergarten": "terraza", "nightclub": "local", "lounge": "local",
    "restaurant": "restaurante",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/root/tresycuarto-sync/logs/outreach_propietarios.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)


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

def ciudad_slug(ciudad):
    import unicodedata
    s = unicodedata.normalize("NFD", ciudad.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace(" ", "-").replace("'", "").replace(".", "")
    return s

def construir_email(local):
    tipo   = TIPO_LABEL.get(local.get("tipo", ""), "local")
    nombre = local["nombre"]
    ciudad = local["ciudad"]
    slug   = local.get("slug", "")
    cslug  = ciudad_slug(ciudad)
    url_ficha = f"https://tresycuarto.com/locales/{cslug}/{slug}"
    url_claim = f"https://tresycuarto.com/unete?local={local['id']}&nombre={requests.utils.quote(nombre)}&ciudad={requests.utils.quote(ciudad)}"

    rating_str = ""
    if local.get("rating") and float(local["rating"]) > 0:
        estrellas = "★" * min(5, round(float(local["rating"])))
        rating_str = f"<p style='color:#78716C;font-size:0.9rem;margin:0 0 1rem'>Tu ficha tiene una valoración de <strong>{estrellas} {float(local['rating']):.1f}</strong> en nuestra plataforma.</p>"

    subject = f"Hola {nombre} — tu {tipo} ya aparece en tresycuarto.com"

    html = f"""
<div style="font-family:-apple-system,Arial,sans-serif;background:#FFF8EF;padding:2rem">
<div style="max-width:540px;margin:0 auto;background:white;border-radius:1.25rem;border:1px solid #F5E6D3;padding:2rem">

  <p style="font-size:1.4rem;font-weight:900;margin:0 0 1.5rem">
    <span style="color:#1C1917">tres</span><span style="color:#FB923C">y</span><span style="color:#1C1917">cuarto</span>
  </p>

  <h2 style="color:#1C1917;font-size:1.2rem;margin:0 0 1rem">
    Hola, tu {tipo} <strong>{nombre}</strong> ya está en tresycuarto 👋
  </h2>

  <p style="color:#44403C;line-height:1.6;margin:0 0 1rem">
    Somos <strong>tresycuarto.com</strong>, el directorio de tardeo y ocio de media tarde en España.
    Hemos añadido <strong>{nombre}</strong> en {ciudad} a nuestra plataforma y ya tienes
    <a href="{url_ficha}" style="color:#FB923C;text-decoration:none">ficha pública</a>.
  </p>

  {rating_str}

  <p style="color:#44403C;line-height:1.6;margin:0 0 1.5rem">
    Si eres el propietario, puedes <strong>reclamar tu ficha gratis</strong> y gestionar:
  </p>

  <ul style="color:#44403C;line-height:1.8;margin:0 0 1.5rem;padding-left:1.2rem">
    <li>📸 Subir fotos de tu local</li>
    <li>🕐 Actualizar horarios y datos de contacto</li>
    <li>📅 Publicar eventos y promociones</li>
    <li>📊 Ver cuánta gente visita tu ficha</li>
  </ul>

  <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">
    <a href="{url_claim}" style="display:inline-block;padding:0.85rem 1.75rem;background:linear-gradient(135deg,#FB923C,#F59E0B);color:white;font-weight:700;text-decoration:none;border-radius:0.75rem;font-size:0.95rem">
      Reclamar mi ficha gratis →
    </a>
    <a href="{url_ficha}" style="display:inline-block;padding:0.85rem 1.75rem;background:white;color:#FB923C;font-weight:700;text-decoration:none;border-radius:0.75rem;font-size:0.95rem;border:1.5px solid #FB923C">
      Ver mi ficha →
    </a>
  </div>

  <p style="color:#A8A29E;font-size:0.78rem;line-height:1.5;border-top:1px solid #F5E6D3;padding-top:1rem;margin:0">
    Has recibido este email porque obtuvimos tu dirección de contacto de la web pública de tu negocio
    y consideramos que este mensaje puede ser de tu interés (LSSI art. 21.2).
    Si no deseas recibir más comunicaciones,
    <a href="https://tresycuarto.com/api/unsubscribe?email={{email}}&local={local['id']}" style="color:#A8A29E">
      haz clic aquí para darte de baja
    </a>.
    tresycuarto.com · hola@tresycuarto.com
  </p>

</div>
</div>"""

    return subject, html


def enviar_email(dest_email, subject, html):
    res = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
        json={
            "sender": {"name": "tresycuarto", "email": "hola@tresycuarto.com"},
            "to": [{"email": dest_email}],
            "subject": subject,
            "htmlContent": html.replace("{email}", requests.utils.quote(dest_email)),
        },
        timeout=15,
    )
    return res.status_code in (200, 201)


def main():
    parser = argparse.ArgumentParser(description="Outreach a propietarios de locales")
    parser.add_argument("--limite", type=int, default=LIMITE_DEFECTO)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    log.info(f"=== Inicio outreach_propietarios | limite={args.limite} dry-run={args.dry_run} ===")

    # Asegurar columna email_outreach_sent
    try:
        d1_run("ALTER TABLE locales ADD COLUMN email_outreach_sent INTEGER DEFAULT 0")
        log.info("Columna email_outreach_sent creada.")
    except Exception:
        pass  # Ya existe

    locales_raw = d1_query(f"""
        SELECT id, nombre, tipo, ciudad, slug, email, rating, instagram, web
        FROM locales
        WHERE email IS NOT NULL AND email != ''
          AND claimed = 0
          AND slug IS NOT NULL AND slug != ''
          AND (email_outreach_sent IS NULL OR email_outreach_sent = 0)
        ORDER BY rating DESC NULLS LAST
        LIMIT {args.limite * 3}
    """)
    # Filtrar solo emails profesionales (base legal B2B)
    locales = [l for l in locales_raw if es_email_profesional(l["email"])][:args.limite]
    descartados = len(locales_raw) - len(locales)
    if descartados:
        log.info(f"Emails personales descartados por filtro B2B: {descartados}")

    log.info(f"Locales a contactar: {len(locales)}")

    ok = errores = 0

    for i, local in enumerate(locales, 1):
        try:
            subject, html = construir_email(local)

            if args.dry_run:
                log.info(f"  [{i}/{len(locales)}] DRY-RUN: {local['nombre']} ({local['ciudad']}) → {local['email']}")
                log.info(f"    Subject: {subject}")
            else:
                enviado = enviar_email(local["email"], subject, html)
                if enviado:
                    d1_run("UPDATE locales SET email_outreach_sent = 1 WHERE id = ?", [local["id"]])
                    log.info(f"  [{i}/{len(locales)}] ✓ {local['nombre']} ({local['ciudad']}) → {local['email']}")
                    ok += 1
                else:
                    log.warning(f"  [{i}/{len(locales)}] ✗ {local['nombre']} → fallo al enviar a {local['email']}")
                    errores += 1

        except Exception as e:
            log.error(f"  [{i}/{len(locales)}] {local['nombre']} → ERROR: {e}")
            errores += 1

        time.sleep(PAUSA)

    log.info(f"=== Fin | Enviados: {ok} | Errores: {errores} | Total: {len(locales)} ===")


if __name__ == "__main__":
    main()
