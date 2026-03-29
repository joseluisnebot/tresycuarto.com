#!/usr/bin/env python3
"""
Genera imágenes placeholder por tipo de local para tresycuarto.
Se suben a R2 y se usan cuando un local no tiene foto propia.
"""
from PIL import Image, ImageDraw
import math, os, sys

OUTPUT_DIR = "/root/tresycuarto-sync/public/placeholders"
os.makedirs(OUTPUT_DIR, exist_ok=True)

W, H = 800, 600

# Colores tresycuarto
NARANJA   = (251, 146, 60)   # #FB923C
DORADO    = (245, 158, 11)   # #F59E0B
CREMA     = (255, 248, 239)  # #FFF8EF
OSCURO    = (28, 25, 23)     # #1C1917

TIPOS = {
    "bar":        {"emoji": "🍺", "label": "Bar",       "color1": (251, 146, 60),  "color2": (245, 158, 11)},
    "pub":        {"emoji": "🎵", "label": "Pub",       "color1": (167, 139, 250), "color2": (139, 92, 246)},
    "cafe":       {"emoji": "☕", "label": "Cafetería", "color1": (180, 120, 60),  "color2": (245, 158, 11)},
    "biergarten": {"emoji": "🌿", "label": "Terraza",   "color1": (74, 180, 120),  "color2": (16, 185, 129)},
}

def gradiente(draw, w, h, color1, color2):
    for y in range(h):
        t = y / h
        r = int(color1[0] + (color2[0] - color1[0]) * t)
        g = int(color1[1] + (color2[1] - color1[1]) * t)
        b = int(color1[2] + (color2[2] - color1[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

def generar(tipo, cfg):
    img  = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    # Fondo degradado
    gradiente(draw, W, H, cfg["color1"], cfg["color2"])

    # Overlay oscuro sutil en la parte inferior
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(H // 2, H):
        alpha = int(180 * (y - H // 2) / (H // 2))
        od.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

    # Círculo central semitransparente
    draw = ImageDraw.Draw(img)
    cx, cy, r = W // 2, H // 2 - 40, 130
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 40))

    # Emoji grande — renderizar en imagen RGBA separada y pegar
    try:
        from PIL import ImageFont
        font_emoji = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
        emoji_img = Image.new("RGBA", (220, 220), (0, 0, 0, 0))
        ed = ImageDraw.Draw(emoji_img)
        ed.text((110, 110), cfg["emoji"], anchor="mm", font=font_emoji, embedded_color=True)
        ex = W // 2 - 110
        ey = H // 2 - 150
        img.paste(emoji_img.convert("RGB"), (ex, ey), emoji_img)
    except Exception as e:
        print(f"  emoji error: {e}")

    # Texto tipo
    try:
        font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
        font_brand = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except:
        font_label = ImageFont.load_default()
        font_brand = font_label

    draw.text((W // 2, H - 110), cfg["label"], anchor="mm", font=font_label, fill=(255, 255, 255))
    draw.text((W // 2, H - 55), "tresycuarto", anchor="mm", font=font_brand, fill=(255, 255, 255, 180))

    path = f"{OUTPUT_DIR}/{tipo}.jpg"
    img.save(path, "JPEG", quality=90)
    print(f"✓ {path}")
    return path

for tipo, cfg in TIPOS.items():
    generar(tipo, cfg)

print("\nPlaceholders generados en", OUTPUT_DIR)
