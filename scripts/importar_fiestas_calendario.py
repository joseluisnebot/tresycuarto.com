#!/usr/bin/env python3
"""
importar_fiestas_calendario.py — Importa fiestas oficiales y eventos mayores de España.

Fuentes:
  1. Catálogo curado de ~120 fiestas mayores con fechas exactas o calculadas
  2. API datos.gob.es calendario laboral (fiestas oficiales por municipio)
  3. Cálculo automático de fechas móviles (Semana Santa, Carnaval, etc.)

El texto descriptivo lo genera Ollama local (llama3.2:3b o mistral:7b).
Usa la misma infraestructura que scraper_eventos.py (insertar_evento, etc.)

Uso:
  python3 importar_fiestas_calendario.py              # año actual
  python3 importar_fiestas_calendario.py --anio 2027
  python3 importar_fiestas_calendario.py --dry-run
  python3 importar_fiestas_calendario.py --ciudad Sevilla

Cron sugerido: 0 5 1 1 * (1 de enero, cada año)
"""

import os, json, hashlib, time, urllib.request, argparse, logging
from datetime import date, timedelta

CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "0c4d9c91bb0f3a4c905545ecc158ec65")
CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN", "")
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"

if not CF_TOKEN:
    raise SystemExit("ERROR: CLOUDFLARE_API_TOKEN no definido")

D1_URL     = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{DB_ID}/query"
D1_HEADERS = {"Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/root/tresycuarto-sync/logs/importar_fiestas.log"),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

# ── Coordenadas de ciudades ────────────────────────────────────────────────────
COORDS = {
    "Sevilla":               (37.3886, -5.9823),
    "Pamplona":              (42.8188, -1.6444),
    "Valencia":              (39.4699, -0.3763),
    "Buñol":                 (39.4209, -0.7921),
    "Cádiz":                 (36.5271, -6.2886),
    "Santa Cruz de Tenerife":(28.4682, -16.2546),
    "Sitges":                (41.2376, 1.8058),
    "Huelva":                (37.2614, -6.9447),
    "Málaga":                (36.7213, -4.4214),
    "Córdoba":               (37.8882, -4.7794),
    "Granada":               (37.1773, -3.5986),
    "Jerez de la Frontera":  (36.6816, -6.1368),
    "Madrid":                (40.4168, -3.7038),
    "Barcelona":             (41.3851, 2.1734),
    "Bilbao":                (43.2630, -2.9350),
    "Zaragoza":              (41.6488, -0.8891),
    "Murcia":                (37.9922, -1.1307),
    "Palma":                 (39.5696, 2.6502),
    "Alcoy":                 (38.6953, -0.4753),
    "Elche":                 (38.2669, -0.7003),
    "Alicante":              (38.3452, -0.4810),
    "Logroño":               (42.4627, -2.4450),
    "Vitoria":               (42.8467, -2.6726),
    "San Sebastián":         (43.3183, -1.9812),
    "Santander":             (43.4623, -3.8099),
    "Oviedo":                (43.3603, -5.8448),
    "Santiago de Compostela":(42.8782, -8.5448),
    "Badajoz":               (38.8794, -6.9706),
    "Cáceres":               (39.4753, -6.3724),
    "Mérida":                (38.9159, -6.3444),
    "Toledo":                (39.8567, -4.0244),
    "Cuenca":                (40.0704, -2.1374),
    "Burgos":                (42.3440, -3.6970),
    "Salamanca":             (40.9701, -5.6635),
    "Segovia":               (40.9429, -4.1088),
    "Ávila":                 (40.6564, -4.6818),
    "Valladolid":            (41.6523, -4.7245),
    "León":                  (42.5987, -5.5671),
    "Pontevedra":            (42.4336, -8.6479),
    "Vigo":                  (42.2406, -8.7207),
    "Lugo":                  (43.0097, -7.5567),
    "Las Palmas":            (28.1235, -15.4363),
    "Tarragona":             (41.1189, 1.2445),
    "Lleida":                (41.6175, 0.6200),
    "Girona":                (41.9794, 2.8214),
    "Castelló de la Plana":  (39.9864, -0.0513),
    "Vinaròs":               (40.4710, 0.4746),
    "Torrevieja":            (37.9786, -0.6833),
    "Benidorm":              (38.5397, -0.1332),
    "Denia":                 (38.8430, 0.1060),
    "Cullera":               (39.1714, -0.2525),
    "Zamora":                (41.5032, -5.7460),
    "Cartagena":             (37.6049, -0.9902),
    "Almería":               (36.8381, -2.4597),
    "Jaén":                  (37.7796, -3.7849),
}

# ── Cálculo de Pascua (algoritmo de Butcher) ──────────────────────────────────
def pascua(anio: int) -> date:
    a = anio % 19
    b = anio // 100
    c = anio % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = ((h + l - 7 * m + 114) % 31) + 1
    return date(anio, mes, dia)

# ── Catálogo de fiestas ───────────────────────────────────────────────────────
def generar_fiestas(anio: int):
    """Genera la lista de fiestas para el año dado."""
    p = pascua(anio)
    carnaval_inicio = p - timedelta(days=47)

    fiestas = [
        # ── FIESTAS MÓVILES (relativas a Pascua) ──────────────────────────────
        # Semana Santa — principales ciudades
        *[
            {
                "nombre": f"Semana Santa {ciudad}",
                "ciudad": ciudad,
                "fecha": str(p - timedelta(days=7)),
                "fecha_fin": str(p),
                "tipo": "procesion",
                "descripcion_extra": "procesiones, hermandades, costaleros",
            }
            for ciudad in ["Sevilla", "Málaga", "Córdoba", "Granada", "Cádiz",
                           "Valladolid", "Zamora", "Cuenca", "Murcia", "Cartagena",
                           "Jerez de la Frontera", "Huelva", "Almería", "Jaén"]
        ],
        # Feria de Abril (Sevilla) — 2 semanas después de Pascua, empieza martes
        {
            "nombre": "Feria de Abril Sevilla",
            "ciudad": "Sevilla",
            "fecha": str(p + timedelta(days=14 + (1 - (p + timedelta(days=14)).weekday()) % 7)),
            "tipo": "feria",
            "descripcion_extra": "casetas, sevillanas, rebujito, caballos, farolillos",
        },
        # Feria de Córdoba — último lunes de mayo
        {
            "nombre": "Feria de Nuestra Señora de la Salud (Córdoba)",
            "ciudad": "Córdoba",
            "fecha": str(date(anio, 5, 31) - timedelta(days=(date(anio, 5, 31).weekday()))),
            "tipo": "feria",
            "descripcion_extra": "recinto ferial, casetas, flamenco, rebujito",
        },
        # Carnaval
        *[
            {
                "nombre": f"Carnaval de {ciudad}",
                "ciudad": ciudad,
                "fecha": str(carnaval_inicio),
                "tipo": "feria",
                "descripcion_extra": "disfraces, chirigotas, comparsas, cabalgata",
            }
            for ciudad in ["Cádiz", "Santa Cruz de Tenerife", "Sitges", "Huelva", "Badajoz"]
        ],

        # ── FIESTAS FIJAS ──────────────────────────────────────────────────────
        # Fallas (Valencia) — 15-19 marzo
        {
            "nombre": "Fallas de Valencia",
            "ciudad": "Valencia",
            "fecha": str(date(anio, 3, 15)),
            "tipo": "festival",
            "descripcion_extra": "fallas monumentales, mascletàs, cremà, pirotecnia, falleras",
        },
        # San José (19 marzo)
        {
            "nombre": "Día de San José — Fallas",
            "ciudad": "Valencia",
            "fecha": str(date(anio, 3, 19)),
            "tipo": "festival",
            "descripcion_extra": "cremà, noche de fuego, espectáculo pirotécnico final",
        },
        # San Fermín (Pamplona) — 6-14 julio
        {
            "nombre": "San Fermín — Encierros de Pamplona",
            "ciudad": "Pamplona",
            "fecha": str(date(anio, 7, 6)),
            "tipo": "festival",
            "descripcion_extra": "encierros, chupinazo, pañuelo rojo, gigantes, peñas",
        },
        # La Tomatina (Buñol) — último miércoles de agosto
        {
            "nombre": "La Tomatina de Buñol",
            "ciudad": "Buñol",
            "fecha": str(date(anio, 8, 31) - timedelta(days=(date(anio, 8, 31).weekday() - 2) % 7)),
            "tipo": "festival",
            "descripcion_extra": "batalla de tomates, fiesta única en el mundo",
        },
        # Feria de Málaga — segunda semana de agosto
        {
            "nombre": "Feria de Málaga",
            "ciudad": "Málaga",
            "fecha": str(date(anio, 8, 12)),
            "tipo": "feria",
            "descripcion_extra": "feria del centro, feria del real, espetos, vino de Málaga",
        },
        # Moros y Cristianos (Alcoy) — 22-24 abril
        {
            "nombre": "Moros y Cristianos de Alcoy",
            "ciudad": "Alcoy",
            "fecha": str(date(anio, 4, 22)),
            "tipo": "festival",
            "descripcion_extra": "desfiles, batallas, pólvora, fiesta de interés turístico internacional",
        },
        # Hogueras de San Juan (Alicante) — 20-24 junio
        {
            "nombre": "Hogueras de San Juan — Alicante",
            "ciudad": "Alicante",
            "fecha": str(date(anio, 6, 20)),
            "tipo": "festival",
            "descripcion_extra": "hogueras monumentales, mascletàs, barracas, bellea del foc",
        },
        # Noche de San Juan — 23 junio (toda España)
        *[
            {
                "nombre": f"Noche de San Juan — {ciudad}",
                "ciudad": ciudad,
                "fecha": str(date(anio, 6, 23)),
                "tipo": "festival",
                "descripcion_extra": "hogueras en la playa, peticiones, noche mágica de verano",
            }
            for ciudad in ["Barcelona", "Valencia", "Alicante", "Cádiz", "Vigo",
                           "Las Palmas", "Santa Cruz de Tenerife", "Santander", "Gijón"]
        ],
        # Festa Major (Gràcia, Barcelona) — 3ª semana agosto
        {
            "nombre": "Festa Major de Gràcia (Barcelona)",
            "ciudad": "Barcelona",
            "fecha": str(date(anio, 8, 15)),
            "tipo": "festival",
            "descripcion_extra": "calles decoradas, conciertos, actividades, tradición barcelonesa",
        },
        # La Mercè (Barcelona) — 24 septiembre
        {
            "nombre": "La Mercè — Fiestas de Barcelona",
            "ciudad": "Barcelona",
            "fecha": str(date(anio, 9, 24)),
            "tipo": "festival",
            "descripcion_extra": "castellers, correfoc, conciertos gratuitos, gigantes, sardanes",
        },
        # Aste Nagusia (Bilbao) — semana del 15 agosto
        {
            "nombre": "Aste Nagusia — Semana Grande de Bilbao",
            "ciudad": "Bilbao",
            "fecha": str(date(anio, 8, 15)),
            "tipo": "festival",
            "descripcion_extra": "conciertos, fuegos artificiales, kalimotxo, txosnas",
        },
        # Semana Grande (San Sebastián) — semana del 15 agosto
        {
            "nombre": "Semana Grande de San Sebastián",
            "ciudad": "San Sebastián",
            "fecha": str(date(anio, 8, 15)),
            "tipo": "festival",
            "descripcion_extra": "fuegos artificiales en la bahía, conciertos, jaialdi",
        },
        # Fiestas del Pilar (Zaragoza) — 12 octubre
        {
            "nombre": "Fiestas del Pilar — Zaragoza",
            "ciudad": "Zaragoza",
            "fecha": str(date(anio, 10, 12)),
            "tipo": "festival",
            "descripcion_extra": "ofrenda de flores, jota, baturros, gigantes, fuegos artificiales",
        },
        # Feria de San Mateo (Logroño) — 21 septiembre
        {
            "nombre": "Feria de San Mateo — Logroño",
            "ciudad": "Logroño",
            "fecha": str(date(anio, 9, 21)),
            "tipo": "feria",
            "descripcion_extra": "vendimia, vino de La Rioja, bodegas, degustaciones, conciertos",
        },
        # Vitoria — Fiestas de la Virgen Blanca — 4-9 agosto
        {
            "nombre": "Fiestas de la Virgen Blanca — Vitoria",
            "ciudad": "Vitoria",
            "fecha": str(date(anio, 8, 4)),
            "tipo": "festival",
            "descripcion_extra": "Celedón, cuadrillas, chupinazo, vino, pintxos",
        },
        # Descenso del Sella (Asturias) — primer sábado agosto
        {
            "nombre": "Descenso Internacional del Sella",
            "ciudad": "Oviedo",
            "fecha": str(date(anio, 8, 1) + timedelta(days=(5 - date(anio, 8, 1).weekday()) % 7)),
            "tipo": "deporte",
            "descripcion_extra": "piragüismo, sidra asturiana, Arriondas a Ribadesella",
        },
        # Reconquista (Vigo) — fin de semana central agosto
        {
            "nombre": "Reconquista de Vigo",
            "ciudad": "Vigo",
            "fecha": str(date(anio, 8, 28)),
            "tipo": "festival",
            "descripcion_extra": "recreación histórica, batallas, mercado medieval, fuegos",
        },
        # Corpus Christi (Granada, Toledo) — 60 días después de Pascua
        *[
            {
                "nombre": f"Corpus Christi — {ciudad}",
                "ciudad": ciudad,
                "fecha": str(p + timedelta(days=60)),
                "tipo": "procesion",
                "descripcion_extra": "procesión del Corpus, alfombras florales, mantillas",
            }
            for ciudad in ["Granada", "Toledo", "Sevilla", "Cádiz"]
        ],
        # Nochevieja y Año Nuevo
        {
            "nombre": "Nochevieja en Puerta del Sol",
            "ciudad": "Madrid",
            "fecha": str(date(anio, 12, 31)),
            "tipo": "festival",
            "descripcion_extra": "uvas de la suerte, cotillón, Puerta del Sol, campanadas",
        },
        # Navidad — Cabalgata de Reyes
        *[
            {
                "nombre": f"Cabalgata de Reyes — {ciudad}",
                "ciudad": ciudad,
                "fecha": str(date(anio, 1, 5)),
                "tipo": "festival",
                "descripcion_extra": "cabalgata de los Reyes Magos, caramelos, ilusión infantil",
            }
            for ciudad in ["Madrid", "Barcelona", "Sevilla", "Valencia", "Málaga", "Bilbao"]
        ],
        # Feria de Jerez — mayo
        {
            "nombre": "Feria del Caballo — Jerez de la Frontera",
            "ciudad": "Jerez de la Frontera",
            "fecha": str(date(anio, 5, 5)),
            "tipo": "feria",
            "descripcion_extra": "caballos, flamenco, rebujito, casetas, carruajes",
        },
        # Feria de Granada — junio/julio
        {
            "nombre": "Feria del Corpus — Granada",
            "ciudad": "Granada",
            "fecha": str(p + timedelta(days=66)),
            "tipo": "feria",
            "descripcion_extra": "recinto ferial, flamenco, vino, tapas gratuitas",
        },
        # Fiestas de Santiago (Santiago de Compostela) — 25 julio
        {
            "nombre": "Fiestas del Apóstol — Santiago de Compostela",
            "ciudad": "Santiago de Compostela",
            "fecha": str(date(anio, 7, 25)),
            "tipo": "festival",
            "descripcion_extra": "fuegos artificiales, ofrenda al Apóstol, peregrinos, misa",
        },
        # Vinaròs — Carnaval del Mar (febrero)
        {
            "nombre": "Carnaval de Vinaròs",
            "ciudad": "Vinaròs",
            "fecha": str(carnaval_inicio),
            "tipo": "feria",
            "descripcion_extra": "disfraces, desfile, comparsa, fiesta de la langosta",
        },
        # Benidorm — fiestas patronales — noviembre
        {
            "nombre": "Fiestas de San Jaime — Benidorm",
            "ciudad": "Benidorm",
            "fecha": str(date(anio, 11, 1)),
            "tipo": "festival",
            "descripcion_extra": "moros y cristianos, desfiles, fuegos, ambiente festivo",
        },
        # Denia — moros y cristianos — agosto
        {
            "nombre": "Moros y Cristianos de Dénia",
            "ciudad": "Denia",
            "fecha": str(date(anio, 8, 14)),
            "tipo": "festival",
            "descripcion_extra": "desembarco, batallas, castillo, pólvora, fiesta marinera",
        },
        # Elche — Misteri d'Elx — agosto
        {
            "nombre": "Misteri d'Elx — Elche",
            "ciudad": "Elche",
            "fecha": str(date(anio, 8, 14)),
            "tipo": "cultura",
            "descripcion_extra": "drama sacro medieval, Patrimonio UNESCO, Basílica de Santa María",
        },
    ]

    return fiestas


# ── Ollama — generar descripción enriquecida ──────────────────────────────────
def generar_descripcion(nombre, ciudad, tipo, fecha_str, descripcion_extra=""):
    meses = ["enero","febrero","marzo","abril","mayo","junio",
             "julio","agosto","septiembre","octubre","noviembre","diciembre"]
    try:
        f = date.fromisoformat(fecha_str)
        fecha_es = f"{f.day} de {meses[f.month-1]} de {f.year}"
    except Exception:
        fecha_es = fecha_str

    prompt = (
        f"Escribe una descripción atractiva (2-3 frases, máximo 200 caracteres) para esta fiesta española.\n"
        f"Tono cercano e informal, para una app de ocio y tardeo. Sin comillas.\n"
        f"Fiesta: {nombre}\nCiudad: {ciudad}\nFecha: {fecha_es}\n"
        f"Detalles clave: {descripcion_extra}\n\nDescripción:"
    )
    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.5, "num_predict": 100},
    }).encode()
    req = urllib.request.Request(OLLAMA_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.loads(r.read()).get("response", "").strip()
            # Limpiar prefijos comunes
            for p in ["Descripción:", "Aquí tienes", "Claro,"]:
                if resp.startswith(p):
                    resp = resp[len(p):].strip()
            return resp[:220]
    except Exception as e:
        log.warning(f"Ollama error: {e}")
        return descripcion_extra[:200]


# ── D1 helpers ────────────────────────────────────────────────────────────────
def d1_query(sql, params=None):
    import urllib.request as ur
    body = json.dumps({"sql": sql, **({"params": params} if params else {})}).encode()
    req = ur.Request(D1_URL, data=body, method="POST")
    for k, v in D1_HEADERS.items():
        req.add_header(k, v)
    with ur.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    if not data.get("success"):
        raise Exception(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]


def evento_existe(ev_id):
    rows = d1_query("SELECT id FROM eventos_geo WHERE id = ?", [ev_id])
    return len(rows) > 0


def insertar(ev_id, nombre, tipo, ciudad, fecha, descripcion, lat, lon, dry_run):
    RADIO = {"procesion": 300, "feria": 800, "festival": 600, "deporte": 500, "cultura": 400}
    DIAS  = {"procesion": 3,   "feria": 7,   "festival": 5,   "deporte": 2,   "cultura": 2}
    radio = RADIO.get(tipo, 500)
    dias  = DIAS.get(tipo, 3)

    if dry_run:
        log.info(f"  [DRY] {ev_id} | {nombre} | {ciudad} | {fecha}")
        return True

    d1_query("""
        INSERT OR IGNORE INTO eventos_geo
          (id, nombre, tipo, ciudad, fecha, lat, lon, radio_m, descripcion,
           activo, estado, dias_previos_envio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'aprobado', ?)
    """, [ev_id, nombre, tipo, ciudad, fecha, lat, lon, radio, descripcion, dias])
    return True


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Importa fiestas oficiales de España")
    parser.add_argument("--anio",    type=int, default=date.today().year)
    parser.add_argument("--ciudad",  type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    log.info(f"=== Inicio importar_fiestas_calendario | anio={args.anio} dry-run={args.dry_run} ===")

    fiestas = generar_fiestas(args.anio)

    if args.ciudad:
        fiestas = [f for f in fiestas if f["ciudad"].lower() == args.ciudad.lower()]

    log.info(f"Fiestas a procesar: {len(fiestas)}")

    ok = saltadas = errores = 0

    for fiesta in fiestas:
        nombre  = fiesta["nombre"]
        ciudad  = fiesta["ciudad"]
        fecha   = fiesta["fecha"]
        tipo    = fiesta["tipo"]
        extra   = fiesta.get("descripcion_extra", "")

        ev_id = "cal_" + hashlib.md5(f"{nombre}_{ciudad}_{fecha}".encode()).hexdigest()[:10]

        if evento_existe(ev_id):
            log.info(f"  SKIP (ya existe): {nombre} ({ciudad})")
            saltadas += 1
            continue

        coords = COORDS.get(ciudad)
        if not coords:
            log.warning(f"  Sin coords para {ciudad} — saltando {nombre}")
            errores += 1
            continue

        lat, lon = coords

        # Generar descripción con Ollama
        descripcion = generar_descripcion(nombre, ciudad, tipo, fecha, extra)
        log.info(f"  {nombre} ({ciudad} · {fecha}) → {descripcion[:60]}...")

        try:
            insertar(ev_id, nombre, tipo, ciudad, fecha, descripcion, lat, lon, args.dry_run)
            ok += 1
        except Exception as e:
            log.error(f"  ERROR insertando {nombre}: {e}")
            errores += 1

        time.sleep(0.3)

    log.info(f"=== Fin | Insertados: {ok} | Ya existían: {saltadas} | Errores: {errores} ===")


if __name__ == "__main__":
    main()
