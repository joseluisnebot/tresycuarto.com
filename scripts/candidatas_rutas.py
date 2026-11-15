#!/usr/bin/env python3
"""
Candidatas semanales de rutas de tardeo (pedido de JL, 15/11/2026).

Busca zonas con al menos MIN_BARES bares buenos juntos (nota REAL de Google: tienen
google_place_id, nota >= 4,0 y >= 20 reseñas) que aún no tengan una ruta cerca, las
ordena por interés y manda un correo a JL con las mejores. NO publica nada: JL dice
cuáles quiere y se publican con --publicar.

Uso:
  python3 scripts/candidatas_rutas.py                 # calcula, guarda y manda el correo
  python3 scripts/candidatas_rutas.py --sin-correo    # solo calcula y guarda
  python3 scripts/candidatas_rutas.py --publicar 2 4  # añade las candidatas 2 y 4 de la
                                                      # última lista a data/rutas.json
                                                      # (luego commit + bash scripts/deploy.sh)
"""
import argparse, json, math, os, re, sys, urllib.request
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generar_rutas as G   # d1, clusters_geograficos, reverse_barrio, _construir_ruta

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RUTAS = os.path.join(RAIZ, "data", "rutas.json")
CONTENIDO = json.load(open(os.path.join(RAIZ, "data", "ciudad-content.json")))
MAX_KM_CENTRO = 12   # hay locales con la ciudad mal asignada: 15/11 salió un "centro de Sevilla" a 108 km
LISTAS = os.path.join(RAIZ, "logs", "candidatas_rutas")
DESTINO = "joseluisnebot@mifsut.com"   # entra en la bandeja (la de gmail la archiva un filtro)
MIN_BARES, POR_SEMANA, DIST_RUTA_KM = 4, 5, 0.7
# Más reseñas que esto = casi seguro que se cruzó con un parque o monumento al traer las
# notas de Google ("Central Park" de Sevilla tenía las 41.364 del Parque de María Luisa)
MAX_RESENAS_FIABLE = 5000
NO_TARDEO = re.compile(r"starbucks|panader|helader|churrer|bubble|burger king|mcdonald|kfc|telepizza|domino|"
                       r"pizzer|kebab|d[öo]ner|sushi|wok|gamer|game|ciber|locutorio|asador de pollos", re.I)
TIPOS_TARDEO = {"bar", "pub", "biergarten", "cafe"}
# Prioridad geográfica acordada (memoria project_tresycuarto_geografia): costa y capitales pequeñas
PRIORIDAD = {"Vinaròs", "Cullera", "Altea", "Benicarló", "Peñíscola", "Castelló de la Plana", "Santa Pola",
             "Torrevieja", "Dénia", "Soria", "Segovia", "Cuenca", "Burgos", "Salamanca", "Lleida", "Toledo"}


def km(a, b, c, d):
    return 6371 * math.hypot(math.radians(c - a), math.radians(d - b) * math.cos(math.radians((a + c) / 2)))


def bares_reales():
    return [b for b in G.d1(
        "SELECT nombre, tipo, direccion, rating, rating_count, lat, lon, slug, ciudad FROM locales "
        f"WHERE google_place_id IS NOT NULL AND google_place_id <> '' AND rating >= 4.0 AND rating_count >= 20 "
        f"AND rating_count <= {MAX_RESENAS_FIABLE} "
        "AND lat IS NOT NULL AND slug IS NOT NULL AND direccion IS NOT NULL "
        "AND (fuente IS NULL OR fuente <> 'demo')")
        if (b["tipo"] or "bar").lower() in TIPOS_TARDEO and not NO_TARDEO.search(b["nombre"])]


def ciudades_con_suscriptor():
    out = set()
    # Sin los correos de prueba de JL (si no, Madrid y Sevilla puntúan por "tener suscriptores")
    for f in G.d1("SELECT ciudades FROM leads_app WHERE email NOT LIKE 'joseluisnebot@%'"):
        try:
            out |= set(json.loads(f["ciudades"] or "[]"))
        except ValueError:
            pass
    return out


def calcular():
    rutas = json.load(open(RUTAS))
    subs = ciudades_con_suscriptor()
    por_ciudad = {}
    for b in bares_reales():
        por_ciudad.setdefault(b["ciudad"], []).append(b)
    candidatas = []
    for ciudad, bares in por_ciudad.items():
        paradas = [(p["lat"], p["lon"]) for r in rutas if r["ciudad"] == ciudad for p in r["paradas"] if p.get("lat")]
        n_rutas = sum(1 for r in rutas if r["ciudad"] == ciudad)
        for grupo in G.clusters_geograficos(bares, min_n=MIN_BARES, max_clusters=40):
            cx = sum(b["lat"] for b in grupo) / len(grupo)
            cy = sum(b["lon"] for b in grupo) / len(grupo)
            centro = CONTENIDO.get(ciudad, {}).get("coords")
            if centro and km(cx, cy, centro["lat"], centro["lon"]) > MAX_KM_CENTRO:
                continue   # fuera de la ciudad: ciudad mal asignada en origen
            if paradas and min(km(cx, cy, a, o) for a, o in paradas) <= DIST_RUTA_KM:
                continue   # ya hay una ruta en esa zona
            nota = sum(float(b["rating"]) for b in grupo) / len(grupo)
            # Popularidad (reseñas totales) pesa más que la nota: separa zonas con ambiente
            # de bares de barrio residencial con pocas reseñas
            resenas = sum(int(b["rating_count"]) for b in grupo)
            puntos = (3 if n_rutas == 0 else 0) + (2 if ciudad in subs else 0) \
                + (2 if ciudad in PRIORIDAD else 0) + 2 * math.log10(resenas) + (nota - 4) * 2
            candidatas.append({"ciudad": ciudad, "lat": cx, "lon": cy, "puntos": round(puntos, 2), "resenas": resenas,
                               "nota_media": round(nota, 2), "bares": grupo})
    candidatas.sort(key=lambda c: -c["puntos"])
    # Variedad (máx. 2 por ciudad) y fuera las que ya están publicadas: el slug depende del
    # barrio, que se sabe al geocodificar, así que se comprueba aquí (las rutas antiguas sin
    # coordenadas no se detectan por distancia: así se coló Los Depósitos el 15/11)
    existentes = {r["slug"] for r in rutas}
    elegidas, usos = [], {}
    for c in candidatas:
        if usos.get(c["ciudad"], 0) >= 2:
            continue
        c["barrio"] = G.reverse_barrio(c["lat"], c["lon"]) or "Centro"
        c["ruta"] = G._construir_ruta(c["ciudad"], c["bares"], barrio=None if c["barrio"] == "Centro" else c["barrio"])
        if c["ruta"]["slug"] in existentes:
            continue
        # Las rutas de centro antiguas usan otro formato de slug (tardeo-centro-X / tardeo-X-centro)
        if c["barrio"] == "Centro" and any(r["ciudad"] == c["ciudad"] and r["barrio"].lower() in ("centro", "centre")
                                           for r in rutas):
            continue
        c["id"] = len(elegidas) + 1
        elegidas.append(c); usos[c["ciudad"]] = usos.get(c["ciudad"], 0) + 1
        existentes.add(c["ruta"]["slug"])   # dos zonas del mismo barrio darían la misma ruta
        if len(elegidas) == POR_SEMANA:
            break
    return elegidas, len(candidatas)


def html(elegidas, total):
    filas = ""
    for c in elegidas:
        paradas = "".join(f"<li>{p['nombre']} <span style='color:#A8A29E'>· {p['tipo']}</span></li>" for p in c["ruta"]["paradas"])
        filas += (f"<div style='border:1px solid #F5E6D3;border-radius:12px;padding:16px 20px;margin:0 0 14px'>"
                  f"<p style='margin:0 0 4px;font-weight:800;color:#1C1917'>{c['id']}. {c['barrio']}, {c['ciudad']}</p>"
                  f"<p style='margin:0 0 8px;color:#78716C;font-size:13px'>{len(c['bares'])} bares con nota real de Google · "
                  f"media {str(c['nota_media']).replace('.', ',')} · {c['resenas']:,} reseñas en total · slug propuesto <code>{c['ruta']['slug']}</code></p>"
                  f"<ol style='margin:0;padding-left:20px;color:#1C1917;font-size:14px'>{paradas}</ol></div>")
    return (f"<div style='font-family:-apple-system,sans-serif;max-width:560px;margin:auto'>"
            f"<h2 style='color:#1C1917'>Rutas candidatas de la semana</h2>"
            f"<p style='color:#78716C'>Zonas con {MIN_BARES} o más bares buenos juntos (solo notas reales de Google) y sin ruta "
            f"cerca. Quedan {total} zonas posibles en total. <b>No se publica nada solo</b>: dile a Claude en la sesión "
            f"«tresycuarto» cuáles quieres (por ejemplo «publica la 2 y la 4»).</p>{filas}</div>")


def enviar(asunto, cuerpo):
    payload = json.dumps({"sender": {"name": "tresycuarto", "email": "hola@tresycuarto.com"},
                          "to": [{"email": DESTINO}], "subject": asunto, "htmlContent": cuerpo}).encode()
    req = urllib.request.Request("https://api.brevo.com/v3/smtp/email", data=payload, method="POST",
                                 headers={"api-key": os.environ["BREVO_API_KEY"], "Content-Type": "application/json"})
    return urllib.request.urlopen(req, timeout=20).status


def publicar(ids):
    ultima = sorted(f for f in os.listdir(LISTAS) if f.endswith(".json"))[-1]
    lista = json.load(open(os.path.join(LISTAS, ultima)))
    rutas = json.load(open(RUTAS))
    slugs = {r["slug"] for r in rutas}
    for c in lista["candidatas"]:
        if c["id"] not in ids:
            continue
        r = c["ruta"]
        if r["slug"] in slugs:
            print(f"  · ya existe {r['slug']}"); continue
        rutas.append(r); slugs.add(r["slug"])
        print(f"  ✓ {r['titulo']} → /rutas/{r['slug']}/")
    json.dump(rutas, open(RUTAS, "w"), ensure_ascii=False, indent=2)
    open(RUTAS, "a").write("\n")
    print(f"Lista usada: {ultima}. Ahora: commit + push + bash scripts/deploy.sh")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sin-correo", action="store_true")
    ap.add_argument("--publicar", nargs="+", type=int, metavar="ID")
    a = ap.parse_args()
    if a.publicar:
        return publicar(a.publicar)

    elegidas, total = calcular()
    os.makedirs(LISTAS, exist_ok=True)
    por_bar = {b["nombre"]: b for c in elegidas for b in c["bares"]}
    for c in elegidas:   # coordenadas y enlace a la ficha en cada parada
        for p in c["ruta"]["paradas"]:
            b = por_bar[p["nombre"]]
            p.update(lat=round(b["lat"], 6), lon=round(b["lon"], 6), local_slug=b["slug"], coord="local")
        del c["bares"]
    salida = os.path.join(LISTAS, f"{date.today()}.json")
    json.dump({"fecha": str(date.today()), "zonas_totales": total, "candidatas": elegidas},
              open(salida, "w"), ensure_ascii=False, indent=2)
    print(f"{len(elegidas)} candidatas de {total} zonas → {salida}")
    for c in elegidas:
        print(f"  {c['id']}. {c['barrio']}, {c['ciudad']} ({c['puntos']} pts): " + " · ".join(p["nombre"] for p in c["ruta"]["paradas"]))
    if elegidas and not a.sin_correo:
        # el correo se arma antes de borrar "bares", así que se recalcula el resumen con la ruta
        for c in elegidas:
            c["bares"] = c["ruta"]["paradas"]
        print("correo:", enviar(f"🍹 {len(elegidas)} rutas candidatas de la semana — tresycuarto", html(elegidas, total)))


if __name__ == "__main__":
    main()
