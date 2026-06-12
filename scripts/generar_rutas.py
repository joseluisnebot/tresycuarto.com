#!/usr/bin/env python3
"""
generar_rutas.py — Genera rutas de tardeo de CALIDAD con bares REALES de la base.

Las paradas son bares reales (nombre, tipo, rating verídicos); las sugerencias
encajan con el tipo del local. Cero invención (sin LLM: alucinaba).

Modos:
  --ciudad "Zamora"          una ruta de "centro" para esa ciudad
  --auto                     rutas de centro para ciudades con material y sin ruta
  --barrios "Madrid"         varias rutas por BARRIO (clustering geográfico + Nominatim)
  --barrios-auto             rutas por barrio para las ciudades grandes
  --dry-run                  muestra sin guardar
"""
import os, json, argparse, re, math, time, unicodedata, urllib.request, urllib.parse
from pathlib import Path

CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if not CF_TOKEN:
    raise SystemExit("ERROR: CLOUDFLARE_API_TOKEN no definido (ver /root/.tresycuarto_env)")
DB_ID  = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
RUTAS_JSON = Path(__file__).parent.parent / "data" / "rutas.json"

TIPO_ES = {"bar": "bar de tapas", "cafe": "cafetería", "pub": "pub", "biergarten": "cervecería con terraza",
           "restaurant": "restaurante", "nightclub": "local de copas", "lounge": "coctelería"}
# Por tipo: (orden_en_la_ruta, etiqueta_rol, [variantes de sugerencia])
MOMENTO = {
    "bar":        (1, "Tapas y vermut", [
        "Ideal para arrancar con un vermut, cañas y algo de picar.",
        "Un clásico para tapear y tomar la primera caña de la tarde.",
        "Buen sitio para vermut, tapas y ambiente de barra."]),
    "biergarten": (1, "Cervezas y terraza", [
        "Perfecta para unas cañas al aire libre en su terraza.",
        "Cervezas y sol: terraza para empezar la tarde con calma."]),
    "cafe":       (2, "Café y dulce", [
        "Buen sitio para un café, repostería o algo dulce.",
        "Una pausa con café de especialidad o algo de merienda.",
        "Para reponer fuerzas con un café y un dulce."]),
    "restaurant": (2, "Para comer", [
        "Para parar a comer algo en condiciones a media tarde.",
        "Una parada con cocina para asentar la ruta."]),
    "lounge":     (3, "Cócteles", [
        "Para una copa o un cóctel bien preparado.",
        "Coctelería para subir el nivel de la tarde."]),
    "pub":        (3, "Copas y ambiente", [
        "Para subir el ritmo con unas copas y buen ambiente.",
        "Un pub con ambiente para alargar la tarde con una copa.",
        "Copas y música: aquí la tarde sube de marcha."]),
    "nightclub":  (4, "Copas", [
        "Para alargar la tarde con unas copas.",
        "El sitio para cerrar la ruta con una última copa."]),
}
DEFAULT_MOMENTO = (2, "Una parada", ["Un buen sitio para seguir la ruta de tardeo."])


def d1(sql, params=None):
    body = {"sql": sql, "params": params or []}
    req = urllib.request.Request(D1_URL, data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=30))["result"][0].get("results", [])


def slugify(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def get_bares(ciudad, n=6, con_geo=False):
    extra = "AND lat IS NOT NULL AND lon IS NOT NULL " if con_geo else ""
    lim = "" if con_geo else f"LIMIT {n}"
    return d1(
        f"SELECT nombre, tipo, direccion, rating, rating_count, lat, lon FROM locales "
        f"WHERE ciudad=? AND rating>=4.0 AND rating_count>=20 AND photo_url IS NOT NULL AND photo_url!='' "
        f"AND direccion IS NOT NULL {extra}"
        f"ORDER BY rating DESC, rating_count DESC {lim}", [ciudad])


def reverse_barrio(lat, lon):
    """Nombre real del barrio/zona por geocodificación inversa (Nominatim, 1 req/s)."""
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom=16&addressdetails=1"
    req = urllib.request.Request(url, headers={"User-Agent": "tresycuarto.com/1.0 (hola@tresycuarto.com)"})
    try:
        time.sleep(1.1)
        a = json.loads(urllib.request.urlopen(req, timeout=15).read()).get("address", {})
        for k in ("neighbourhood", "quarter", "suburb", "city_district", "borough", "residential"):
            if a.get(k):
                # "Barrio de la Latina" → "La Latina" (nombre más limpio y evita duplicar rutas)
                nombre = re.sub(r"^Barrio\s+(de\s+(la|los|las|el)\s+|del\s+|de\s+)?", "", a[k], flags=re.I).strip()
                return nombre or a[k]
    except Exception:
        pass
    return None


def _construir_ruta(ciudad, bares, barrio=None):
    ciudad_slug = slugify(ciudad)
    lugar = barrio if barrio else "el centro"
    bares = sorted(bares, key=lambda b: (MOMENTO.get((b.get("tipo") or "bar").lower(), DEFAULT_MOMENTO)[0],
                                         -float(b["rating"])))[:5]
    paradas, usos = [], {}
    for i, b in enumerate(bares):
        tipo_l = (b.get("tipo") or "bar").lower()
        tipo_es = TIPO_ES.get(tipo_l, "bar")
        _, rol, frases = MOMENTO.get(tipo_l, DEFAULT_MOMENTO)
        k = usos.get(tipo_l, 0); usos[tipo_l] = k + 1
        rating = str(b["rating"]).replace(".", ",")
        nres = b.get("rating_count") or 0
        reseñas = f" ({nres} reseñas)" if nres else ""
        paradas.append({
            "numero": i + 1,
            "nombre": b["nombre"],
            "descripcion": f"{tipo_es.capitalize()} con {rating}⭐{reseñas}. {frases[k % len(frases)]}",
            "tipo": rol,
            "tiempo_hasta_siguiente": "5-10 min a pie" if i < len(bares) - 1 else "",
        })
    n = len(paradas)
    if barrio:
        intros = [
            f"Tardeo por {barrio}, en {ciudad}: esta ruta recorre {n} de los bares mejor valorados del barrio para ir de uno a otro sin prisa a media tarde.",
            f"{barrio} es una de las zonas con más ambiente de tardeo de {ciudad}. Te proponemos {n} bares con muy buena nota, de aperitivo a última copa.",
            f"Si buscas plan de tarde en {barrio} ({ciudad}), aquí tienes {n} de los bares mejor puntuados de la zona para montar una ruta cómoda.",
        ]
    else:
        intros = [
            f"Si buscas plan de tardeo en {ciudad}, esta ruta por el centro te lleva por {n} de los bares mejor valorados de la ciudad. Vermut, cañas y buen ambiente para ir de uno a otro sin prisa.",
            f"El centro de {ciudad} es perfecto para el tardeo: terrazas, tapeo y ambiente de tarde. Te proponemos una ruta por {n} bares con muy buena valoración, de aperitivo a última copa.",
            f"Una tarde por {ciudad} da para mucho. Hemos elegido {n} de los bares mejor puntuados del centro para montar una ruta de tardeo cómoda y sin prisa.",
        ]
    return {
        "slug": f"tardeo-{slugify(barrio)}-{ciudad_slug}" if barrio else f"tardeo-{ciudad_slug}-centro",
        "titulo": f"Ruta de tardeo por {barrio}, {ciudad}" if barrio else f"Ruta de tardeo por el centro de {ciudad}",
        "ciudad": ciudad,
        "ciudad_slug": ciudad_slug,
        "barrio": barrio or "Centro",
        "intro": intros[sum(map(ord, ciudad + (barrio or ""))) % len(intros)],
        "distancia": "~1,5 km",
        "duracion": "3-4 horas",
        "mejor_dia": "Sábado o domingo desde las 13:00",
        "paradas": paradas,
        "consejos": [
            f"En {ciudad} el tardeo arranca sobre las 13:00-14:00; llega pronto si quieres terraza.",
            "El fin de semana es el mejor momento — entre semana el ambiente baja antes.",
            "Muchos bares no aceptan reserva: la gracia es pasear y entrar donde veas ambiente.",
        ],
        "seo_keywords": [
            f"tardeo {lugar} {ciudad}".replace("el centro", "centro"),
            f"bares {lugar} {ciudad} tarde", f"ruta tardeo {lugar} {ciudad}",
            f"qué hacer tarde en {barrio or ciudad}",
        ],
    }


def _dist(a, b):
    lat = (float(a["lat"]) + float(b["lat"])) / 2
    dlat = float(a["lat"]) - float(b["lat"])
    dlon = (float(a["lon"]) - float(b["lon"])) * math.cos(math.radians(lat))
    return math.hypot(dlat, dlon)


def clusters_geograficos(bares, radio=0.004, min_n=4, max_clusters=10):
    """Agrupa bares por cercanía (greedy desde el mejor valorado). radio≈350-450 m."""
    bares = sorted(bares, key=lambda b: -float(b["rating"]))
    usados, clusters = set(), []
    for seed in bares:
        if id(seed) in usados:
            continue
        grupo = [b for b in bares if id(b) not in usados and _dist(seed, b) <= radio]
        if len(grupo) >= min_n:
            for b in grupo:
                usados.add(id(b))
            clusters.append(grupo)
        if len(clusters) >= max_clusters:
            break
    return clusters


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ciudad")
    ap.add_argument("--auto", action="store_true")
    ap.add_argument("--barrios")
    ap.add_argument("--barrios-auto", action="store_true")
    ap.add_argument("--max-por-ciudad", type=int, default=8)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rutas = json.loads(RUTAS_JSON.read_text())
    slugs = {r["slug"] for r in rutas}
    nuevas = []

    def barrio_tokens(s):
        toks = slugify(s).replace("-", " ").split()
        return {w for w in toks if len(w) >= 4 and w not in ("barrio", "zona", "centro", "ciudad")}

    # tokens de barrio ya cubiertos por ciudad (para no duplicar rutas existentes ni entre sí)
    ex_tokens = {}
    for r in rutas:
        ex_tokens.setdefault(r["ciudad"], set()).update(barrio_tokens(r.get("barrio", "")))

    def add(ruta):
        if ruta["slug"] in slugs:
            print(f"  · ya existe {ruta['slug']}"); return
        if args.dry_run:
            print(json.dumps(ruta, ensure_ascii=False, indent=2))
        else:
            rutas.append(ruta); slugs.add(ruta["slug"]); nuevas.append(ruta)
            print(f"  ✓ {ruta['titulo']} ({len(ruta['paradas'])} paradas) → {ruta['slug']}")

    # ── Modo BARRIOS ──
    if args.barrios or args.barrios_auto:
        if args.barrios_auto:
            rows = d1("SELECT ciudad, COUNT(*) AS n FROM locales WHERE rating>=4.0 AND photo_url IS NOT NULL "
                      "AND photo_url!='' AND direccion IS NOT NULL AND lat IS NOT NULL GROUP BY ciudad HAVING n>=15 ORDER BY n DESC")
            ciudades = [r["ciudad"] for r in rows]
        else:
            ciudades = [args.barrios]
        for ciudad in ciudades:
            print(f"── {ciudad} ──")
            bares = get_bares(ciudad, con_geo=True)
            cls = clusters_geograficos(bares, max_clusters=args.max_por_ciudad)
            for grupo in cls:
                # centroide → barrio real
                cx = sum(float(b["lat"]) for b in grupo) / len(grupo)
                cy = sum(float(b["lon"]) for b in grupo) / len(grupo)
                barrio = reverse_barrio(cx, cy)
                if not barrio:
                    continue
                nt = barrio_tokens(barrio)
                if not nt or (nt & ex_tokens.get(ciudad, set())):
                    print(f"  · barrio ya cubierto o sin nombre útil: {barrio}"); continue
                ex_tokens.setdefault(ciudad, set()).update(nt)
                add(_construir_ruta(ciudad, grupo, barrio=barrio))
        if not args.dry_run and nuevas:
            RUTAS_JSON.write_text(json.dumps(rutas, ensure_ascii=False, indent=2))
            print(f"\n✓ {len(nuevas)} rutas de barrio añadidas (total: {len(rutas)})")
        return

    # ── Modo CENTRO ──
    if args.auto:
        rows = d1("SELECT ciudad, COUNT(*) AS n FROM locales WHERE rating>=4.0 AND photo_url IS NOT NULL "
                  "AND photo_url!='' AND direccion IS NOT NULL GROUP BY ciudad HAVING n>=4")
        con = {r["ciudad"] for r in rutas}
        ciudades = [r["ciudad"] for r in rows if r["ciudad"] not in con]
    elif args.ciudad:
        ciudades = [args.ciudad]
    else:
        raise SystemExit("Usa --ciudad, --auto, --barrios 'X' o --barrios-auto")

    for ciudad in ciudades:
        bares = get_bares(ciudad)
        if len(bares) < 4:
            print(f"  ✗ {ciudad}: solo {len(bares)} bares (mínimo 4)"); continue
        add(_construir_ruta(ciudad, bares))
    if not args.dry_run and nuevas:
        RUTAS_JSON.write_text(json.dumps(rutas, ensure_ascii=False, indent=2))
        print(f"\n✓ {len(nuevas)} rutas añadidas (total: {len(rutas)})")


if __name__ == "__main__":
    main()
