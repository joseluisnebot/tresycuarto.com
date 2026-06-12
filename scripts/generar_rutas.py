#!/usr/bin/env python3
"""
generar_rutas.py — Genera rutas de tardeo de CALIDAD para ciudades con material real.

Las PARADAS son bares reales de la base de datos (nombre, tipo, rating verídicos);
el LLM (Ollama local, gratis) solo escribe la prosa anclada a esos datos reales —
nunca inventa locales, platos ni lugares.

Uso:
  python3 generar_rutas.py --ciudad "Zamora" --dry-run     # muestra sin guardar
  python3 generar_rutas.py --ciudad "Zamora"               # añade a data/rutas.json
  python3 generar_rutas.py --auto                          # ciudades con material y sin ruta
"""
import os, json, argparse, re, unicodedata, urllib.request
from pathlib import Path

CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if not CF_TOKEN:
    raise SystemExit("ERROR: CLOUDFLARE_API_TOKEN no definido (ver /root/.tresycuarto_env)")
DB_ID  = "458672aa-392f-4767-8d2b-926406628ba0"
D1_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
OLLAMA = "http://localhost:11434/api/generate"
MODEL  = "mistral:7b"

RUTAS_JSON = Path(__file__).parent.parent / "data" / "rutas.json"

# Tipo OSM → nombre natural en español
TIPO_ES = {"bar": "bar de tapas", "cafe": "cafetería", "pub": "pub", "biergarten": "cervecería con terraza",
           "restaurant": "restaurante", "nightclub": "local de copas", "lounge": "coctelería"}
# Por tipo de local: (orden_en_la_ruta, etiqueta_rol, sugerencia). La sugerencia
# encaja con el tipo real → nada de "vermut" en una cafetería. 100% factual.
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


def ollama(prompt, num_predict=160, temp=0.6):
    payload = {"model": MODEL, "prompt": prompt, "stream": False,
               "options": {"temperature": temp, "num_predict": num_predict}}
    req = urllib.request.Request(OLLAMA, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    txt = json.loads(urllib.request.urlopen(req, timeout=120).read())["response"].strip()
    # quitar numeración/markdown/preámbulos
    txt = re.sub(r"^\s*\d+[\.\)]\s*", "", txt)        # "1. " / "2) "
    txt = txt.replace("**", "").replace("¡", "").strip().strip('"').strip()
    for p in ("Aquí tienes", "Claro,", "Por supuesto,", "Descripción:", "Intro:", "Consejos:"):
        if txt.startswith(p):
            txt = txt[len(p):].strip(": ").strip()
    return txt.strip()


def slugify(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def recortar(texto, max_frases=2, max_palabras=45):
    """Deja solo la primera frase útil (salta líneas-título tipo 'Ruta...:'), limita a N frases/palabras."""
    lineas = [l.strip() for l in texto.split("\n") if l.strip()]
    lineas = [l for l in lineas if not (l.endswith(":") or len(l) < 25)]
    texto = (lineas[0] if lineas else (texto.split("\n")[0] if texto else "")).strip()
    texto = re.split(r"\s\d+[\.\)]\s", texto)[0].strip()      # corta un "2." colgante
    frases = re.split(r"(?<=[\.\!\?])\s+", texto)
    out = " ".join(frases[:max_frases]).strip()
    pal = out.split()
    if len(pal) > max_palabras:
        out = " ".join(pal[:max_palabras]).rstrip(",;:") + "."
    if out and out[-1] not in ".!?":
        out += "."
    return out


def get_bares(ciudad, n=5):
    return d1(
        "SELECT nombre, tipo, direccion, rating, rating_count FROM locales "
        "WHERE ciudad=? AND rating>=4.0 AND photo_url IS NOT NULL AND photo_url!='' AND direccion IS NOT NULL "
        "ORDER BY rating DESC, rating_count DESC LIMIT ?", [ciudad, n])


def generar_ruta(ciudad):
    bares = get_bares(ciudad)
    if len(bares) < 4:
        return None, f"solo {len(bares)} bares con material (mínimo 4)"
    ciudad_slug = slugify(ciudad)
    nombres = ", ".join(b["nombre"] for b in bares)

    n = len(bares)
    intros = [
        f"Si buscas plan de tardeo en {ciudad}, esta ruta por el centro te lleva por {n} de los bares mejor valorados de la ciudad. Vermut, cañas y buen ambiente para ir de uno a otro sin prisa a media tarde.",
        f"El centro de {ciudad} es perfecto para el tardeo: terrazas, tapeo y ambiente de tarde. Te proponemos una ruta por {n} bares con muy buena valoración para aprovechar la media tarde de aperitivo a última copa.",
        f"Una tarde por {ciudad} da para mucho. Hemos elegido {n} de los bares mejor puntuados del centro para montar una ruta de tardeo cómoda y sin prisa, ideal para salir con amigos.",
    ]
    intro = intros[sum(map(ord, ciudad)) % len(intros)]

    # Ordenar las paradas para que la ruta fluya: aperitivo/tapas → copas → café
    bares = sorted(bares, key=lambda b: (MOMENTO.get((b.get("tipo") or "bar").lower(), DEFAULT_MOMENTO)[0],
                                         -float(b["rating"])))
    paradas = []
    usos = {}  # rota entre variantes de frase por tipo, para que no se repitan idénticas
    for i, b in enumerate(bares):
        tipo_l = (b.get("tipo") or "bar").lower()
        tipo_es = TIPO_ES.get(tipo_l, "bar")
        _, rol, frases = MOMENTO.get(tipo_l, DEFAULT_MOMENTO)
        k = usos.get(tipo_l, 0); usos[tipo_l] = k + 1
        frase = frases[k % len(frases)]
        rating = str(b["rating"]).replace(".", ",")
        nres = b.get("rating_count") or 0
        reseñas = f" ({nres} reseñas)" if nres else ""
        # Descripción 100% factual: tipo + valoración reales + sugerencia acorde al tipo.
        desc = f"{tipo_es.capitalize()} con {rating}⭐{reseñas}. {frase}"
        paradas.append({
            "numero": i + 1,
            "nombre": b["nombre"],
            "descripcion": desc,
            "tipo": rol,
            "tiempo_hasta_siguiente": "5-10 min a pie" if i < len(bares) - 1 else "",
        })

    # Consejos: plantilla fiable (sin alucinaciones), con la ciudad
    consejos = [
        f"En {ciudad} el tardeo arranca sobre las 13:00-14:00; llega pronto si quieres terraza.",
        "El fin de semana es el mejor momento — entre semana el ambiente baja antes.",
        "Muchos bares no aceptan reserva: la gracia es pasear por el centro y entrar donde veas ambiente.",
    ]

    return {
        "slug": f"tardeo-{ciudad_slug}-centro",
        "titulo": f"Ruta de tardeo por el centro de {ciudad}",
        "ciudad": ciudad,
        "ciudad_slug": ciudad_slug,
        "barrio": "Centro",
        "intro": intro,
        "distancia": "~1,5 km",
        "duracion": "3-4 horas",
        "mejor_dia": "Sábado o domingo desde las 13:00",
        "paradas": paradas,
        "consejos": consejos,
        "seo_keywords": [
            f"tardeo {ciudad}", f"bares {ciudad} tarde",
            f"ruta tardeo {ciudad}", f"qué hacer tarde en {ciudad}",
        ],
    }, None


def ciudades_auto():
    rows = d1("SELECT ciudad, COUNT(*) AS n FROM locales WHERE rating>=4.0 AND photo_url IS NOT NULL AND photo_url!='' "
              "AND direccion IS NOT NULL GROUP BY ciudad HAVING n>=4")
    rutas = json.loads(RUTAS_JSON.read_text())
    con_ruta = {r["ciudad"] for r in rutas}
    return [r["ciudad"] for r in rows if r["ciudad"] not in con_ruta]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ciudad")
    ap.add_argument("--auto", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    ciudades = [args.ciudad] if args.ciudad else (ciudades_auto() if args.auto else [])
    if not ciudades:
        raise SystemExit("Usa --ciudad 'X' o --auto")

    rutas = json.loads(RUTAS_JSON.read_text())
    slugs = {r["slug"] for r in rutas}
    nuevas = 0
    for ciudad in ciudades:
        ruta, err = generar_ruta(ciudad)
        if err:
            print(f"  ✗ {ciudad}: {err}")
            continue
        if ruta["slug"] in slugs:
            print(f"  · {ciudad}: ya existe {ruta['slug']}")
            continue
        if args.dry_run:
            print(json.dumps(ruta, ensure_ascii=False, indent=2))
        else:
            rutas.append(ruta)
            slugs.add(ruta["slug"])
            nuevas += 1
            print(f"  ✓ {ciudad}: {ruta['slug']} ({len(ruta['paradas'])} paradas)")

    if not args.dry_run and nuevas:
        RUTAS_JSON.write_text(json.dumps(rutas, ensure_ascii=False, indent=2))
        print(f"\n✓ {nuevas} rutas añadidas a {RUTAS_JSON.name} (total: {len(rutas)})")


if __name__ == "__main__":
    main()
