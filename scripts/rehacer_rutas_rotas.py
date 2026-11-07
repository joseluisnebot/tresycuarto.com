#!/usr/bin/env python3
"""
Rehace las rutas publicadas con paradas de relleno ("Bar 1", "Bar 2"… con
descripciones genéricas de IA; entraron el 12/05/2026 en el lote "+30 rutas").
Decisión de JL, 07/11/2026.

- Se conserva el SLUG (la URL ya está indexada) y, en las de barrio, el título.
- Las paradas salen de bares REALES cerca del barrio (o del centro de la ciudad)
  con el mismo listón que generar_rutas.py: nota >= 4,0 y >= 20 reseñas. No se relaja.
- Si no hay bares suficientes que lo pasen (o no se localiza el barrio), la ruta se
  QUITA de rutas.json (sale de listados y sitemap) y su URL redirige con 301 a la
  página de su ciudad, que tiene el alta de newsletter. Nunca se inventa nada.

Uso:
  python3 scripts/rehacer_rutas_rotas.py            # simulación
  python3 scripts/rehacer_rutas_rotas.py --escribir
"""
import urllib.error
import argparse, json, math, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generar_rutas as G   # _construir_ruta, d1, slugify

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RUTAS = os.path.join(RAIZ, "data", "rutas.json")
REDIRECTS = os.path.join(RAIZ, "public", "_redirects")
CONTENIDO = json.load(open(os.path.join(RAIZ, "data", "ciudad-content.json")))
CIUDADES = {c["slug"]: c["nombre"] for c in json.load(open(os.path.join(RAIZ, "data", "cities.json")))}
RELLENO = re.compile(r"(Bar|Local|Parada)\s*\d+")
MIN_PARADAS = 3   # la ruta de Soria publicada tiene 3: es el estándar
# No son sitios de tardeo aunque tengan buena nota
NO_TARDEO = re.compile(r"starbucks|panader|helader|churrer|bubble|burger king|mcdonald|kfc|telepizza|domino", re.I)
RADIO_BARRIO_KM, RADIO_CENTRO_KM = 0.9, 1.2


def rota(ruta):
    return any(RELLENO.fullmatch(p["nombre"].strip()) for p in ruta["paradas"])


def km(a_lat, a_lon, b_lat, b_lon):
    dlat = math.radians(b_lat - a_lat)
    dlon = math.radians(b_lon - a_lon) * math.cos(math.radians((a_lat + b_lat) / 2))
    return 6371 * math.hypot(dlat, dlon)


def nominatim(texto):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": texto, "format": "json", "limit": 1, "countrycodes": "es"})
    req = urllib.request.Request(url, headers={"User-Agent": "tresycuarto.com rutas (hola@tresycuarto.com)"})
    for espera in (1.1, 30, 120):   # 429 = Nominatim pide frenar: esperar y reintentar
        time.sleep(espera)
        try:
            r = json.loads(urllib.request.urlopen(req, timeout=20).read())
            return (float(r[0]["lat"]), float(r[0]["lon"])) if r else None
        except urllib.error.HTTPError as e:
            if e.code != 429:
                print(f"    nominatim: {e}")
                return None
            print("    nominatim 429, espero")
        except Exception as e:
            print(f"    nominatim: {e}")
            return None
    return None


def bares_buenos(ciudad):
    return G.d1(
        "SELECT nombre, tipo, direccion, rating, rating_count, lat, lon, slug FROM locales "
        "WHERE ciudad=? AND rating>=4.0 AND rating_count>=20 AND lat IS NOT NULL AND slug IS NOT NULL "
        "AND direccion IS NOT NULL AND (fuente IS NULL OR fuente <> 'demo') "
        "ORDER BY rating DESC, rating_count DESC", [ciudad])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--escribir", action="store_true")
    a = ap.parse_args()

    rutas = json.load(open(RUTAS))
    rehechas, ocultas = [], []
    for i, ruta in enumerate(rutas):
        if not rota(ruta):
            continue
        ciudad = CIUDADES.get(ruta["ciudad_slug"], ruta["ciudad"])
        es_centro = ruta["barrio"].strip().lower() in ("centro", "centre", "centre històric")
        if es_centro:
            c = CONTENIDO.get(ciudad, {}).get("coords") or {}
            centro, radio = ((c["lat"], c["lon"]) if c else nominatim(f"{ciudad}, España")), RADIO_CENTRO_KM
        else:
            # Sin el barrio localizado no se cae al centro: etiquetaría mal la ruta
            centro, radio = nominatim(f"{ruta['barrio']}, {ciudad}, España"), RADIO_BARRIO_KM
        if not centro or centro[0] is None:
            ocultas.append((ruta, "no se localiza el barrio")); continue

        cerca, vistos = [], set()
        for b in bares_buenos(ciudad):
            if NO_TARDEO.search(b["nombre"]) or b["nombre"].lower() in vistos:
                continue
            if km(centro[0], centro[1], b["lat"], b["lon"]) <= radio:
                cerca.append(b); vistos.add(b["nombre"].lower())
        if len(cerca) < MIN_PARADAS:
            ocultas.append((ruta, f"{len(cerca)} bares pasan el listón"))
            continue

        nueva = G._construir_ruta(ciudad, cerca, None if es_centro else ruta["barrio"])
        por_nombre = {b["nombre"]: b for b in cerca}
        for p in nueva["paradas"]:
            b = por_nombre[p["nombre"]]
            p.update(lat=round(b["lat"], 6), lon=round(b["lon"], 6), local_slug=b["slug"], coord="local")
        conservar = {"slug": ruta["slug"], "ciudad_slug": ruta["ciudad_slug"]}
        if not es_centro:
            conservar["titulo"] = ruta["titulo"]
        rutas[i] = {**nueva, **conservar}
        rehechas.append((ruta["slug"], [f'{p["nombre"]} ({km(centro[0], centro[1], p["lat"], p["lon"]):.1f} km)' for p in nueva["paradas"]]))

    print(f"Rehechas con bares reales: {len(rehechas)}")
    for s, ps in rehechas:
        print(f"  ✓ {s}: {' · '.join(ps)}")
    print(f"Se quitan y redirigen a su ciudad: {len(ocultas)}")
    for r, motivo in ocultas:
        print(f"  ✗ {r['slug']} → /locales/{r['ciudad_slug']}/ ({motivo})")
    if a.escribir:
        fuera = {r["slug"] for r, _ in ocultas}
        rutas = [r for r in rutas if r["slug"] not in fuera]
        with open(REDIRECTS, "a") as f:
            f.write("# Rutas con paradas de relleno sin bares reales suficientes (07/11/2026)\n")
            for r, _ in ocultas:
                for desde in (f"/rutas/{r['slug']}/", f"/rutas/{r['slug']}"):
                    f.write(f"{desde}  /locales/{r['ciudad_slug']}/  301\n")
        json.dump(rutas, open(RUTAS, "w"), ensure_ascii=False, indent=2)
        open(RUTAS, "a").write("\n")
        print("Guardado data/rutas.json")
    else:
        print("(simulación: usa --escribir)")


if __name__ == "__main__":
    main()
