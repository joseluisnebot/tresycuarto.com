#!/usr/bin/env python3
"""
Añade coordenadas a las paradas de data/rutas.json (fase 2 del plan de eventos y
lugares en las rutas, 07/11/2026).

1. Si la parada es un bar de la base de datos (mismo nombre, normalizado, en la
   misma ciudad) → lat/lon y slug del local ("coord": "local").
2. Si no (las rutas antiguas tienen calles o plazas como "Cava Baja") → Nominatim,
   gratis, 1 petición por segundo ("coord": "nominatim").
3. Si tampoco, la parada se queda sin coordenadas.

Solo rellena las paradas que aún no tienen lat. Uso:
  python3 scripts/geolocalizar_paradas.py            # simulación
  python3 scripts/geolocalizar_paradas.py --escribir # guarda data/rutas.json
"""
import urllib.error
import argparse, collections, difflib, json, os, sys, time, unicodedata, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scraper_eventos as S   # d1_query

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RUTAS = os.path.join(RAIZ, "data", "rutas.json")
CIUDADES = {c["slug"]: c["nombre"] for c in json.load(open(os.path.join(RAIZ, "data", "cities.json")))}


def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join("".join(c if c.isalnum() else " " for c in s).split())


def locales_de(ciudad):
    filas = S.d1_query("SELECT nombre, slug, lat, lon, direccion FROM locales WHERE ciudad = ? "
                       "AND (fuente IS NULL OR fuente <> 'demo')", [ciudad])
    return {norm(f["nombre"]): f for f in filas}


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--escribir", action="store_true")
    a = ap.parse_args()

    rutas = json.load(open(RUTAS))
    cache, cuenta = {}, collections.Counter()
    for ruta in rutas:
        ciudad = CIUDADES.get(ruta["ciudad_slug"], ruta["ciudad"])
        if ciudad not in cache:
            cache[ciudad] = locales_de(ciudad)
        locs = cache[ciudad]
        for p in ruta["paradas"]:
            if p.get("lat") is not None:
                cuenta["ya tenía"] += 1
                continue
            n = norm(p["nombre"])
            f = locs.get(n)
            exacto = f is not None
            if not f:   # mismo bar con el nombre escrito un poco distinto
                cerca = difflib.get_close_matches(n, locs.keys(), n=1, cutoff=0.88)
                f = locs.get(cerca[0]) if cerca else None
            if f and f["lat"] is not None:
                p.update(lat=round(f["lat"], 6), lon=round(f["lon"], 6), coord="local")
                if exacto:   # el enlace a la ficha solo si es seguro que es ese bar
                    p["local_slug"] = f["slug"]
                cuenta["local"] += 1
                continue
            if f and f["direccion"]:   # el bar está, pero sin coordenadas: su dirección
                pos = nominatim(f"{f['direccion']}, {ciudad}")
                if pos:
                    p.update(lat=round(pos[0], 6), lon=round(pos[1], 6), local_slug=f["slug"], coord="direccion")
                    cuenta["direccion"] += 1
                    continue
            # "Calle Estrada — Bar Moreno, La Cripta…": la calle es lo que se puede situar
            pos = nominatim(f"{p['nombre'].split(' — ')[0].strip()}, {ciudad}")
            if pos:
                p.update(lat=round(pos[0], 6), lon=round(pos[1], 6), coord="nominatim")
                cuenta["nominatim"] += 1
            else:
                cuenta["sin coordenadas"] += 1
                print(f"  sin coordenadas: {ruta['slug']} · {p['nombre']}")

    total = sum(cuenta.values())
    print(f"{total} paradas: " + " · ".join(f"{k} {v}" for k, v in cuenta.most_common()))
    if a.escribir:
        json.dump(rutas, open(RUTAS, "w"), ensure_ascii=False, indent=2)
        open(RUTAS, "a").write("\n")
        print(f"Guardado {RUTAS}")
    else:
        print("(simulación: usa --escribir para guardar)")


if __name__ == "__main__":
    main()
