#!/usr/bin/env python3
"""
generar_reels_eventos.py
Genera Reels de eventos próximos + bares más cercanos.

Formato 9:16 (1080x1920):
  - Portada evento (fondo random paleta + nombre + fecha)
  - Slide descripción (texto leído por Ximena)
  - Slides bares cercanos 1-5 (foto + nombre + rating)
  - Outro CTA

Filtrado de descripciones:
  1. Reglas rápidas: HTML, longitud, repetición, URLs
  2. Ollama local (llama3.2) para casos ambiguos (80-200 chars)

Uso:
  python3 generar_reels_eventos.py               # eventos con fecha_envio = hoy
  python3 generar_reels_eventos.py --dias 3      # próximos 3 días
  python3 generar_reels_eventos.py --ciudad Sevilla
  python3 generar_reels_eventos.py --evento ID   # evento concreto por ID
"""
import json, urllib.request, os, argparse, subprocess, tempfile, shutil, asyncio, random, re
from pathlib import Path
from datetime import datetime, timedelta
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import edge_tts

API_TOKEN  = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

W, H = 1080, 1920
FPS  = 30

OUTPUT_DIR = Path(__file__).parent.parent / "output" / "eventos"
FOTO_CACHE = Path(__file__).parent.parent / "output" / "foto_cache"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FOTO_CACHE.mkdir(parents=True, exist_ok=True)

_places_calls = 0
MAX_PLACES_CALLS = 490

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_TEXT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

C_BG     = (28, 25, 23)
C_DARK   = (18, 15, 13)
C_ORANGE = (251, 146, 60)
C_GOLD   = (245, 158, 11)
C_PURPLE = (167, 139, 250)
C_CREAM  = (255, 248, 239)
C_DIM    = (120, 113, 108)

TTS_VOICE = "es-ES-XimenaNeural"
TTS_RATE  = "-5%"
MAX_DURACION = 89

FONDOS = [
    ((18, 10, 48),  (55, 25, 95),   (80, 50, 120)),
    ((8, 30, 45),   (15, 65, 90),   (30, 70, 100)),
    ((45, 10, 10),  (90, 25, 15),   (100, 50, 30)),
    ((8, 35, 20),   (20, 70, 40),   (40, 80, 50)),
    ((40, 20, 5),   (85, 45, 10),   (100, 60, 20)),
    ((25, 8, 45),   (60, 15, 75),   (90, 40, 100)),
]

TIPO_ICON = {
    "procesion": "Procesion",
    "futbol": "Futbol",
    "concierto": "Concierto",
    "festival": "Festival",
    "feria": "Feria",
    "deporte": "Deporte",
    "escena": "Teatro",
    "mercado": "Mercado",
}

MESES = ["enero","febrero","marzo","abril","mayo","junio",
         "julio","agosto","septiembre","octubre","noviembre","diciembre"]


# ── D1 ────────────────────────────────────────────────────────────────────────

def d1_query(sql, params=None):
    body = {"sql": sql}
    if params:
        body["params"] = params
    payload = json.dumps(body).encode()
    req = urllib.request.Request(API_URL, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {API_TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    if not data.get("success"):
        raise RuntimeError(data.get("errors"))
    return data["result"][0]["results"]


# ── Filtrado de descripciones ─────────────────────────────────────────────────

def limpiar_descripcion(texto):
    """Elimina HTML y normaliza espacios."""
    if not texto:
        return ""
    texto = re.sub(r'<[^>]+>', ' ', texto)
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto


def descripcion_reglas(texto, nombre_evento):
    """
    Filtra descripciones claramente inválidas.
    Devuelve (ok: bool, motivo: str)
    """
    if not texto or len(texto) < 60:
        return False, "demasiado corta"
    if re.search(r'https?://', texto):
        return False, "contiene URL"
    if re.search(r'[A-Z]{5,}', texto):
        mayus = sum(1 for c in texto if c.isupper())
        if mayus / len(texto) > 0.5:
            return False, "demasiadas mayusculas"
    # repetición del nombre del evento
    nombre_corto = nombre_evento[:20].lower()
    if texto.lower().strip().startswith(nombre_corto):
        resto = texto[len(nombre_corto):].strip()
        if len(resto) < 30:
            return False, "es repeticion del nombre"
    return True, "ok"


def descripcion_ollama(texto):
    """
    Consulta Ollama local para validar la descripción.
    Solo se llama para textos de 40-200 chars (zona gris).
    Devuelve True si es válida.
    """
    try:
        prompt = (
            f'¿Esta descripción de un evento público es comprensible y adecuada '
            f'para leerla en voz alta en un vídeo de redes sociales? '
            f'Responde SOLO con SI o NO.\n\nDescripción: "{texto}"'
        )
        payload = json.dumps({
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0, "num_predict": 5}
        }).encode()
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=payload, method="POST"
        )
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=15) as r:
            resp = json.loads(r.read())
        respuesta = resp.get("response", "").strip().upper()
        return "SI" in respuesta or "SÍ" in respuesta
    except Exception as e:
        print(f"    Ollama no disponible ({e}) — asumiendo descripción válida")
        return True


def validar_descripcion(texto_raw, nombre_evento):
    """
    Pipeline completo de validación:
    1. Limpia HTML
    2. Reglas rápidas
    3. Ollama para zona gris (40-200 chars)
    Devuelve (texto_limpio, es_valida)
    """
    texto = limpiar_descripcion(texto_raw)
    ok, motivo = descripcion_reglas(texto, nombre_evento)
    if not ok:
        return texto, False, motivo

    # Zona gris: texto corto-medio → Ollama (solo entre 60-250 chars)
    if 60 <= len(texto) < 250:
        valida = descripcion_ollama(texto)
        if not valida:
            return texto, False, "ollama: no apta"

    return texto, True, "ok"


# ── Bares cercanos ────────────────────────────────────────────────────────────

def bares_cercanos(ciudad, lat, lon, n=5):
    """
    Devuelve hasta n locales con foto más cercanos al evento.
    Busca primero en la misma ciudad, luego sin filtro de ciudad si no hay suficientes.
    """
    lat, lon = float(lat), float(lon)
    rows = d1_query(
        """SELECT nombre, tipo, direccion, photo_url, rating, price_level,
                  lat, lon, outdoor_seating,
                  ((lat - ?) * (lat - ?) + (lon - ?) * (lon - ?)) as dist
           FROM locales
           WHERE ciudad = ? AND lat IS NOT NULL AND photo_url IS NOT NULL AND photo_url != ''
           ORDER BY dist ASC LIMIT ?""",
        [lat, lat, lon, lon, ciudad, n]
    )
    if len(rows) < 3:
        # Fallback: buscar por proximidad global (sin filtro ciudad)
        rows_global = d1_query(
            """SELECT nombre, tipo, direccion, photo_url, rating, price_level,
                      lat, lon, outdoor_seating,
                      ((lat - ?) * (lat - ?) + (lon - ?) * (lon - ?)) as dist
               FROM locales
               WHERE lat IS NOT NULL AND photo_url IS NOT NULL AND photo_url != ''
               ORDER BY dist ASC LIMIT ?""",
            [lat, lat, lon, lon, n]
        )
        # Solo usar fallback si los locales están realmente cerca (~5km)
        # 0.0025 grados ≈ 278m, por lo que 0.002 ≈ threshold razonable
        rows_global = [r for r in rows_global if r["dist"] < 0.002]
        if len(rows_global) >= len(rows):
            rows = rows_global
    return rows


# ── Fonts y utilidades visuales ───────────────────────────────────────────────

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
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


def lineas_diagonales(img, color):
    draw = ImageDraw.Draw(img)
    for i in range(0, W + H, 120):
        draw.line([(0, i), (i, 0)], fill=color, width=1)


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
    global _places_calls
    import hashlib
    new_key = os.environ["GOOGLE_PLACES_API_KEY"]
    url = re.sub(r'[&?]key=[^&]*', '', url).rstrip('?&')
    url += ('&' if '?' in url else '?') + f'key={new_key}'

    url_sin_key = url.split("&key=")[0]
    cache_key = hashlib.md5(url_sin_key.encode()).hexdigest()
    cache_path = FOTO_CACHE / f"{cache_key}.jpg"

    if cache_path.exists():
        try:
            return Image.open(cache_path).convert("RGB")
        except Exception:
            cache_path.unlink(missing_ok=True)

    if _places_calls >= MAX_PLACES_CALLS:
        return None
    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "tresycuarto/1.0")
        with urllib.request.urlopen(req, timeout=10) as r:
            data = r.read()
        img = Image.open(BytesIO(data)).convert("RGB")
        img.save(cache_path, "JPEG", quality=85)
        _places_calls += 1
        return img
    except Exception:
        return None


def foto_a_fondo(foto, oscurecer=0.5):
    ratio = max(W / foto.width, H / foto.height)
    new_w, new_h = int(foto.width * ratio), int(foto.height * ratio)
    foto = foto.resize((new_w, new_h), Image.LANCZOS)
    x, y = (new_w - W) // 2, (new_h - H) // 2
    foto = foto.crop((x, y, x + W, y + H))
    foto = foto.filter(ImageFilter.GaussianBlur(radius=2))
    overlay = Image.new("RGB", (W, H), (0, 0, 0))
    return Image.blend(foto, overlay, oscurecer)


def estrellas(rating):
    if not rating:
        return ""
    llenas = int(round(float(rating)))
    return "★" * llenas + "☆" * (5 - llenas) + f"  {float(rating):.1f}"


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


def ciudad_slug(ciudad):
    s = ciudad.lower()
    for a, b in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ñ","n"),
                 ("à","a"),("è","e"),("ï","i"),("ç","c"),("ò","o"),(" ","_"),("'","")]:
        s = s.replace(a, b)
    return s


# ── Slides ────────────────────────────────────────────────────────────────────

def generar_portada_evento(evento, fondo):
    top, bot, linea = fondo
    img = Image.new("RGB", (W, H), C_DARK)
    gradient_bg(img, top, bot)
    lineas_diagonales(img, linea)
    draw = ImageDraw.Draw(img)

    fecha = datetime.strptime(evento["fecha"], "%Y-%m-%d")
    fecha_es = f"{fecha.day} de {MESES[fecha.month - 1]}"
    tipo_txt = TIPO_ICON.get(evento.get("tipo", ""), "Evento").upper()

    # Etiqueta tipo + fecha
    f_tag = fnt(44, bold=True)
    tag = f"{tipo_txt}  •  {fecha_es}"
    draw.text((W // 2, H // 2 - 340), tag, font=f_tag, fill=C_ORANGE, anchor="mm")

    # Línea decorativa
    draw.rectangle([(W // 2 - 140, H // 2 - 290), (W // 2 + 140, H // 2 - 286)], fill=C_GOLD)

    # Nombre del evento (hasta 3 líneas)
    f_nombre = fnt(88, bold=True)
    while fnt(88, bold=True).getbbox(evento["nombre"])[2] > W - 80 and 88 > 52:
        f_nombre = fnt(f_nombre.size - 4, bold=True)
    lines = wrap_text(evento["nombre"].upper(), f_nombre, W - 80)
    total_h = len(lines[:3]) * (f_nombre.size + 12)
    y0 = H // 2 - total_h // 2 - 80
    for line in lines[:3]:
        draw.text((W // 2, y0), line, font=f_nombre, fill=C_CREAM, anchor="mm")
        y0 += f_nombre.size + 12

    # Ciudad
    f_ciudad = fnt(56)
    draw.text((W // 2, H // 2 + 220), evento["ciudad"].upper(), font=f_ciudad, fill=C_DIM, anchor="mm")

    # Logo
    f_logo = fnt(48, bold=True)
    draw.text((W // 2, H - 160), "tresycuarto", font=f_logo, fill=C_ORANGE, anchor="mm")

    return img


def generar_slide_descripcion(descripcion, fondo):
    top, bot, linea = fondo
    img = Image.new("RGB", (W, H), C_DARK)
    gradient_bg(img, bot, top)  # invertido
    lineas_diagonales(img, linea)

    # Overlay para mejorar legibilidad
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 80))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Cabecera
    f_label = fnt(40, bold=True)
    draw.text((W // 2, 180), "SOBRE EL EVENTO", font=f_label, fill=C_ORANGE, anchor="mm")
    draw.rectangle([(W // 2 - 100, 215), (W // 2 + 100, 219)], fill=C_GOLD)

    # Texto descripción
    f_desc = fnt(54)
    lines = wrap_text(descripcion, f_desc, W - 120)
    max_lines = 9
    y = H // 2 - (min(len(lines), max_lines) * 68) // 2
    for line in lines[:max_lines]:
        draw.text((60, y), line, font=f_desc, fill=C_CREAM)
        y += 68

    # Logo
    f_logo = fnt(40, bold=True)
    draw.text((W // 2, H - 160), "tresycuarto", font=f_logo, fill=C_ORANGE, anchor="mm")

    return img


def generar_slide_bar(local, posicion, total):
    foto = None
    if local.get("photo_url"):
        foto = descargar_foto(local["photo_url"])

    if foto:
        img = foto_a_fondo(foto, oscurecer=0.5)
    else:
        img = Image.new("RGB", (W, H), C_DARK)
        gradient_bg(img, (25, 15, 10), (45, 28, 18))

    # Overlay inferior
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    for y in range(H // 2, H):
        t = (y - H // 2) / (H // 2)
        ov_draw.line([(0, y), (W, y)], fill=(0, 0, 0, int(200 * t)))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Cabecera "Bares cercanos"
    f_cab = fnt(36, bold=True)
    draw.text((W // 2, 80), "BARES CERCANOS", font=f_cab, fill=C_ORANGE, anchor="mm")

    # Número
    f_pos = fnt(110, bold=True)
    draw.text((72, 120), f"#{posicion}", font=f_pos, fill=C_ORANGE)
    f_cnt = fnt(42)
    draw.text((W - 72, 155), f"{posicion}/{total}", font=f_cnt, fill=C_DIM, anchor="ra")

    text_y = H - 560

    # Nombre
    f_nombre = fnt(70, bold=True)
    lines = wrap_text(local.get("nombre", ""), f_nombre, W - 120)
    for line in lines[:2]:
        draw.text((60, text_y), line, font=f_nombre, fill=C_CREAM)
        text_y += 80
    text_y += 20

    # Rating + precio
    rating_str = estrellas(local.get("rating"))
    precio_str = {"INEXPENSIVE": "€", "MODERATE": "€€", "EXPENSIVE": "€€€",
                  "VERY_EXPENSIVE": "€€€€"}.get(local.get("price_level") or "", "")
    f_rating = fnt(44)
    if rating_str:
        draw.text((60, text_y), rating_str, font=f_rating, fill=C_GOLD)
        if precio_str:
            rw = f_rating.getbbox(rating_str)[2]
            draw.text((60 + rw + 24, text_y), precio_str, font=f_rating, fill=C_DIM)
    elif precio_str:
        draw.text((60, text_y), precio_str, font=f_rating, fill=C_DIM)
    text_y += 64

    # Dirección
    if local.get("direccion"):
        f_dir = fnt(38)
        dir_lines = wrap_text("• " + local["direccion"], f_dir, W - 120)
        for line in dir_lines[:2]:
            draw.text((60, text_y), line, font=f_dir, fill=C_DIM)
            text_y += 50

    # Logo
    f_logo = fnt(34, bold=True)
    draw.text((W - 60, H - 80), "tresycuarto", font=f_logo, fill=C_ORANGE, anchor="ra")

    return img


def generar_outro_evento(ciudad, fondo):
    top, bot, linea = fondo
    img = Image.new("RGB", (W, H), C_DARK)
    gradient_bg(img, top, bot)
    lineas_diagonales(img, linea)
    draw = ImageDraw.Draw(img)

    f_logo = fnt(96, bold=True)
    draw.text((W // 2, H // 2 - 200), "tresycuarto", font=f_logo, fill=C_ORANGE, anchor="mm")
    draw.rectangle([(W // 2 - 100, H // 2 - 100), (W // 2 + 100, H // 2 - 96)], fill=C_GOLD)

    f_main = fnt(56, bold=True)
    draw.text((W // 2, H // 2), "Descubre mas locales", font=f_main, fill=C_CREAM, anchor="mm")
    draw.text((W // 2, H // 2 + 72), f"en {ciudad}", font=f_main, fill=C_ORANGE, anchor="mm")

    f_url = fnt(44)
    draw.text((W // 2, H // 2 + 200), "tresycuarto.com", font=f_url, fill=C_DIM, anchor="mm")

    f_cta = fnt(50, bold=True)
    draw.text((W // 2, H // 2 + 340), "-> Link en bio", font=f_cta, fill=C_GOLD, anchor="mm")

    f_tag = fnt(36)
    draw.text((W // 2, H - 160), "Tardeo · Espana · Cada dia a las 15:15",
              font=f_tag, fill=C_DIM, anchor="mm")

    return img


# ── TTS + video ───────────────────────────────────────────────────────────────

async def tts_segmento(texto, path):
    tts = edge_tts.Communicate(texto, voice=TTS_VOICE, rate=TTS_RATE)
    await tts.save(path)


def duracion_audio(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except Exception:
        return 2.5


def generar_audio_reel(guiones, tmpdir):
    segmentos, duraciones = [], []
    for i, texto in enumerate(guiones):
        seg_path = os.path.join(tmpdir, f"seg_{i:02d}.mp3")
        asyncio.run(tts_segmento(texto, seg_path))
        dur = duracion_audio(seg_path) + 0.4
        segmentos.append(seg_path)
        duraciones.append(dur)

    concat_txt = os.path.join(tmpdir, "concat.txt")
    with open(concat_txt, "w") as f:
        for seg in segmentos:
            f.write(f"file '{seg}'\n")

    audio_final = os.path.join(tmpdir, "voz.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", concat_txt, "-c:a", "libmp3lame", audio_final],
        capture_output=True
    )
    return audio_final, duraciones


def compilar_video(slides_con_duracion, output_path, audio_path=None):
    tmpdir = tempfile.mkdtemp()
    try:
        concat_lines = []
        frame_dirs = []
        for idx, (slide_img, duracion) in enumerate(slides_con_duracion):
            n_frames = max(1, int(duracion * FPS))
            frame_path = os.path.join(tmpdir, f"slide_{idx:03d}.png")
            slide_img.save(frame_path)
            concat_lines.append(f"file '{frame_path}'\nduration {duracion:.3f}")
            frame_dirs.append(frame_path)

        concat_txt = os.path.join(tmpdir, "concat.txt")
        with open(concat_txt, "w") as f:
            f.write("\n".join(concat_lines))
            if concat_lines:
                last = concat_lines[-1].split("\n")[0]
                f.write(f"\n{last}")

        if audio_path and os.path.exists(audio_path):
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt,
                "-i", audio_path,
                "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2",
                "-r", str(FPS), "-c:v", "libx264", "-preset", "fast",
                "-crf", "23", "-c:a", "aac", "-b:a", "128k",
                "-shortest", "-pix_fmt", "yuv420p", str(output_path)
            ], capture_output=True)
        else:
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt,
                "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2",
                "-r", str(FPS), "-c:v", "libx264", "-preset", "fast",
                "-crf", "23", "-pix_fmt", "yuv420p", str(output_path)
            ], capture_output=True)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ── Generador principal ───────────────────────────────────────────────────────

def generar_reel_evento(evento):
    nombre   = evento["nombre"]
    ciudad   = evento["ciudad"]
    fecha    = evento["fecha"]
    lat      = evento.get("lat")
    lon      = evento.get("lon")
    ev_id    = evento["id"]

    print(f"  [{ciudad}] {nombre[:50]} ({fecha})")

    # Validar descripción
    desc_raw = evento.get("descripcion") or ""
    desc_limpia, desc_ok, motivo = validar_descripcion(desc_raw, nombre)
    if not desc_ok:
        print(f"    Descripcion descartada: {motivo}")
    else:
        print(f"    Descripcion OK ({len(desc_limpia)} chars)")

    # Bares cercanos
    bares = []
    if lat and lon:
        bares = bares_cercanos(ciudad, lat, lon)
        print(f"    {len(bares)} bares cercanos con foto")
    else:
        print(f"    Sin coordenadas — sin bares cercanos")

    if len(bares) == 0 and not desc_ok:
        print(f"    Saltando: sin descripcion ni bares cercanos")
        return None

    fondo = random.choice(FONDOS)

    # ── Guiones TTS ──────────────────────────────────────────────────────
    fecha_dt = datetime.strptime(fecha, "%Y-%m-%d")
    fecha_es = f"{fecha_dt.day} de {MESES[fecha_dt.month - 1]}"
    tipo_txt = TIPO_ICON.get(evento.get("tipo", ""), "Evento").lower()

    guiones = []

    # Guion portada
    guiones.append(f"{tipo_txt.capitalize()} en {ciudad}. {nombre}. El {fecha_es}.")

    # Guion descripción
    if desc_ok:
        guiones.append(desc_limpia[:300])
    else:
        guiones.append(f"Un plan imprescindible en {ciudad} el {fecha_es}. No te lo pierdas.")

    # Guion intro bares
    if bares:
        guiones.append(f"Y estos son los bares más cercanos para el antes o el después.")

    # Guion cada bar
    for i, bar in enumerate(bares):
        rating_txt = rating_a_texto(bar.get("rating"))
        partes = [f"Número {i+1}. {bar['nombre']}."]
        if rating_txt:
            partes.append(f"{rating_txt.capitalize()}.")
        guiones.append(" ".join(partes))

    # Guion outro
    guiones.append(f"Descubre más locales de {ciudad} en tresycuarto.com. Pulsa el link en bio.")

    # ── Audio TTS ─────────────────────────────────────────────────────────
    print(f"    Generando voz ({len(guiones)} segmentos)...")
    tmpdir_audio = tempfile.mkdtemp()
    try:
        audio_path, duraciones = generar_audio_reel(guiones, tmpdir_audio)
    except Exception as e:
        print(f"    TTS fallo ({e}) — sin audio")
        audio_path = None
        duraciones = [3.0, 4.0] + ([3.0] if bares else []) + [2.5] * len(bares) + [3.0]

    MIN_DUR = 2.0
    slides = []
    g = 0  # índice guion

    # Portada
    portada = generar_portada_evento(evento, fondo)
    slides.append((portada, max(duraciones[g], MIN_DUR)))
    g += 1

    # Descripción
    slide_desc = generar_slide_descripcion(
        desc_limpia if desc_ok else f"Un plan imprescindible en {ciudad}.",
        fondo
    )
    slides.append((slide_desc, max(duraciones[g], MIN_DUR)))
    g += 1

    # Intro bares (audio sin slide — se funde en el primer bar slide)
    dur_intro_bares = 0
    if bares:
        dur_intro_bares = duraciones[g]
        g += 1

    # Slides de bares
    for i, bar in enumerate(bares):
        slide = generar_slide_bar(bar, i + 1, len(bares))
        dur = duraciones[g] + (dur_intro_bares if i == 0 else 0)
        slides.append((slide, max(dur, MIN_DUR)))
        g += 1
        print(f"      #{i+1} {bar['nombre'][:35]} ★{bar.get('rating') or '-'}")

    # Outro
    outro = generar_outro_evento(ciudad, fondo)
    slides.append((outro, max(duraciones[g] if g < len(duraciones) else 3.0, MIN_DUR)))

    # Ajustar si supera límite Instagram
    total = sum(d for _, d in slides)
    if total > MAX_DURACION:
        factor = MAX_DURACION / total
        slides = [(img, round(d * factor, 2)) for img, d in slides]
        print(f"    Duracion ajustada: {total:.1f}s -> {sum(d for _,d in slides):.1f}s")
    else:
        print(f"    Duracion total: {total:.1f}s")

    # Compilar
    slug = ciudad_slug(ciudad)
    filename = f"evento_{ev_id[:8]}_{slug}.mp4"
    output_path = OUTPUT_DIR / filename

    print(f"    Compilando {filename}...")
    compilar_video(slides, output_path, audio_path=audio_path)
    shutil.rmtree(tmpdir_audio, ignore_errors=True)
    print(f"    {filename} ({output_path.stat().st_size // 1024} KB)")
    return filename


def caption_evento(evento, bares):
    ciudad = evento["ciudad"]
    ciudad_tag = ciudad_slug(ciudad)
    nombre = evento["nombre"]
    fecha_dt = datetime.strptime(evento["fecha"], "%Y-%m-%d")
    fecha_es = f"{fecha_dt.day} de {MESES[fecha_dt.month - 1]}"
    tipo = TIPO_ICON.get(evento.get("tipo", ""), "Evento")

    bares_txt = ""
    if bares:
        bares_txt = "\n\nBares cerca:\n" + "\n".join(f"• {b['nombre']}" for b in bares[:3])

    return (
        f"{tipo} en {ciudad} — {nombre}\n"
        f"El {fecha_es}. Apunta la fecha.\n"
        f"{bares_txt}\n\n"
        f"Descubre locales en {ciudad} -> link en bio\n\n"
        f"#tardeo #{ciudad_tag} #planes #ocio #tresycuarto #planesdetarde"
    )


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dias",    type=int, default=1,
                        help="Generar eventos cuya fecha_envio está en los próximos N días (default: 1)")
    parser.add_argument("--ciudad",  type=str, default=None)
    parser.add_argument("--evento",  type=str, default=None, help="ID concreto de evento")
    args = parser.parse_args()

    hoy = datetime.now().strftime("%Y-%m-%d")
    limite = (datetime.now() + timedelta(days=args.dias)).strftime("%Y-%m-%d")

    if args.evento:
        eventos = d1_query("SELECT * FROM eventos_geo WHERE id = ?", [args.evento])
    else:
        where_ciudad = f"AND ciudad = '{args.ciudad}'" if args.ciudad else ""
        eventos = d1_query(
            f"""SELECT * FROM eventos_geo
                WHERE estado = 'aprobado'
                  AND fecha >= ?
                  AND fecha <= ?
                  {where_ciudad}
                ORDER BY fecha ASC""",
            [hoy, limite]
        )

    print(f"{len(eventos)} evento(s) a procesar")

    generados = []
    for ev in eventos:
        print(f"\n--- {ev['nombre'][:60]} ---")
        try:
            bares = []
            if ev.get("lat") and ev.get("lon"):
                bares = bares_cercanos(ev["ciudad"], ev["lat"], ev["lon"])
            filename = generar_reel_evento(ev)
            if filename:
                generados.append({
                    "file": filename,
                    "caption": caption_evento(ev, bares)
                })
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback; traceback.print_exc()

    print(f"\n{'='*50}")
    print(f"Generados: {len(generados)} reels en {OUTPUT_DIR}")
    print(f"Llamadas Google Places: {_places_calls} / {MAX_PLACES_CALLS}")

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
        r2_key   = f"eventos/{filename}"
        local    = OUTPUT_DIR / filename

        if not local.exists():
            print(f"  SKIP (no existe): {filename}")
            continue

        if r2_key in existing:
            print(f"  SKIP (ya encolado): {r2_key}")
            subidos += 1
            continue

        # Subir a R2
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

        # Encolar con URL completa (R2 tiene custom domain media.tresycuarto.com)
        video_url = f"https://media.tresycuarto.com/{r2_key}"
        data["pending"].append({"filename": r2_key, "url": video_url, "caption": g["caption"]})
        QUEUE_FILE.write_text(_json.dumps(data, indent=2, ensure_ascii=False))
        existing.add(r2_key)
        print(f"  ✓ Subido y encolado: {r2_key}")
        subidos += 1

    return subidos


if __name__ == "__main__":
    main()
