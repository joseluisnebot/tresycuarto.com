#!/usr/bin/env python3
"""
Genera imágenes para Instagram:
  - Carrusel "Top 5 locales cerca de [evento]" (5 slides 1080x1080)
  - Post único de evento (1080x1350, ratio 4:5)
Sin IA — plantillas Pillow.
Uso: python3 instagram_generator.py [--evento ID] [--todos] [--tipo carrusel|post]
"""
import os
import json, urllib.request, os, argparse
from datetime import datetime, timedelta
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

API_TOKEN  = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

OUTPUT_DIR = Path("output/instagram")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Dimensiones
W_SQ, H_SQ = 1080, 1080       # 1:1 carrusel
W_PT, H_PT = 1080, 1350       # 4:5 post único

# Paleta
C_BG     = (28, 25, 23)
C_CREAM  = (255, 248, 239)
C_ORANGE = (251, 146, 60)
C_GOLD   = (245, 158, 11)
C_PURPLE = (167, 139, 250)
C_DIM    = (120, 113, 108)
C_CARD   = (40, 35, 32)
C_BORDER = (60, 55, 52)
C_SS_TOP = (30, 10, 46)
C_SS_BOT = (45, 16, 80)


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


def get_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def gradient(img, top, bot):
    draw = ImageDraw.Draw(img)
    h = img.height
    for y in range(h):
        t = y / h
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        draw.line([(0, y), (img.width, y)], fill=(r, g, b))


def wrap(text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if font.getbbox(t)[2] <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def pill(draw, x, y, text, font, bg, fg, px=24, py=12):
    bb = font.getbbox(text)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pw, ph = tw + px * 2, th + py * 2
    draw.rounded_rectangle([x, y, x + pw, y + ph], radius=ph // 2, fill=bg)
    draw.text((x + px, y + py), text, font=font, fill=fg)
    return pw, ph


# ─────────────────────────────────────────────────────────────────────────────
# CARRUSEL
# ─────────────────────────────────────────────────────────────────────────────

def slide_portada(evento, locales):
    """Slide 1: portada del carrusel."""
    img = Image.new("RGB", (W_SQ, H_SQ))
    gradient(img, C_SS_TOP, C_SS_BOT)
    draw = ImageDraw.Draw(img)
    m = 64

    draw.text((m, 60), "tresycuarto", font=get_font(38, bold=True), fill=C_ORANGE)
    draw.text((m, 130), f"📍 {evento['ciudad']}", font=get_font(34), fill=C_DIM)

    # Icono central
    draw.text((W_SQ // 2 - 70, 220), "⛪", font=get_font(140), fill=C_CREAM)

    y = 430
    for line in wrap(evento["nombre"], get_font(62, bold=True), W_SQ - m * 2)[:2]:
        draw.text((m, y), line, font=get_font(62, bold=True), fill=C_CREAM)
        y += 74

    fecha = datetime.strptime(evento["fecha"], "%Y-%m-%d")
    draw.text((m, y + 20), f"📅 {fecha.strftime('%-d de %B')}", font=get_font(38), fill=C_DIM)

    draw.line([(m, 720), (W_SQ - m, 720)], fill=C_BORDER, width=2)
    draw.text((m, 745), f"Top {len(locales)} locales donde hacer tiempo", font=get_font(40, bold=True), fill=C_GOLD)
    draw.text((m, 800), "Desliza →", font=get_font(36), fill=C_PURPLE)

    return img


def slide_local(local, rank, evento):
    """Slide para un local."""
    img = Image.new("RGB", (W_SQ, H_SQ))
    gradient(img, (32, 28, 26), (20, 17, 15))
    draw = ImageDraw.Draw(img)
    m = 64

    # Header
    draw.text((m, 55), "tresycuarto", font=get_font(34, bold=True), fill=C_ORANGE)

    # Número grande de fondo
    draw.text((W_SQ - 240, 60), f"#{rank}", font=get_font(220, bold=True), fill=(45, 40, 38))

    # Nombre
    y = 280
    for line in wrap(local["nombre"], get_font(66, bold=True), W_SQ - m * 2)[:2]:
        draw.text((m, y), line, font=get_font(66, bold=True), fill=C_CREAM)
        y += 78

    # Distancia badge
    pill(draw, m, y + 16, f"📍 {local['distancia_m']}m del recorrido",
         get_font(32, bold=True), C_ORANGE, C_BG)

    # Separador
    draw.line([(m, y + 90), (W_SQ - m, y + 90)], fill=C_BORDER, width=2)

    # Info
    y2 = y + 115
    if local.get("web"):
        draw.text((m, y2), f"🌐 {local['web'][:42]}", font=get_font(32), fill=C_GOLD)
        y2 += 52
    if local.get("instagram"):
        ig = local["instagram"].replace("https://www.instagram.com/", "@").rstrip("/")
        draw.text((m, y2), f"📸 {ig[:38]}", font=get_font(32), fill=(196, 181, 253))
        y2 += 52
    if local.get("terraza"):
        draw.text((m, y2), "☀️ Tiene terraza", font=get_font(32), fill=C_GOLD)
        y2 += 52

    # Footer
    draw.line([(m, H_SQ - 130), (W_SQ - m, H_SQ - 130)], fill=C_BORDER, width=2)
    draw.text((m, H_SQ - 100), f"tresycuarto.com/locales/{evento['ciudad'].lower().replace(' ', '-')}",
              font=get_font(28), fill=C_DIM)

    return img


def slide_cta(evento, locales):
    """Último slide: CTA."""
    img = Image.new("RGB", (W_SQ, H_SQ))
    gradient(img, C_SS_TOP, (20, 17, 15))
    draw = ImageDraw.Draw(img)
    m = 64

    draw.text((m, 55), "tresycuarto", font=get_font(38, bold=True), fill=C_ORANGE)
    draw.text((W_SQ // 2 - 60, 190), "🎉", font=get_font(120), fill=C_CREAM)

    draw.text((m, 400), "Más locales,", font=get_font(62, bold=True), fill=C_CREAM)
    draw.text((m, 475), "más tardeo.", font=get_font(62, bold=True), fill=C_ORANGE)

    draw.text((m, 600), "👉 tresycuarto.com", font=get_font(50, bold=True), fill=C_GOLD)

    draw.line([(m, 720), (W_SQ - m, 720)], fill=C_BORDER, width=2)
    draw.text((m, 750), "📬 Suscríbete para recibir", font=get_font(36), fill=C_CREAM)
    draw.text((m, 800), "rutas de tardeo antes", font=get_font(36), fill=C_CREAM)
    draw.text((m, 850), "de cada evento", font=get_font(36), fill=C_CREAM)

    # Tags
    draw.text((m, 970), f"#SemanaSanta2026 #{evento['ciudad'].replace(' ','')}",
              font=get_font(30), fill=C_PURPLE)
    draw.text((m, 1015), "#tardeo #procesiones #cofradias",
              font=get_font(30), fill=C_DIM)

    return img


def generar_carrusel(evento, locales):
    """Genera el carrusel completo (portada + locales + CTA)."""
    safe = evento["id"].replace("/", "_")
    out_dir = OUTPUT_DIR / safe
    out_dir.mkdir(exist_ok=True)

    slides = []
    slides.append(("00_portada.jpg", slide_portada(evento, locales)))
    for i, local in enumerate(locales):
        slides.append((f"{i+1:02d}_{local['nombre'][:20].replace(' ','_')}.jpg",
                        slide_local(local, i + 1, evento)))
    slides.append(("99_cta.jpg", slide_cta(evento, locales)))

    paths = []
    for name, img in slides:
        path = out_dir / name
        img.save(str(path), "JPEG", quality=92)
        paths.append(str(path))

    print(f"  ✓ Carrusel: {out_dir}/ ({len(slides)} slides)")
    return paths


# ─────────────────────────────────────────────────────────────────────────────
# POST ÚNICO 4:5
# ─────────────────────────────────────────────────────────────────────────────

def generar_post_unico(evento, locales):
    """Post único 1080x1350 con resumen del evento."""
    img = Image.new("RGB", (W_PT, H_PT))
    gradient(img, C_SS_TOP, C_SS_BOT)
    draw = ImageDraw.Draw(img)
    m = 72

    # Logo
    draw.text((m, 70), "tresycuarto", font=get_font(42, bold=True), fill=C_ORANGE)

    # Emoji + nombre
    draw.text((W_PT // 2 - 70, 160), "⛪", font=get_font(130), fill=C_CREAM)

    y = 360
    for line in wrap(evento["nombre"], get_font(64, bold=True), W_PT - m * 2)[:2]:
        draw.text((m, y), line, font=get_font(64, bold=True), fill=C_CREAM)
        y += 76

    fecha = datetime.strptime(evento["fecha"], "%Y-%m-%d")
    draw.text((m, y + 10), f"📅 {fecha.strftime('%-d de %B')}  📍 {evento['ciudad']}",
              font=get_font(36), fill=C_DIM)

    # Descripción
    y2 = y + 75
    for line in wrap(evento["descripcion"][:160], get_font(32), W_PT - m * 2)[:3]:
        draw.text((m, y2), line, font=get_font(32), fill=(180, 170, 165))
        y2 += 45

    # Locales
    draw.line([(m, y2 + 30), (W_PT - m, y2 + 30)], fill=C_BORDER, width=2)
    draw.text((m, y2 + 50), f"🏠 {len(locales)} locales cercanos al recorrido:",
              font=get_font(38, bold=True), fill=C_GOLD)

    y3 = y2 + 115
    for i, local in enumerate(locales[:4]):
        draw.rounded_rectangle([m, y3, W_PT - m, y3 + 75], radius=12, fill=C_CARD)
        draw.text((m + 20, y3 + 14), f"#{i+1} {local['nombre'][:34]}",
                  font=get_font(32, bold=True), fill=C_CREAM)
        draw.text((W_PT - m - 160, y3 + 20), f"{local['distancia_m']}m",
                  font=get_font(30), fill=C_ORANGE)
        y3 += 90

    # CTA
    draw.line([(m, H_PT - 200), (W_PT - m, H_PT - 200)], fill=C_BORDER, width=2)
    draw.text((m, H_PT - 165), "👉 tresycuarto.com", font=get_font(40, bold=True), fill=C_GOLD)
    draw.text((m, H_PT - 105), f"#SemanaSanta2026 #{evento['ciudad'].replace(' ','')} #tardeo",
              font=get_font(28), fill=C_PURPLE)

    safe = evento["id"].replace("/", "_")
    path = OUTPUT_DIR / f"{safe}_post.jpg"
    img.save(str(path), "JPEG", quality=92)
    print(f"  ✓ Post único: {path}")
    return str(path)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def procesar_evento(evento_id, tipo):
    rows = d1_query("SELECT * FROM eventos_geo WHERE id = ?", [evento_id])
    if not rows:
        print(f"Evento {evento_id} no encontrado"); return
    evento = rows[0]

    locales = d1_query("""
        SELECT l.id, l.nombre, l.web, l.instagram, l.terraza, el.distancia_m
        FROM eventos_geo_locales el
        JOIN locales l ON l.id = el.local_id
        WHERE el.evento_id = ? ORDER BY el.distancia_m LIMIT 5
    """, [evento_id])

    if not locales:
        print(f"  Sin locales para {evento['nombre']}"); return

    print(f"\n📸 {evento['nombre']} ({evento['ciudad']})")
    if tipo in ("carrusel", "ambos"):
        generar_carrusel(evento, locales)
    if tipo in ("post", "ambos"):
        generar_post_unico(evento, locales)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evento", help="ID de evento")
    parser.add_argument("--todos", action="store_true")
    parser.add_argument("--dias", type=int, default=30)
    parser.add_argument("--tipo", choices=["carrusel", "post", "ambos"], default="ambos")
    args = parser.parse_args()

    if args.evento:
        procesar_evento(args.evento, args.tipo)
    elif args.todos:
        hoy = datetime.now().strftime("%Y-%m-%d")
        limite = (datetime.now() + timedelta(days=args.dias)).strftime("%Y-%m-%d")
        eventos = d1_query(
            "SELECT id, nombre FROM eventos_geo WHERE activo=1 AND fecha >= ? AND fecha <= ? ORDER BY fecha",
            [hoy, limite]
        )
        print(f"Generando imágenes para {len(eventos)} eventos...")
        for ev in eventos:
            procesar_evento(ev["id"], args.tipo)
        print(f"\nImágenes en {OUTPUT_DIR}/")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
