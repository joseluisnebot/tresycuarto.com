#!/usr/bin/env python3
"""
Generador de posts para Instagram de tresycuarto.com
Genera imagen 1080x1080 + caption con hashtags listos para publicar.

Uso:
    python3 social_generator.py --ciudad Madrid --tipo terraza
    python3 social_generator.py --ciudad Barcelona
    python3 social_generator.py --random
    python3 social_generator.py --publicar --ciudad Madrid
"""

import argparse
import json
import os
import random
import time
import urllib.request
import urllib.parse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── CONFIG ────────────────────────────────────────────────────────────────────

CF_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix")
CF_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
D1_DB_ID = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/d1/database/{D1_DB_ID}/query"

IG_ACCESS_TOKEN = os.environ.get("IG_ACCESS_TOKEN", "")
IG_USER_ID = os.environ.get("IG_USER_ID", "")

OUTPUT_DIR = Path(__file__).parent.parent / "social_posts"

# Colores marca
CREAM   = (255, 248, 239)
CREAM2  = (254, 240, 220)
PEACH   = (251, 146, 60)
GOLD    = (245, 158, 11)
TEXT    = (28, 25, 23)
GRAY    = (120, 113, 108)
LAVENDER = (167, 139, 250)
GREEN   = (5, 150, 105)
WHITE   = (255, 255, 255)

HASHTAGS = {
    "Madrid":    "#madrid #madridtardeo #tardeo #bares #terrazasmadrid #ocio #finde #madrid🇪🇸 #baresmadrid #tresycuarto",
    "Barcelona": "#barcelona #barcelonatardeo #tardeo #bares #terrazasbarcelona #ocio #finde #barcelona🇪🇸 #baresbarcelona #tresycuarto",
    "Valencia":  "#valencia #valenciatardeo #tardeo #bares #terrazasvalencia #ocio #finde #valencia🇪🇸 #baresvalencia #tresycuarto",
    "Sevilla":   "#sevilla #sevillatardeo #tardeo #bares #terrazassevilla #ocio #finde #sevilla🇪🇸 #baressevilla #tresycuarto",
    "Bilbao":    "#bilbao #bilbaotardeo #tardeo #bares #pintxos #txikiteo #ocio #finde #bilbao🇪🇸 #tresycuarto",
    "Málaga":    "#malaga #malatardeo #tardeo #bares #terrazasmalaga #ocio #finde #malaga🇪🇸 #baresmalaga #tresycuarto",
    "Zaragoza":  "#zaragoza #zaragozatardeo #tardeo #bares #eltubo #ocio #finde #zaragoza🇪🇸 #bareszaragoza #tresycuarto",
    "Murcia":    "#murcia #murciatardeo #tardeo #bares #terrazasmurcia #ocio #finde #murcia🇪🇸 #baresmurcia #tresycuarto",
}

TIPO_EMOJI = {
    "bar": "🍺",
    "cafe": "☕",
    "pub": "🍻",
    "biergarten": "🌿",
}

# ── D1 ────────────────────────────────────────────────────────────────────────

def d1_query(sql, params=None):
    payload = {"sql": sql, "params": params or []}
    req = urllib.request.Request(
        D1_URL,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {CF_API_TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]

def get_local(ciudad=None, tipo=None):
    """Obtiene un local con buena info para publicar."""
    conditions = ["(instagram IS NOT NULL OR web IS NOT NULL)", "nombre IS NOT NULL"]
    params = []

    if ciudad:
        conditions.append("ciudad = ?")
        params.append(ciudad)
    if tipo:
        conditions.append("tipo = ?")
        params.append(tipo)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT id, nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza
        FROM locales
        WHERE {where}
        ORDER BY RANDOM()
        LIMIT 1
    """
    results = d1_query(sql, params)
    return results[0] if results else None

def get_top_locales(ciudad, limit=5):
    """Obtiene los mejores locales de una ciudad (con más datos)."""
    sql = """
        SELECT id, nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza,
               (CASE WHEN instagram IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN web IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN telefono IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN direccion IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN terraza = 1 THEN 1 ELSE 0 END) as score
        FROM locales
        WHERE ciudad = ?
        ORDER BY score DESC, RANDOM()
        LIMIT ?
    """
    return d1_query(sql, [ciudad, limit])

# ── IMAGEN ────────────────────────────────────────────────────────────────────

def get_font(size, bold=False):
    paths = [
        f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'Bold' if bold else ''}.ttf",
        f"/usr/share/fonts/truetype/liberation/LiberationSans-{'Bold' if bold else 'Regular'}.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

def make_gradient(w, h, c1, c2, diagonal=False):
    img = Image.new("RGB", (w, h))
    for y in range(h):
        t = y / h
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        for x in range(w):
            img.putpixel((x, y), (r, g, b))
    return img

def draw_rounded_rect(draw, xy, radius, fill, outline=None, outline_width=2):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + radius*2, y0 + radius*2], fill=fill)
    draw.ellipse([x1 - radius*2, y0, x1, y0 + radius*2], fill=fill)
    draw.ellipse([x0, y1 - radius*2, x0 + radius*2, y1], fill=fill)
    draw.ellipse([x1 - radius*2, y1 - radius*2, x1, y1], fill=fill)

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        if draw.textlength(test, font=font) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

def generate_post_image(local, output_path):
    """Genera imagen 1080x1080 para Instagram."""
    W, H = 1080, 1080
    img = make_gradient(W, H, CREAM, CREAM2)
    draw = ImageDraw.Draw(img)

    # Círculo decorativo glow
    for r in range(300, 0, -30):
        alpha = max(0, 60 - r // 5)
        glow_color = (252, 211, 77)
        draw.ellipse([W - r - 50, -r + 100, W + r - 50, r + 100], fill=glow_color)

    # Panel central blanco
    panel_margin = 80
    panel_y = 180
    panel_h = 660
    draw_rounded_rect(draw, (panel_margin, panel_y, W - panel_margin, panel_y + panel_h), 32, WHITE)

    # Sombra suave del panel
    for i in range(8):
        shadow_alpha = 8 - i
        draw.rectangle(
            [panel_margin + i, panel_y + i, W - panel_margin - i, panel_y + panel_h - i],
            outline=(200, 180, 160)
        )

    # Emoji tipo local
    emoji = TIPO_EMOJI.get(local.get("tipo", ""), "🍹")
    font_emoji = get_font(72, bold=False)
    draw.text((panel_margin + 50, panel_y + 50), emoji, font=font_emoji, fill=TEXT)

    # Badge tipo
    tipo_text = {"bar": "Bar", "cafe": "Cafetería", "pub": "Pub", "biergarten": "Terraza"}.get(local.get("tipo", ""), "Local")
    font_badge = get_font(26, bold=True)
    bw = int(draw.textlength(tipo_text, font=font_badge)) + 28
    bx = panel_margin + 50
    by = panel_y + 140
    draw_rounded_rect(draw, (bx, by, bx + bw, by + 38), 19, CREAM2)
    draw.text((bx + 14, by + 8), tipo_text, font=font_badge, fill=PEACH)

    # Nombre del local
    font_nombre = get_font(64, bold=True)
    font_nombre_sm = get_font(52, bold=True)
    nombre = local.get("nombre", "")
    inner_w = W - panel_margin * 2 - 100

    lines = wrap_text(nombre, font_nombre, inner_w, draw)
    if len(lines) > 2:
        lines = wrap_text(nombre, font_nombre_sm, inner_w, draw)
        font_use = font_nombre_sm
    else:
        font_use = font_nombre

    y_nombre = panel_y + 200
    for line in lines[:2]:
        draw.text((panel_margin + 50, y_nombre), line, font=font_use, fill=TEXT)
        y_nombre += int(font_use.size * 1.2)

    # Ciudad
    font_ciudad = get_font(32)
    ciudad_text = f"📍 {local.get('ciudad', '')}"
    draw.text((panel_margin + 50, y_nombre + 10), ciudad_text, font=font_ciudad, fill=LAVENDER)

    # Separador
    sep_y = y_nombre + 60
    draw.line([(panel_margin + 50, sep_y), (W - panel_margin - 50, sep_y)], fill=CREAM2, width=2)

    # Info del local
    font_info = get_font(30)
    font_info_bold = get_font(30, bold=True)
    info_y = sep_y + 30
    info_x = panel_margin + 50

    if local.get("direccion"):
        draw.text((info_x, info_y), f"🗺️  {local['direccion'][:45]}", font=font_info, fill=GRAY)
        info_y += 45

    if local.get("horario"):
        draw.text((info_x, info_y), f"🕒  {local['horario'][:50]}", font=font_info, fill=GRAY)
        info_y += 45

    if local.get("instagram"):
        ig = local["instagram"].replace("@", "").replace("https://instagram.com/", "").strip("/")
        ig_clean = ig.replace("https://www.instagram.com/","").replace("https://instagram.com/","").replace("@","").strip("/").strip()
        draw.text((info_x, info_y), f"📸  @{ig_clean}", font=font_info_bold, fill=PEACH)
        info_y += 45

    if local.get("web"):
        web = local["web"].replace("https://", "").replace("http://", "").replace("www.", "").strip("/")
        draw.text((info_x, info_y), f"🌐  {web[:45]}", font=font_info, fill=GRAY)
        info_y += 45

    # Badges terraza
    if local.get("terraza"):
        badge_y = panel_y + panel_h - 80
        draw_rounded_rect(draw, (info_x, badge_y, info_x + 180, badge_y + 44), 22, (209, 250, 229))
        draw.text((info_x + 14, badge_y + 10), "☀️  Con terraza", font=get_font(24, bold=True), fill=GREEN)

    # ── HEADER ──
    font_logo = get_font(44, bold=True)
    draw.text((80, 60), "tres", font=font_logo, fill=TEXT)
    w_tres = draw.textlength("tres", font=font_logo)
    draw.text((80 + w_tres, 60), "y", font=font_logo, fill=PEACH)
    draw.text((80 + w_tres + draw.textlength("y", font=font_logo), 60), "cuarto", font=font_logo, fill=TEXT)

    # URL
    font_url = get_font(28)
    draw.text((80, 112), "tresycuarto.com", font=font_url, fill=PEACH)

    # ── FOOTER ──
    font_footer = get_font(26)
    cta = "Descubre más locales en tresycuarto.com"
    cta_w = int(draw.textlength(cta, font=font_footer))
    draw.text((W // 2 - cta_w // 2, H - 65), cta, font=font_footer, fill=GRAY)

    img.save(output_path, "PNG", optimize=True)
    return output_path


def generate_top5_image(ciudad, locales, output_path):
    """Genera imagen 1080x1080 con top 5 locales de una ciudad."""
    W, H = 1080, 1080
    img = make_gradient(W, H, CREAM, CREAM2)
    draw = ImageDraw.Draw(img)

    # Glow decorativo
    for r in range(250, 0, -25):
        draw.ellipse([-r + 200, -r + 200, r + 200, r + 200], fill=(252, 211, 77))

    # Header
    font_logo = get_font(44, bold=True)
    draw.text((80, 55), "tres", font=font_logo, fill=TEXT)
    w_tres = draw.textlength("tres", font=font_logo)
    draw.text((80 + w_tres, 55), "y", font=font_logo, fill=PEACH)
    draw.text((80 + w_tres + draw.textlength("y", font=font_logo), 55), "cuarto", font=font_logo, fill=TEXT)

    # Título
    font_h1 = get_font(68, bold=True)
    font_h2 = get_font(38)
    draw.text((80, 140), f"Top 5 tardeo", font=font_h1, fill=TEXT)
    draw.text((80, 220), f"en {ciudad} 📍", font=font_h1, fill=PEACH)
    draw.text((80, 300), "Los mejores locales según tresycuarto", font=font_h2, fill=GRAY)

    # Separador
    draw.line([(80, 360), (W - 80, 360)], fill=CREAM2, width=3)

    # Lista de locales
    font_num = get_font(42, bold=True)
    font_name = get_font(38, bold=True)
    font_detail = get_font(28)

    y = 390
    for i, local in enumerate(locales[:5], 1):
        # Número
        draw.text((80, y), f"{i}.", font=font_num, fill=PEACH)

        # Nombre
        nombre = local.get("nombre", "")[:35]
        draw.text((140, y + 2), nombre, font=font_name, fill=TEXT)

        # Detalle
        detail_parts = []
        if local.get("tipo"):
            detail_parts.append({"bar":"Bar","cafe":"Café","pub":"Pub","biergarten":"Terraza"}.get(local["tipo"], local["tipo"]))
        if local.get("terraza"):
            detail_parts.append("☀️ Terraza")
        if local.get("instagram"):
            detail_parts.append(f"📸 @{local['instagram'].replace('@','')[:20]}")

        if detail_parts:
            draw.text((140, y + 50), "  ·  ".join(detail_parts), font=font_detail, fill=GRAY)

        y += 115

    # Footer
    font_footer = get_font(28)
    cta = "Descubre más en tresycuarto.com"
    cta_w = int(draw.textlength(cta, font=font_footer))
    draw.text((W // 2 - cta_w // 2, H - 65), cta, font=font_footer, fill=GRAY)

    img.save(output_path, "PNG", optimize=True)
    return output_path


# ── CAPTION ───────────────────────────────────────────────────────────────────

def generate_caption_single(local):
    emoji = TIPO_EMOJI.get(local.get("tipo", ""), "🍹")
    ciudad = local.get("ciudad", "")
    nombre = local.get("nombre", "")
    tipo = {"bar": "bar", "cafe": "cafetería", "pub": "pub", "biergarten": "terraza"}.get(local.get("tipo", ""), "local")

    lines = [
        f"{emoji} {nombre}",
        f"",
        f"¿Buscas donde tardeear en {ciudad}? Este {tipo} es una apuesta segura 🙌",
        f"",
    ]

    if local.get("direccion"):
        lines.append(f"📍 {local['direccion']}")
    if local.get("horario"):
        lines.append(f"🕒 {local['horario']}")
    if local.get("terraza"):
        lines.append(f"☀️ Tiene terraza")
    if local.get("instagram"):
        ig = local["instagram"].replace("https://www.instagram.com/","").replace("https://instagram.com/","").replace("@","").strip("/").strip()
        lines.append(f"📸 @{ig}")

    lines += [
        f"",
        f"🔗 Más info en tresycuarto.com/locales/{local.get('id', '')}",
        f"",
        HASHTAGS.get(ciudad, "#tardeo #bares #tresycuarto"),
    ]

    return "\n".join(lines)

def generate_caption_top5(ciudad, locales):
    lines = [
        f"🏆 Top 5 lugares para tardeear en {ciudad}",
        f"",
        f"¿Tienes plan para esta tarde? Aquí van nuestros favoritos 👇",
        f"",
    ]

    for i, local in enumerate(locales[:5], 1):
        ig_raw = local.get("instagram", "")
        ig_handle = ig_raw.replace("https://www.instagram.com/","").replace("https://instagram.com/","").replace("@","").strip("/").strip()
        ig = f" (@{ig_handle})" if ig_handle else ""
        terraza = " ☀️" if local.get("terraza") else ""
        lines.append(f"{i}. {local['nombre']}{ig}{terraza}")

    lines += [
        f"",
        f"🔗 Todos los locales en tresycuarto.com/locales/{ciudad.lower()}",
        f"",
        HASHTAGS.get(ciudad, "#tardeo #bares #tresycuarto"),
    ]

    return "\n".join(lines)


# ── PUBLICAR EN INSTAGRAM ─────────────────────────────────────────────────────

def publicar_instagram(image_url, caption):
    """Publica en Instagram via Graph API."""
    if not IG_ACCESS_TOKEN or not IG_USER_ID:
        print("  ⚠️  IG_ACCESS_TOKEN o IG_USER_ID no configurados")
        return False

    # Paso 1: crear container
    url = f"https://graph.facebook.com/v25.0/{IG_USER_ID}/media"
    data = urllib.parse.urlencode({
        "image_url": image_url,
        "caption": caption,
        "access_token": IG_ACCESS_TOKEN,
    }).encode()

    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read())

    container_id = result.get("id")
    if not container_id:
        print(f"  ❌ Error creando container: {result}")
        return False

    print(f"  Container creado: {container_id}")
    time.sleep(5)

    # Paso 2: publicar
    url2 = f"https://graph.facebook.com/v25.0/{IG_USER_ID}/media_publish"
    data2 = urllib.parse.urlencode({
        "creation_id": container_id,
        "access_token": IG_ACCESS_TOKEN,
    }).encode()

    req2 = urllib.request.Request(url2, data=data2, method="POST")
    with urllib.request.urlopen(req2, timeout=30) as r:
        result2 = json.loads(r.read())

    post_id = result2.get("id")
    if post_id:
        print(f"  ✅ Publicado en Instagram: {post_id}")
        return True
    else:
        print(f"  ❌ Error publicando: {result2}")
        return False


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generador de posts para Instagram de tresycuarto")
    parser.add_argument("--ciudad", help="Ciudad (Madrid, Barcelona...)")
    parser.add_argument("--tipo", help="Tipo: bar, cafe, pub, biergarten")
    parser.add_argument("--top5", action="store_true", help="Generar post con top 5 locales")
    parser.add_argument("--random", action="store_true", help="Ciudad aleatoria")
    parser.add_argument("--publicar", action="store_true", help="Publicar en Instagram (requiere IG_ACCESS_TOKEN)")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    ciudades = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao", "Málaga", "Zaragoza", "Murcia"]
    ciudad = args.ciudad or (random.choice(ciudades) if args.random else "Madrid")

    timestamp = int(time.time())

    if args.top5:
        print(f"\n=== Top 5 tardeo en {ciudad} ===")
        locales = get_top_locales(ciudad, 5)
        if not locales:
            print("  No hay locales suficientes")
            return

        img_path = OUTPUT_DIR / f"top5_{ciudad.lower()}_{timestamp}.png"
        generate_top5_image(ciudad, locales, img_path)
        caption = generate_caption_top5(ciudad, locales)

        print(f"  Imagen: {img_path}")
        print(f"\n--- CAPTION ---\n{caption}\n")

    else:
        print(f"\n=== Post individual — {ciudad} ===")
        local = get_local(ciudad=ciudad, tipo=args.tipo)
        if not local:
            print("  No hay locales con datos suficientes")
            return

        print(f"  Local: {local['nombre']}")
        img_path = OUTPUT_DIR / f"post_{local['id'].replace('/', '_')}_{timestamp}.png"
        generate_post_image(local, img_path)
        caption = generate_caption_single(local)

        print(f"  Imagen: {img_path}")
        print(f"\n--- CAPTION ---\n{caption}\n")

    if args.publicar:
        print("  Publicando en Instagram...")
        print("  ⚠️  Para publicar necesitas subir la imagen a una URL pública primero.")
        print("  Usa Cloudflare R2 o sube manualmente la imagen.")


if __name__ == "__main__":
    main()
