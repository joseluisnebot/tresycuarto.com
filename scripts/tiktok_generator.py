#!/usr/bin/env python3
"""
Genera vídeos TikTok/Reels 9:16 para eventos + locales cercanos.
Sin IA — Python + Pillow + ffmpeg.
Uso: python3 tiktok_generator.py [--evento ID] [--todos] [--dias 90]
"""
import os
import json, urllib.request, os, argparse, subprocess, tempfile, shutil, math
OLLAMA_URL    = "http://localhost:11434/api/generate"
MODEL_HASHTAG = "mistral:7b"

def generar_hashtags(evento):
    """Genera hashtags relevantes para TikTok con mistral:7b."""
    prompt = (f"Genera 5 hashtags en español para TikTok sobre este evento. "
              f"Solo hashtags, sin explicaciones, separados por espacios. Sin #SemanaSanta si no es Semana Santa.\n"
              f"Evento: {evento['nombre']}, Ciudad: {evento['ciudad']}, Tipo: {evento['tipo']}")
    payload = json.dumps({
        "model": MODEL_HASHTAG, "prompt": prompt, "stream": False,
        "options": {"temperature": 0.6, "num_predict": 60}
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            tags = json.loads(r.read()).get("response","").strip()
            # Asegura que empiecen con #
            return " ".join(
                t if t.startswith("#") else f"#{t}"
                for t in tags.split()[:5]
            )
    except Exception:
        ciudad_tag = evento["ciudad"].replace(" ","")
        return f"#{ciudad_tag} #tardeo #{evento['tipo']} #ocio #españa"
from datetime import datetime, timedelta
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

API_TOKEN  = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

OUTPUT_DIR = Path(__file__).parent.parent / "output" / "tiktok"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
FONT_TEXT  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD  = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

# Paletas por tipo de evento
PALETAS = {
    "procesion": {
        "top": (30, 10, 46), "bot": (50, 20, 80),
        "accent": (167, 139, 250), "card": (45, 30, 65),
        "border": (80, 55, 110),
    },
    "futbol": {
        "top": (5, 30, 10), "bot": (15, 55, 25),
        "accent": (74, 222, 128), "card": (15, 45, 20),
        "border": (40, 90, 50),
    },
    "concierto": {
        "top": (10, 10, 45), "bot": (20, 20, 80),
        "accent": (96, 165, 250), "card": (18, 18, 60),
        "border": (45, 45, 110),
    },
    "festival": {
        "top": (45, 15, 5), "bot": (80, 35, 10),
        "accent": (251, 146, 60), "card": (60, 25, 8),
        "border": (110, 55, 20),
    },
}
PALETA_DEFAULT = PALETAS["procesion"]

C_CREAM  = (255, 248, 239)
C_ORANGE = (251, 146, 60)
C_GOLD   = (245, 158, 11)
C_DIM    = (140, 130, 120)
C_WHITE  = (255, 255, 255)


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


def fnt(size, bold=False):
    path = FONT_BOLD if bold else FONT_TEXT
    return ImageFont.truetype(path, size)


def fnt_emoji(size):
    return ImageFont.truetype(FONT_EMOJI, size)


def gradient(img, top, bot):
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(top[0]*(1-t) + bot[0]*t)
        g = int(top[1]*(1-t) + bot[1]*t)
        b = int(top[2]*(1-t) + bot[2]*t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


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


def pill(draw, x, y, text, font, bg, fg, px=28, py=14):
    bb = font.getbbox(text)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    pw, ph = tw + px*2, th + py*2
    draw.rounded_rectangle([x, y, x+pw, y+ph], radius=ph//2, fill=bg)
    draw.text((x+px, y+py), text, font=font, fill=fg)
    return pw, ph


def card(draw, x, y, w, h, fill, radius=20):
    draw.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=fill)


def tipo_icon(tipo):
    return {"procesion": "Procesión", "futbol": "Fútbol",
            "concierto": "Concierto", "festival": "Festival"}.get(tipo, tipo.capitalize())


def latlon_to_tile(lat, lon, zoom):
    n = 2 ** zoom
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def tile_to_latlon(x, y, zoom):
    n = 2 ** zoom
    lon = x / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return lat, lon


def descargar_mapa(lat, lon, ancho=936, alto=480, zoom=17, paleta=None):
    """
    Descarga tiles OSM, los ensambla y dibuja un pin en la ubicación del local.
    Devuelve una Image PIL o None si falla.
    """
    try:
        tile_size = 256
        # Tile central
        cx, cy = latlon_to_tile(lat, lon, zoom)
        # Cuántos tiles necesitamos en cada dirección
        tiles_x = math.ceil(ancho / tile_size / 2) + 1
        tiles_y = math.ceil(alto / tile_size / 2) + 1

        # Mapa base
        mapa_w = (tiles_x * 2 + 1) * tile_size
        mapa_h = (tiles_y * 2 + 1) * tile_size
        mapa = Image.new("RGB", (mapa_w, mapa_h), (200, 200, 200))

        for dx in range(-tiles_x, tiles_x + 1):
            for dy in range(-tiles_y, tiles_y + 1):
                tx, ty = cx + dx, cy + dy
                url = f"https://tile.openstreetmap.org/{zoom}/{tx}/{ty}.png"
                req = urllib.request.Request(url)
                req.add_header("User-Agent", "tresycuarto-tiktok/1.0")
                try:
                    with urllib.request.urlopen(req, timeout=5) as r:
                        tile_img = Image.open(BytesIO(r.read())).convert("RGB")
                    px_x = (dx + tiles_x) * tile_size
                    px_y = (dy + tiles_y) * tile_size
                    mapa.paste(tile_img, (px_x, px_y))
                except Exception:
                    pass

        # Coordenadas en píxeles del punto central
        lat_top, _ = tile_to_latlon(cx, cy - tiles_y, zoom)
        lat_bot, _ = tile_to_latlon(cx, cy + tiles_y + 1, zoom)
        _, lon_left  = tile_to_latlon(cx - tiles_x, cy, zoom)
        _, lon_right = tile_to_latlon(cx + tiles_x + 1, cy, zoom)

        px = int((lon - lon_left) / (lon_right - lon_left) * mapa_w)
        py = int((lat - lat_top)  / (lat_bot  - lat_top)  * mapa_h)

        # Recortar centrado en el pin
        x0 = max(0, px - ancho // 2)
        y0 = max(0, py - alto  // 2)
        x0 = min(x0, mapa_w - ancho)
        y0 = min(y0, mapa_h - alto)
        mapa = mapa.crop((x0, y0, x0 + ancho, y0 + alto))
        px -= x0
        py -= y0

        # Overlay semitransparente de color de paleta
        if paleta:
            overlay = Image.new("RGBA", mapa.size, (*paleta["top"], 100))
            mapa = mapa.convert("RGBA")
            mapa = Image.alpha_composite(mapa, overlay).convert("RGB")

        # Dibujar pin
        draw = ImageDraw.Draw(mapa)
        r = 22
        # Sombra
        draw.ellipse([px-r+3, py-r+3, px+r+3, py+r+3], fill=(0, 0, 0, 120))
        # Círculo exterior blanco
        draw.ellipse([px-r, py-r, px+r, py+r], fill=(255, 255, 255))
        # Círculo interior acento
        ri = r - 7
        acc = paleta["accent"] if paleta else (251, 146, 60)
        draw.ellipse([px-ri, py-ri, px+ri, py+ri], fill=acc)

        return mapa

    except Exception as e:
        print(f"  [mapa error] {e}")
        return None


def render_frame(evento, locales, frame_index, paleta):
    img = Image.new("RGB", (W, H))
    gradient(img, paleta["top"], paleta["bot"])
    draw = ImageDraw.Draw(img)
    m = 64

    if frame_index == 0:
        # ── PORTADA ─────────────────────────────────────────
        fecha = datetime.strptime(evento["fecha"], "%Y-%m-%d")
        meses = ["enero","febrero","marzo","abril","mayo","junio","julio",
                 "agosto","septiembre","octubre","noviembre","diciembre"]
        fecha_es = f"{fecha.day} de {meses[fecha.month-1]}"

        # Logo
        draw.text((m, 100), "tresycuarto", font=fnt(48, bold=True), fill=C_ORANGE)

        # Tipo badge
        y = 195
        pw, ph = pill(draw, m, y, tipo_icon(evento["tipo"]).upper(),
                      fnt(32, bold=True), paleta["accent"], (15, 10, 25))

        # Ciudad
        y += ph + 28
        draw.text((m, y), evento["ciudad"], font=fnt(56, bold=True), fill=C_CREAM)
        y += 70

        # Nombre evento — muy grande
        for line in wrap(evento["nombre"], fnt(80, bold=True), W - m*2)[:3]:
            draw.text((m, y), line, font=fnt(80, bold=True), fill=C_WHITE)
            y += 96

        # Fecha — acento
        y += 20
        draw.text((m, y), fecha_es, font=fnt(50), fill=paleta["accent"])
        y += 80

        # Separador
        draw.line([(m, y), (W-m, y)], fill=paleta["border"], width=2)
        y += 48

        # Descripción
        for line in wrap(evento["descripcion"], fnt(40), W - m*2)[:5]:
            draw.text((m, y), line, font=fnt(40), fill=C_DIM)
            y += 58

        # Bloque inferior fijo
        tag_y = H - 340
        draw.line([(m, tag_y), (W-m, tag_y)], fill=paleta["border"], width=2)
        draw.text((m, tag_y + 32), "Mientras esperas...",
                  font=fnt(52, bold=True), fill=C_GOLD)
        draw.text((m, tag_y + 104), f"{len(locales)} locales cerca del recorrido",
                  font=fnt(42), fill=C_CREAM)
        draw.text((m, H - 110), "A continuacion, los mejores locales",
                  font=fnt(38, bold=True), fill=paleta["accent"])

    elif frame_index <= len(locales):
        # ── LOCAL ────────────────────────────────────────────
        local = locales[frame_index - 1]
        rank  = frame_index
        total = len(locales)

        # TOP BAR: logo + contador
        draw.text((m, 72), "tresycuarto", font=fnt(44, bold=True), fill=C_ORANGE)
        counter = f"{rank} / {total}"
        cw = fnt(38, bold=True).getbbox(counter)[2]
        draw.text((W - m - cw, 78), counter, font=fnt(38, bold=True), fill=paleta["accent"])

        # ── BLOQUE SUPERIOR: nombre + distancia ──
        y = 180
        pw_max = W - m * 2
        for line in wrap(local["nombre"], fnt(72, bold=True), pw_max)[:2]:
            draw.text((m, y), line, font=fnt(72, bold=True), fill=C_WHITE)
            y += 86
        y += 20                          # separación extra tras el nombre
        draw.text((m, y), f"{local['distancia_m']} m del recorrido",
                  font=fnt(46, bold=True), fill=paleta["accent"])
        y += 90                          # separación antes del mapa

        # ── MAPA (si hay coordenadas) ──
        mapa_h = 500
        mapa_img = None
        if local.get("lat") and local.get("lon"):
            mapa_img = descargar_mapa(float(local["lat"]), float(local["lon"]),
                                      ancho=W - m * 2, alto=mapa_h, zoom=17,
                                      paleta=paleta)
        if mapa_img:
            mapa_rounded = Image.new("RGB", mapa_img.size, paleta["card"])
            mask = Image.new("L", mapa_img.size, 0)
            ImageDraw.Draw(mask).rounded_rectangle(
                [0, 0, mapa_img.width, mapa_img.height], radius=24, fill=255)
            mapa_rounded.paste(mapa_img, mask=mask)
            img.paste(mapa_rounded, (m, y))
            y += mapa_h + 56             # separación extra tras el mapa
        else:
            card(draw, m, y, W - m * 2, mapa_h, paleta["card"])
            draw.text((m + 40, y + mapa_h // 2 - 24), "Mapa no disponible",
                      font=fnt(38), fill=C_DIM)
            y += mapa_h + 56

        # ── BLOQUE INFERIOR: info del local ──
        card_info_top = y
        card_info_h   = H - 200 - y
        if card_info_h > 60:
            card(draw, m, card_info_top, W - m * 2, card_info_h, paleta["card"])
        px = m + 44
        y += 36                          # padding interior superior
        lh = 64                          # altura entre líneas de info

        max_info_w = W - m * 2 - 88   # ancho máximo texto en el bloque info

        if local.get("terraza"):
            draw.text((px, y), "Con terraza exterior",
                      font=fnt(42, bold=True), fill=C_GOLD)
            y += lh

        if local.get("horario"):
            for line in wrap(local["horario"], fnt(36), max_info_w)[:2]:
                draw.text((px, y), line, font=fnt(36), fill=C_CREAM)
                y += 54

        if local.get("telefono"):
            draw.text((px, y), local["telefono"][:30], font=fnt(36), fill=C_CREAM)
            y += lh

        if local.get("direccion"):
            for line in wrap(local["direccion"], fnt(36), max_info_w)[:2]:
                draw.text((px, y), line, font=fnt(36), fill=C_DIM)
                y += 54

        if local.get("instagram"):
            ig = local["instagram"].replace("https://www.instagram.com/", "@").rstrip("/")
            draw.text((px, y), ig[:40], font=fnt(36), fill=(196, 181, 253))

        # ── BARRA INFERIOR: puntos de progreso ──
        prog_y = H - 110
        dot_r  = 12
        spacing = 38
        total_w = (total - 1) * spacing
        start_x = (W - total_w) // 2
        for i in range(total):
            cx_dot = start_x + i * spacing
            color = C_ORANGE if i == rank - 1 else paleta["border"]
            draw.ellipse([cx_dot - dot_r, prog_y - dot_r,
                          cx_dot + dot_r, prog_y + dot_r], fill=color)

    else:
        # ── CTA FINAL ─────────────────────────────────────────
        draw.text((m, 100), "tresycuarto", font=fnt(48, bold=True), fill=C_ORANGE)

        y = 240
        draw.text((m, y), "Descubre todos", font=fnt(86, bold=True), fill=C_WHITE)
        y += 100
        draw.text((m, y), "los locales de", font=fnt(86, bold=True), fill=C_WHITE)
        y += 100
        draw.text((m, y), evento["ciudad"],  font=fnt(86, bold=True), fill=C_ORANGE)
        y += 130

        draw.line([(m, y), (W-m, y)], fill=paleta["border"], width=2)
        y += 50

        draw.text((m, y), "tresycuarto.com",
                  font=fnt(64, bold=True), fill=C_GOLD)
        y += 90

        draw.line([(m, y), (W-m, y)], fill=paleta["border"], width=2)
        y += 50

        for line in ["Suscribete y recibe",
                     "rutas de tardeo antes",
                     "de cada evento"]:
            draw.text((m, y), line, font=fnt(44), fill=C_CREAM)
            y += 62

        y += 30
        draw.line([(m, y), (W-m, y)], fill=paleta["border"], width=2)
        y += 40

        hashtags = generar_hashtags(evento)
        for line in wrap(hashtags, fnt(36), W - m*2)[:2]:
            draw.text((m, y), line, font=fnt(36), fill=paleta["accent"])
            y += 50

    return img


AUDIO_DIR = Path(__file__).parent / "audio"

def generar_audio_ambiente(duracion_s, tipo, output_path):
    """Recorta el track Mixkit al tamaño exacto del vídeo."""
    track = AUDIO_DIR / f"{tipo}.mp3"
    if not track.exists():
        track = AUDIO_DIR / "procesion.mp3"

    result = subprocess.run([
        "ffmpeg", "-y",
        "-i", str(track),
        "-t", str(duracion_s),
        "-c:a", "aac", "-b:a", "128k",
        output_path
    ], capture_output=True)
    if result.returncode != 0:
        print(f"  [audio error] {result.stderr[-200:]}")


def generar_video_evento(evento_id):
    rows = d1_query("SELECT * FROM eventos_geo WHERE id = ?", [evento_id])
    if not rows:
        print(f"Evento {evento_id} no encontrado")
        return None
    evento = rows[0]

    locales = d1_query("""
        SELECT l.id, l.nombre, l.web, l.instagram, l.terraza, l.direccion,
               l.lat, l.lon, l.telefono, l.horario,
               el.distancia_m
        FROM eventos_geo_locales el
        JOIN locales l ON l.id = el.local_id
        WHERE el.evento_id = ?
        ORDER BY el.distancia_m LIMIT 5
    """, [evento_id])

    if not locales:
        print(f"  Sin locales para {evento['nombre']}")
        return None

    paleta = PALETAS.get(evento["tipo"], PALETA_DEFAULT)
    total_slides = 1 + len(locales) + 1  # portada + locales + CTA
    fps = 30
    secs_per_slide = 3
    frames_per_slide = fps * secs_per_slide
    duracion_total = total_slides * secs_per_slide

    print(f"  Generando: {evento['nombre']} ({evento['ciudad']}) — {total_slides} slides")

    tmpdir = tempfile.mkdtemp()
    try:
        # Generar frames PNG
        for slide_i in range(total_slides):
            img = render_frame(evento, locales, slide_i, paleta)
            img_path = f"{tmpdir}/slide_{slide_i:03d}.png"
            img.save(img_path)

        # Crear lista para ffmpeg (cada frame repetido N veces)
        list_path = f"{tmpdir}/frames.txt"
        with open(list_path, "w") as fp:
            for slide_i in range(total_slides):
                for _ in range(frames_per_slide):
                    fp.write(f"file '{tmpdir}/slide_{slide_i:03d}.png'\n")
                    fp.write(f"duration {1/fps:.6f}\n")

        # Generar audio ambiente
        audio_path = f"{tmpdir}/audio.aac"
        generar_audio_ambiente(duracion_total, evento["tipo"], audio_path)

        # Output
        safe_name = evento_id.replace("/", "_")
        output_path = OUTPUT_DIR / f"{safe_name}.mp4"

        # Ensamblar vídeo + audio
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", list_path,
            "-i", audio_path,
            "-vf", "fps=30,scale=1080:1920",
            "-c:v", "libx264", "-crf", "22", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            str(output_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  Error ffmpeg: {result.stderr[-400:]}")
            return None

        size_mb = output_path.stat().st_size / 1024 / 1024
        print(f"  OK  {output_path} ({size_mb:.1f} MB, {duracion_total}s)")
        return str(output_path)

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evento", help="ID de evento específico")
    parser.add_argument("--todos", action="store_true")
    parser.add_argument("--dias", type=int, default=90)
    args = parser.parse_args()

    if args.evento:
        generar_video_evento(args.evento)

    elif args.todos:
        hoy = datetime.now().strftime("%Y-%m-%d")
        limite = (datetime.now() + timedelta(days=args.dias)).strftime("%Y-%m-%d")
        eventos = d1_query(
            "SELECT id, nombre FROM eventos_geo WHERE activo=1 AND fecha >= ? AND fecha <= ? ORDER BY fecha",
            [hoy, limite]
        )
        print(f"Generando {len(eventos)} vídeos...")
        for ev in eventos:
            generar_video_evento(ev["id"])
        print(f"\nVídeos en {OUTPUT_DIR}/")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
