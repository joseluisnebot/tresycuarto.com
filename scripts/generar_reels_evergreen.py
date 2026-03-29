#!/usr/bin/env python3
"""
Genera Reels evergreen "Top 5 [tipo] en [ciudad]" para Instagram.
Usa fotos reales de Google Places + datos de D1.

Formato: 9:16 (1080x1920), ~18s
  - Portada (3s): "TOP 5 TERRAZAS EN VALENCIA" — fondo degradado + logo
  - Slides 1-5 (2.5s c/u): foto del local de fondo + nombre + rating + precio + barrio
  - Outro (2s): "Descúbrelos en tresycuarto.com · link en bio"

Uso:
  python3 generar_reels_evergreen.py --ciudad Madrid --tipo terraza
  python3 generar_reels_evergreen.py --ciudad Vinaròs --tipo bar
  python3 generar_reels_evergreen.py --all        # genera todo el lote
  python3 generar_reels_evergreen.py --prioridad  # solo ciudades grandes + Vinaròs

Cron: manual o semanal según necesidad
"""
import json, urllib.request, os, argparse, subprocess, tempfile, shutil, asyncio, random
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import edge_tts

API_TOKEN  = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

W, H = 1080, 1920
FPS  = 30

OUTPUT_DIR  = Path(__file__).parent.parent / "output" / "evergreen"
FOTO_CACHE  = Path(__file__).parent.parent / "output" / "foto_cache"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FOTO_CACHE.mkdir(parents=True, exist_ok=True)

# Contador global de llamadas a Google Places en esta ejecución
_places_calls = 0
MAX_PLACES_CALLS = 490   # margen de seguridad bajo el límite diario de 500

FONT_BOLD   = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_TEXT   = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# Paleta tresycuarto
C_BG     = (28, 25, 23)
C_DARK   = (18, 15, 13)
C_ORANGE = (251, 146, 60)
C_GOLD   = (245, 158, 11)
C_PURPLE = (167, 139, 250)
C_CREAM  = (255, 248, 239)
C_DIM    = (120, 113, 108)
C_CARD   = (0, 0, 0, 170)   # negro semitransparente para overlay

TTS_VOICE_ES = "es-ES-XimenaNeural"  # voz española femenina — todas las ciudades
TTS_VOICE_CA = "es-ES-XimenaNeural"  # misma voz — todo en castellano

# Paleta de fondos — se elige uno al azar por reel
FONDOS = [
    ((18, 10, 48),  (55, 25, 95),   (80, 50, 120)),   # púrpura/índigo
    ((8, 30, 45),   (15, 65, 90),   (30, 70, 100)),   # azul océano
    ((45, 10, 10),  (90, 25, 15),   (100, 50, 30)),   # rojo/granate
    ((8, 35, 20),   (20, 70, 40),   (40, 80, 50)),    # verde oscuro
    ((40, 20, 5),   (85, 45, 10),   (100, 60, 20)),   # ámbar/naranja oscuro
    ((25, 8, 45),   (60, 15, 75),   (90, 40, 100)),   # magenta/violeta
]


def fondo_aleatorio():
    """Devuelve (top, bot, linea) de un gradiente aleatorio de la paleta."""
    return random.choice(FONDOS)
TTS_RATE     = "-5%"

# Ciudades donde se usa voz catalana (Comunitat Valenciana, Catalunya, Illes Balears)
CIUDADES_VOZ_CATALANA = {
    # Comunitat Valenciana
    "Vinaròs", "Valencia", "Alicante", "Castellón", "Castelló de la Plana",
    "Gandia", "Dénia", "Benidorm", "Elche", "Elx", "Torrevieja", "Alcoy",
    "Vila-real", "Sagunto", "Sagunt", "Ontinyent", "Xàtiva", "Peñíscola",
    "Benicàssim", "Benicarló", "Morella", "Requena",
    # Catalunya
    "Barcelona", "Girona", "Lleida", "Tarragona", "Reus", "Badalona",
    "Terrassa", "Sabadell", "Mataró", "Santa Coloma de Gramenet",
    "L'Hospitalet de Llobregat", "Sitges", "Figueres", "Vic", "Manresa",
    "Igualada", "Tortosa", "Cambrils", "Salou",
    # Illes Balears
    "Palma", "Palma de Mallorca", "Ibiza", "Eivissa", "Maó", "Mahón",
    "Ciutadella", "Calvià",
}


def voz_para(ciudad):
    return TTS_VOICE_CA if ciudad in CIUDADES_VOZ_CATALANA else TTS_VOICE_ES
MAX_DURACION = 89                    # segundos — límite hard de Instagram Reels (max 90s)

TIPOS_LABEL = {
    "terraza":    ("☀️", "TERRAZAS",    "Las mejores terrazas para el tardeo"),
    "bar":        ("🍺", "BARES",       "Los bares que no te puedes perder"),
    "pub":        ("🍸", "PUBS",        "Los pubs más animados de la tarde"),
    "cafe":       ("☕", "CAFETERÍAS",  "Las cafeterías perfectas para el tardeo"),
}

CIUDADES_PRIORIDAD = [
    "Vinaròs",      # primero — es donde vive Jose Luis
    "Madrid", "Barcelona", "Valencia", "Sevilla", "Málaga",
    "Bilbao", "Granada", "Zaragoza", "Murcia", "Palma",
    "San Sebastián", "Córdoba", "Alicante", "Valladolid",
]


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
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def gradient_bg(img, top, bot):
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(top[0]*(1-t) + bot[0]*t)
        g = int(top[1]*(1-t) + bot[1]*t)
        b = int(top[2]*(1-t) + bot[2]*t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


def wrap_text(text, font, max_w):
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


def descargar_foto(url):
    """
    Descarga foto de Google Places con caché local.
    - Si ya existe en caché: la carga directamente (0 llamadas API).
    - Si no existe: descarga, guarda en caché y cuenta como 1 llamada API.
    - Si se alcanza MAX_PLACES_CALLS: devuelve None sin descargar.
    """
    global _places_calls

    # Sustituir cualquier key embebida en la URL por la activa (las URLs en D1 pueden tener claves antiguas)
    import re
    new_key = os.environ["GOOGLE_PLACES_API_KEY"]
    url = re.sub(r'[&?]key=[^&]*', '', url).rstrip('?&')
    url += ('&' if '?' in url else '?') + f'key={new_key}'

    # Clave de caché: hash de la URL (sin la API key para que sea estable)
    import hashlib
    url_sin_key = url.split("&key=")[0]
    cache_key = hashlib.md5(url_sin_key.encode()).hexdigest()
    cache_path = FOTO_CACHE / f"{cache_key}.jpg"

    # Usar caché si existe
    if cache_path.exists():
        try:
            return Image.open(cache_path).convert("RGB")
        except Exception:
            cache_path.unlink(missing_ok=True)

    # Verificar límite de llamadas
    if _places_calls >= MAX_PLACES_CALLS:
        print(f"  ⛔ Límite de {MAX_PLACES_CALLS} llamadas Google Places alcanzado — usando fondo degradado")
        return None

    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "tresycuarto/1.0")
        with urllib.request.urlopen(req, timeout=10) as r:
            data = r.read()
        img = Image.open(BytesIO(data)).convert("RGB")
        # Guardar en caché
        img.save(cache_path, "JPEG", quality=85)
        _places_calls += 1
        return img
    except Exception:
        return None


def foto_a_fondo(foto, oscurecer=0.45):
    """Escala la foto para cubrir 1080x1920 y aplica oscurecimiento."""
    # Escalar para cubrir todo el frame (cover)
    ratio_w = W / foto.width
    ratio_h = H / foto.height
    ratio = max(ratio_w, ratio_h)
    new_w = int(foto.width * ratio)
    new_h = int(foto.height * ratio)
    foto = foto.resize((new_w, new_h), Image.LANCZOS)
    # Centrar y recortar
    x = (new_w - W) // 2
    y = (new_h - H) // 2
    foto = foto.crop((x, y, x + W, y + H))
    # Blur suave para que el texto sea legible
    foto = foto.filter(ImageFilter.GaussianBlur(radius=2))
    # Oscurecer
    overlay = Image.new("RGB", (W, H), (0, 0, 0))
    foto = Image.blend(foto, overlay, oscurecer)
    return foto


def estrellas(rating):
    """Convierte rating a string de estrellas."""
    if not rating:
        return ""
    llenas = int(round(rating))
    return "★" * llenas + "☆" * (5 - llenas) + f"  {rating:.1f}"


def precio_badge(price_level):
    mapa = {"INEXPENSIVE": "€", "MODERATE": "€€", "EXPENSIVE": "€€€", "VERY_EXPENSIVE": "€€€€"}
    return mapa.get(price_level or "", "")


def generar_portada(ciudad, tipo, fondo=None):
    """Slide de portada: fondo oscuro + número + tipo + ciudad + logo."""
    if fondo is None:
        fondo = fondo_aleatorio()
    top, bot, linea = fondo
    img = Image.new("RGB", (W, H), C_DARK)
    gradient_bg(img, top, bot)
    draw = ImageDraw.Draw(img)

    # Líneas decorativas diagonales sutiles
    for i in range(0, W + H, 120):
        draw.line([(0, i), (i, 0)], fill=linea, width=1)

    emoji, label, _ = TIPOS_LABEL.get(tipo, ("", tipo.upper(), ""))

    # Número grande decorativo semitransparente — compositing RGBA correcto
    overlay_num = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_num = ImageDraw.Draw(overlay_num)
    f_num = fnt(520, bold=True)
    draw_num.text((W//2, H//2 - 80), "5", font=f_num, fill=(251, 146, 60, 30),
                  anchor="mm")
    img = Image.alpha_composite(img.convert("RGBA"), overlay_num).convert("RGB")
    draw = ImageDraw.Draw(img)

    # "TOP 5"
    f_top = fnt(72, bold=True)
    draw.text((W//2, H//2 - 320), "TOP 5", font=f_top, fill=C_ORANGE, anchor="mm")

    # Tipo (TERRAZAS, BARES...)
    f_tipo = fnt(96, bold=True)
    draw.text((W//2, H//2 - 200), label, font=f_tipo, fill=C_CREAM, anchor="mm")

    # "EN"
    f_en = fnt(56)
    draw.text((W//2, H//2 - 60), "EN", font=f_en, fill=C_DIM, anchor="mm")

    # Ciudad
    f_ciudad = fnt(108, bold=True)
    ciudad_upper = ciudad.upper()
    # Ajustar tamaño si el nombre es largo
    while fnt(108, bold=True).getbbox(ciudad_upper)[2] > W - 80:
        f_ciudad = fnt(fnt(108).size - 6, bold=True)
    draw.text((W//2, H//2 + 80), ciudad_upper, font=f_ciudad, fill=C_ORANGE, anchor="mm")

    # Línea decorativa
    draw.rectangle([(W//2 - 120, H//2 + 160), (W//2 + 120, H//2 + 164)], fill=C_GOLD)

    # Subtítulo
    f_sub = fnt(44)
    _, _, sub_text = TIPOS_LABEL.get(tipo, ("", "", "Descúbrelos en tresycuarto.com"))
    draw.text((W//2, H//2 + 220), sub_text, font=f_sub, fill=C_DIM, anchor="mm")

    # Logo abajo
    f_logo = fnt(52, bold=True)
    logo_y = H - 160
    draw.text((W//2, logo_y), "tresycuarto", font=f_logo, fill=C_ORANGE, anchor="mm")
    f_dot = fnt(36)
    draw.text((W//2, logo_y + 65), "Tardeo · España", font=f_dot, fill=C_DIM, anchor="mm")

    return img


def generar_slide_local(local, posicion, total=5, tipo="bar"):
    """Slide de local: foto de fondo + overlay oscuro + datos."""
    # Fondo: foto si hay, sino degradado
    foto = None
    if local.get("photo_url"):
        foto = descargar_foto(local["photo_url"])

    if foto:
        img = foto_a_fondo(foto, oscurecer=0.5)
    else:
        img = Image.new("RGB", (W, H), C_DARK)
        gradient_bg(img, (25, 15, 10), (45, 28, 18))

    # Overlay degradado en la parte inferior para legibilidad
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    for y in range(H // 2, H):
        t = (y - H // 2) / (H // 2)
        alpha = int(200 * t)
        ov_draw.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    img = img.convert("RGBA")
    img = Image.alpha_composite(img, overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Número de posición (arriba izquierda)
    f_pos = fnt(120, bold=True)
    draw.text((72, 100), f"#{posicion}", font=f_pos, fill=C_ORANGE)

    # Contador (arriba derecha)
    f_cnt = fnt(44)
    draw.text((W - 72, 130), f"{posicion}/{total}", font=f_cnt, fill=C_DIM, anchor="ra")

    # Área de texto (zona inferior)
    text_y = H - 580

    # Nombre del local
    f_nombre = fnt(72, bold=True)
    nombre = local.get("nombre", "")
    lines = wrap_text(nombre, f_nombre, W - 120)
    for i, line in enumerate(lines[:2]):  # max 2 líneas
        draw.text((60, text_y + i * 85), line, font=f_nombre, fill=C_CREAM)
    text_y += len(lines[:2]) * 85 + 30

    # Rating + precio en la misma línea
    rating_str = estrellas(local.get("rating"))
    precio_str = precio_badge(local.get("price_level"))
    f_rating = fnt(46)
    if rating_str:
        draw.text((60, text_y), rating_str, font=f_rating, fill=C_GOLD)
        if precio_str:
            rating_w = f_rating.getbbox(rating_str)[2]
            draw.text((60 + rating_w + 30, text_y), precio_str, font=f_rating, fill=C_DIM)
    elif precio_str:
        draw.text((60, text_y), precio_str, font=f_rating, fill=C_DIM)
    text_y += 70

    # Dirección / barrio
    direccion = local.get("direccion") or ""
    if direccion:
        f_dir = fnt(40)
        dir_lines = wrap_text("• " + direccion, f_dir, W - 120)
        for line in dir_lines[:2]:
            draw.text((60, text_y), line, font=f_dir, fill=C_DIM)
            text_y += 52

    # Badge "Con terraza" si aplica
    if local.get("terraza") and tipo != "terraza":
        f_badge = fnt(36, bold=True)
        badge_text = "  CON TERRAZA  "
        bb = f_badge.getbbox(badge_text)
        bw, bh = bb[2] - bb[0] + 30, bb[3] - bb[1] + 20
        by = H - 120
        draw.rounded_rectangle([(60, by), (60 + bw, by + bh)], radius=bh//2,
                                fill=(*C_ORANGE, 220))
        draw.text((60 + 15, by + 10), badge_text, font=f_badge, fill=C_DARK)

    # Logo pequeño (esquina inf derecha)
    f_logo = fnt(36, bold=True)
    draw.text((W - 60, H - 80), "tresycuarto", font=f_logo, fill=C_ORANGE, anchor="ra")

    return img


def generar_outro(ciudad, tipo, fondo=None):
    """Slide final: CTA y link."""
    if fondo is None:
        fondo = fondo_aleatorio()
    top, bot, linea = fondo
    img = Image.new("RGB", (W, H), C_DARK)
    gradient_bg(img, bot, top)   # invertido respecto a portada para variación
    draw_pre = ImageDraw.Draw(img)
    for i in range(0, W + H, 120):
        draw_pre.line([(0, i), (i, 0)], fill=linea, width=1)
    draw = ImageDraw.Draw(img)

    # Logo grande
    f_logo = fnt(96, bold=True)
    draw.text((W//2, H//2 - 200), "tresycuarto", font=f_logo, fill=C_ORANGE, anchor="mm")

    # Línea
    draw.rectangle([(W//2 - 100, H//2 - 100), (W//2 + 100, H//2 - 96)], fill=C_GOLD)

    # Texto principal
    f_main = fnt(58, bold=True)
    draw.text((W//2, H//2), "Descubre más locales", font=f_main, fill=C_CREAM, anchor="mm")
    draw.text((W//2, H//2 + 75), f"en {ciudad}", font=f_main, fill=C_ORANGE, anchor="mm")

    # URL
    f_url = fnt(46)
    draw.text((W//2, H//2 + 200), "tresycuarto.com", font=f_url, fill=C_DIM, anchor="mm")

    # CTA link en bio
    f_cta = fnt(52, bold=True)
    draw.text((W//2, H//2 + 340), "-> Link en bio", font=f_cta, fill=C_GOLD, anchor="mm")

    # Tagline abajo
    f_tag = fnt(38)
    draw.text((W//2, H - 160), "Tardeo · España · Cada día a las 15:15", font=f_tag,
              fill=C_DIM, anchor="mm")

    return img


def frames_de_slide(slide_img, duracion_s, fps=FPS):
    """Devuelve lista de rutas de frame (cada frame = 1 fichero PNG)."""
    n_frames = int(duracion_s * fps)
    arr = []
    tmpdir = tempfile.mkdtemp()
    for i in range(n_frames):
        path = os.path.join(tmpdir, f"f{i:05d}.png")
        slide_img.save(path)
        arr.append(path)
    return tmpdir, arr


def rating_a_texto(rating):
    if not rating:
        return ""
    try:
        r = round(float(rating), 1)
    except Exception:
        return ""
    if r == 0:
        return ""
    entero = int(r)
    decimal = round((r - entero) * 10)
    nums = {0:"cero",1:"uno",2:"dos",3:"tres",4:"cuatro",5:"cinco",
            6:"seis",7:"siete",8:"ocho",9:"nueve",10:"diez"}
    entero_txt = nums.get(entero, str(entero))
    if decimal == 0:
        return f"{entero_txt} estrellas"
    return f"{entero_txt} coma {nums.get(decimal, str(decimal))} estrellas"


def precio_a_texto(price_level):
    mapa = {"INEXPENSIVE": "económico", "MODERATE": "precio moderado",
            "EXPENSIVE": "precio elevado", "VERY_EXPENSIVE": "premium"}
    return mapa.get(price_level or "", "")


def guion_slide(posicion, local):
    """Genera el texto que leerá la voz en off para un slide de local."""
    nombre = local.get("nombre", "")
    rating_txt = rating_a_texto(local.get("rating"))
    precio_txt = precio_a_texto(local.get("price_level"))

    partes = [f"Número {posicion}. {nombre}."]
    if rating_txt:
        partes.append(f"{rating_txt.capitalize()}.")
    if precio_txt:
        partes.append(f"{precio_txt.capitalize()}.")
    if local.get("terraza"):
        partes.append("Con terraza.")
    return " ".join(partes)


async def tts_segmento(texto, path, voz=TTS_VOICE_ES):
    """Genera un segmento de audio TTS y lo guarda en path."""
    tts = edge_tts.Communicate(texto, voice=voz, rate=TTS_RATE)
    await tts.save(path)


def duracion_audio(path):
    """Devuelve la duración en segundos de un fichero de audio."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except Exception:
        return 2.5


def generar_audio_reel(guiones, tmpdir, voz=TTS_VOICE_ES):
    """
    guiones: lista de textos
    Genera un MP3 por guion, ajusta duraciones, concatena en un solo MP3.
    Devuelve (audio_path, lista_duraciones_ajustadas).
    """
    segmentos = []
    duraciones = []

    for i, texto in enumerate(guiones):
        seg_path = os.path.join(tmpdir, f"seg_{i:02d}.mp3")
        asyncio.run(tts_segmento(texto, seg_path, voz=voz))
        dur = duracion_audio(seg_path) + 0.4   # pequeño buffer tras cada frase
        segmentos.append(seg_path)
        duraciones.append(dur)

    # Concatenar todos los segmentos en un solo MP3
    concat_audio = os.path.join(tmpdir, "concat.txt")
    with open(concat_audio, "w") as f:
        for seg in segmentos:
            f.write(f"file '{seg}'\n")

    audio_final = os.path.join(tmpdir, "voz.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", concat_audio, "-c:a", "libmp3lame", audio_final],
        capture_output=True
    )
    return audio_final, duraciones


def compilar_video(slides_con_duracion, output_path, audio_path=None):
    """
    slides_con_duracion: lista de (PIL.Image, duracion_en_segundos)
    Usa ffmpeg con concat demuxer para montar el vídeo final.
    """
    tmpdir = tempfile.mkdtemp()
    concat_file = os.path.join(tmpdir, "concat.txt")

    with open(concat_file, "w") as f:
        for idx, (img, dur) in enumerate(slides_con_duracion):
            frame_path = os.path.join(tmpdir, f"slide_{idx:02d}.png")
            img.save(frame_path)
            f.write(f"file '{frame_path}'\n")
            f.write(f"duration {dur}\n")
        # Repetir último frame (requerido por ffmpeg concat)
        last_path = os.path.join(tmpdir, f"slide_{len(slides_con_duracion)-1:02d}.png")
        f.write(f"file '{last_path}'\n")

    if audio_path:
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", concat_file,
            "-i", audio_path,
            "-vf", f"fps={FPS},scale={W}:{H}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-preset", "fast", "-crf", "23",
            "-shortest",
            str(output_path)
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", concat_file,
            "-vf", f"fps={FPS},scale={W}:{H}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "23",
            str(output_path)
        ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    shutil.rmtree(tmpdir)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr[-400:]}")


def ciudad_slug(ciudad):
    repl = {"á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n","à":"a","è":"e","ò":"o","ï":"i","ç":"c"}
    s = ciudad.lower()
    for k, v in repl.items():
        s = s.replace(k, v)
    return s.replace(" ", "_").replace("'", "")


def generar_reel(ciudad, tipo):
    """Genera el reel completo para ciudad+tipo. Devuelve path del MP4 o None."""
    fondo = fondo_aleatorio()   # mismo fondo para portada y outro de este reel

    emoji, label, _ = TIPOS_LABEL.get(tipo, ("📅", tipo.upper(), ""))

    # Consulta D1: top 5 locales del tipo en la ciudad con foto y rating
    if tipo == "terraza":
        sql = """SELECT nombre, tipo, direccion, photo_url, rating, price_level, terraza
                 FROM locales
                 WHERE ciudad = ? AND terraza = 1 AND photo_url IS NOT NULL AND photo_url != ''
                 ORDER BY COALESCE(rating, 0) DESC LIMIT 5"""
    else:
        sql = """SELECT nombre, tipo, direccion, photo_url, rating, price_level, terraza
                 FROM locales
                 WHERE ciudad = ? AND tipo = ? AND photo_url IS NOT NULL AND photo_url != ''
                 ORDER BY COALESCE(rating, 0) DESC LIMIT 5"""

    params = [ciudad] if tipo == "terraza" else [ciudad, tipo]
    locales = d1_query(sql, params)

    if len(locales) < 3:
        print(f"  ⚠ {ciudad} / {tipo}: solo {len(locales)} locales con foto — saltando")
        return None

    print(f"  → {ciudad} / {label}: {len(locales)} locales encontrados")

    # Construir guiones de voz en off
    _, label_lower_str, subtitulo = TIPOS_LABEL.get(tipo, ("", tipo, ""))
    guiones = [
        f"Top 5 {label_lower_str.lower()} en {ciudad}. {subtitulo}.",
        *[guion_slide(i + 1, local) for i, local in enumerate(locales)],
        f"Descubre más locales de {ciudad} en tresycuarto.com. Pulsa el link en bio.",
    ]

    # Generar audio TTS y obtener duraciones ajustadas por segmento
    print(f"  🎙 Generando voz en off ({len(guiones)} segmentos)...")
    tmpdir_audio = tempfile.mkdtemp()
    try:
        audio_path, dur_por_segmento = generar_audio_reel(guiones, tmpdir_audio, voz=voz_para(ciudad))
    except Exception as e:
        print(f"  ⚠ TTS falló ({e}), generando sin audio")
        audio_path = None
        dur_por_segmento = [3.0] + [2.5] * len(locales) + [2.5]

    # Construir slides con duración ajustada a la voz
    MIN_DUR = 2.0
    slides = []

    portada = generar_portada(ciudad, tipo, fondo=fondo)
    slides.append((portada, max(dur_por_segmento[0], MIN_DUR)))

    for i, local in enumerate(locales):
        slide = generar_slide_local(local, i + 1, len(locales), tipo=tipo)
        slides.append((slide, max(dur_por_segmento[i + 1], MIN_DUR)))
        print(f"     #{i+1} {local['nombre']} ★{local.get('rating') or '-'}")

    outro = generar_outro(ciudad, tipo, fondo=fondo)
    slides.append((outro, max(dur_por_segmento[-1], MIN_DUR)))

    # Verificar que la duración total no supera el límite de Instagram (90s)
    total = sum(d for _, d in slides)
    if total > MAX_DURACION:
        factor = MAX_DURACION / total
        slides = [(img, round(d * factor, 2)) for img, d in slides]
        total_ajustado = sum(d for _, d in slides)
        print(f"  ⚠ Duración ajustada: {total:.1f}s → {total_ajustado:.1f}s (límite {MAX_DURACION}s)")
    else:
        print(f"  ⏱ Duración total: {total:.1f}s")

    # Compilar vídeo + audio
    slug = ciudad_slug(ciudad)
    filename = f"evergreen_{slug}_{tipo}.mp4"
    output_path = OUTPUT_DIR / filename

    print(f"  ⚙ Compilando {filename}...")
    compilar_video(slides, output_path, audio_path=audio_path)
    shutil.rmtree(tmpdir_audio, ignore_errors=True)
    print(f"  ✅ {filename} ({output_path.stat().st_size // 1024} KB)")
    return filename


def caption_para(ciudad, tipo):
    emoji, label, _ = TIPOS_LABEL.get(tipo, ("📅", tipo.upper(), ""))
    label_lower = label.lower()
    ciudad_tag = ciudad.replace(" ", "").replace("ó","o").replace("á","a").replace("é","e").replace("í","i").replace("ú","u").replace("ñ","n").replace("à","a").replace("è","e").replace("ï","i").replace("ç","c")
    return (
        f"{emoji} TOP 5 {label} en {ciudad} — ¿cuál es tu favorito? 👇\n\n"
        f"🔗 Descubre todos los locales de {ciudad} · link en bio\n\n"
        f"#tardeo #{ciudad_tag} #{label_lower.replace('é','e').replace('á','a')} "
        f"#ocio #tresycuarto #planesdetarde #españa"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ciudad", help="Ciudad concreta")
    parser.add_argument("--tipo", choices=list(TIPOS_LABEL.keys()), default="terraza")
    parser.add_argument("--prioridad", action="store_true",
                        help="Genera para ciudades prioritarias (grandes + Vinaròs)")
    parser.add_argument("--all", action="store_true", help="Genera para todas las ciudades")
    args = parser.parse_args()

    if args.ciudad:
        ciudades = [args.ciudad]
        tipos = [args.tipo]
    elif args.prioridad:
        ciudades = CIUDADES_PRIORIDAD
        tipos = list(TIPOS_LABEL.keys())
    elif args.all:
        rows = d1_query("SELECT DISTINCT ciudad FROM locales ORDER BY ciudad")
        ciudades = [r["ciudad"] for r in rows]
        tipos = list(TIPOS_LABEL.keys())
    else:
        parser.print_help()
        return

    generados = []
    for ciudad in ciudades:
        for tipo in tipos:
            print(f"\n[{ciudad} — {tipo.upper()}]")
            try:
                filename = generar_reel(ciudad, tipo)
                if filename:
                    generados.append({
                        "file": filename,
                        "caption": caption_para(ciudad, tipo)
                    })
            except Exception as e:
                print(f"  ✗ Error: {e}")

    print(f"\n{'='*50}")
    print(f"Generados: {len(generados)} reels en {OUTPUT_DIR}")
    print(f"Llamadas Google Places esta ejecución: {_places_calls} / {MAX_PLACES_CALLS}")
    cache_size = sum(f.stat().st_size for f in FOTO_CACHE.glob("*.jpg"))
    print(f"Fotos en caché local: {len(list(FOTO_CACHE.glob('*.jpg')))} ({cache_size//1024//1024} MB)")

    if generados:
        subidos = subir_y_encolar(generados)
        print(f"\n{subidos}/{len(generados)} reels subidos a R2 y encolados para Instagram.")


def subir_y_encolar(generados):
    """Sube cada reel a R2 y lo añade a instagram_queue.json."""
    import subprocess, json as _json
    QUEUE_FILE = Path("/root/scripts/instagram_queue.json")
    CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")

    try:
        data = _json.loads(QUEUE_FILE.read_text())
    except Exception:
        data = {"pending": []}
    existing = {item["filename"] for item in data.get("pending", [])}

    subidos = 0
    for g in generados:
        filename = g["file"]
        r2_key   = f"evergreen/{filename}"
        local    = OUTPUT_DIR / filename

        if not local.exists():
            print(f"  SKIP (no existe): {filename}")
            continue

        if r2_key in existing:
            print(f"  SKIP (ya encolado): {r2_key}")
            subidos += 1
            continue

        env = {**os.environ, "CLOUDFLARE_API_TOKEN": CF_TOKEN, "CLOUDFLARE_ACCOUNT_ID": CF_ACCOUNT}
        result = subprocess.run(
            ["npx", "wrangler", "r2", "object", "put",
             f"tresycuarto-media/{r2_key}",
             "--file", str(local),
             "--content-type", "video/mp4",
             "--remote"],
            capture_output=True, text=True, timeout=120, env=env
        )
        if result.returncode != 0:
            print(f"  ERROR subiendo {filename}: {result.stderr[-200:]}")
            continue

        video_url = f"https://media.tresycuarto.com/{r2_key}"
        data["pending"].append({"filename": r2_key, "url": video_url, "caption": g["caption"]})
        QUEUE_FILE.write_text(_json.dumps(data, indent=2, ensure_ascii=False))
        existing.add(r2_key)
        print(f"  ✓ Subido y encolado: {r2_key}")
        subidos += 1

    return subidos


if __name__ == "__main__":
    main()
