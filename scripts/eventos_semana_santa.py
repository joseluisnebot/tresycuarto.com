#!/usr/bin/env python3
"""
Carga los eventos de Semana Santa 2026 en D1.
Cada evento = una procesión con punto de referencia (salida/recorrido principal).
"""
import os
import json, urllib.request, os

API_TOKEN  = os.environ["CLOUDFLARE_API_TOKEN"]
ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DB_ID      = "458672aa-392f-4767-8d2b-926406628ba0"
API_URL    = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DB_ID}/query"

# Procesiones principales Semana Santa 2026
# lat/lon = punto de salida o centro del recorrido
# radio_m = metros alrededor del punto para buscar locales
EVENTOS = [
  # SEVILLA
  {"id":"ss26_sev_madrugada","nombre":"Madrugá de Sevilla","tipo":"procesion","ciudad":"Sevilla","fecha":"2026-04-02","lat":37.3891,"lon":-5.9845,"radio_m":400,"descripcion":"Las grandes hermandades de la Madrugá recorren el centro de Sevilla en la noche del Jueves al Viernes Santo."},
  {"id":"ss26_sev_jueves","nombre":"Procesiones Jueves Santo Sevilla","tipo":"procesion","ciudad":"Sevilla","fecha":"2026-04-01","lat":37.3863,"lon":-5.9927,"radio_m":400,"descripcion":"Las cofradías del Jueves Santo salen desde la Macarena y el centro histórico de Sevilla."},
  {"id":"ss26_sev_domingo_ramos","nombre":"Domingo de Ramos Sevilla","tipo":"procesion","ciudad":"Sevilla","fecha":"2026-03-29","lat":37.3891,"lon":-5.9845,"radio_m":350,"descripcion":"La Borriquita abre la Semana Santa de Sevilla el Domingo de Ramos."},

  # MÁLAGA
  {"id":"ss26_mlg_viernes","nombre":"Procesión Viernes Santo Málaga","tipo":"procesion","ciudad":"Málaga","fecha":"2026-04-03","lat":36.7213,"lon":-4.4213,"radio_m":400,"descripcion":"El Cristo de la Buena Muerte y otras hermandades recorren el centro de Málaga el Viernes Santo."},
  {"id":"ss26_mlg_jueves","nombre":"Procesiones Jueves Santo Málaga","tipo":"procesion","ciudad":"Málaga","fecha":"2026-04-01","lat":36.7196,"lon":-4.4200,"radio_m":350,"descripcion":"Las cofradías del Jueves Santo en Málaga parten desde la Catedral y el centro histórico."},

  # CÁDIZ
  {"id":"ss26_cdz_jueves","nombre":"Procesiones Jueves Santo Cádiz","tipo":"procesion","ciudad":"Cádiz","fecha":"2026-04-01","lat":36.5271,"lon":-6.2886,"radio_m":300,"descripcion":"Las hermandades del Jueves Santo recorren el casco histórico de Cádiz."},
  {"id":"ss26_cdz_viernes","nombre":"Viernes Santo Cádiz","tipo":"procesion","ciudad":"Cádiz","fecha":"2026-04-03","lat":36.5341,"lon":-6.2996,"radio_m":300,"descripcion":"Procesión del Santo Entierro por las calles del centro histórico de Cádiz."},

  # CÓRDOBA
  {"id":"ss26_cor_viernes","nombre":"Viernes Santo Córdoba","tipo":"procesion","ciudad":"Córdoba","fecha":"2026-04-03","lat":37.8882,"lon":-4.7794,"radio_m":350,"descripcion":"Las procesiones del Viernes Santo de Córdoba recorren el casco histórico junto a la Mezquita-Catedral."},
  {"id":"ss26_cor_martes","nombre":"Martes Santo Córdoba","tipo":"procesion","ciudad":"Córdoba","fecha":"2026-03-31","lat":37.8856,"lon":-4.7760,"radio_m":300,"descripcion":"Procesión del Martes Santo en el centro histórico de Córdoba."},

  # GRANADA
  {"id":"ss26_gra_martes","nombre":"Martes Santo Granada","tipo":"procesion","ciudad":"Granada","fecha":"2026-03-31","lat":37.1773,"lon":-3.5986,"radio_m":350,"descripcion":"Las hermandades del Martes Santo recorren el centro de Granada con la Alhambra de fondo."},
  {"id":"ss26_gra_viernes","nombre":"Viernes Santo Granada","tipo":"procesion","ciudad":"Granada","fecha":"2026-04-03","lat":37.1764,"lon":-3.5998,"radio_m":350,"descripcion":"Procesiones del Viernes Santo en Granada, con recorridos por el Albaicín y el centro."},

  # JEREZ DE LA FRONTERA
  {"id":"ss26_jer_jueves","nombre":"Jueves Santo Jerez","tipo":"procesion","ciudad":"Jerez de la Frontera","fecha":"2026-04-01","lat":36.6864,"lon":-6.1375,"radio_m":300,"descripcion":"Las hermandades del Jueves Santo salen desde el centro de Jerez de la Frontera."},

  # VALLADOLID
  {"id":"ss26_vll_procesion_general","nombre":"Procesión General Valladolid","tipo":"procesion","ciudad":"Valladolid","fecha":"2026-04-03","lat":41.6523,"lon":-4.7245,"radio_m":400,"descripcion":"La Procesión General del Viernes Santo de Valladolid, la más importante de Castilla y León."},
  {"id":"ss26_vll_jueves","nombre":"Jueves Santo Valladolid","tipo":"procesion","ciudad":"Valladolid","fecha":"2026-04-01","lat":41.6510,"lon":-4.7280,"radio_m":350,"descripcion":"Procesiones del Jueves Santo en el centro histórico de Valladolid."},

  # ZAMORA
  {"id":"ss26_zam_martes","nombre":"Martes Santo Zamora","tipo":"procesion","ciudad":"Zamora","fecha":"2026-03-31","lat":41.5034,"lon":-5.7447,"radio_m":300,"descripcion":"Procesión del Martes Santo en el casco histórico de Zamora, la Semana Santa más antigua de España."},
  {"id":"ss26_zam_viernes","nombre":"Viernes Santo Zamora","tipo":"procesion","ciudad":"Zamora","fecha":"2026-04-03","lat":41.5020,"lon":-5.7460,"radio_m":300,"descripcion":"La procesión del Santo Entierro, la más solemne de la Semana Santa de Zamora."},

  # CARTAGENA
  {"id":"ss26_car_marrajos","nombre":"Procesión Marrajos Cartagena","tipo":"procesion","ciudad":"Cartagena","fecha":"2026-04-01","lat":37.6053,"lon":-0.9861,"radio_m":300,"descripcion":"La procesión de los Marrajos, uno de los dos grupos cofrades de la espectacular Semana Santa de Cartagena."},
  {"id":"ss26_car_californios","nombre":"Procesión Californios Cartagena","tipo":"procesion","ciudad":"Cartagena","fecha":"2026-04-02","lat":37.6053,"lon":-0.9861,"radio_m":300,"descripcion":"Los Californios, el otro gran grupo cofrade de Cartagena, en su desfile del Viernes Santo."},

  # LORCA
  {"id":"ss26_lor_desfile","nombre":"Desfiles Bíblicos Lorca","tipo":"procesion","ciudad":"Lorca","fecha":"2026-04-01","lat":37.6709,"lon":-1.6990,"radio_m":250,"descripcion":"Los espectaculares bordados Patrimonio de la Humanidad desfilan en la Semana Santa de Lorca."},

  # CUENCA
  {"id":"ss26_cue_musica","nombre":"Semana de Música Religiosa Cuenca","tipo":"festival","ciudad":"Cuenca","fecha":"2026-03-29","lat":40.0704,"lon":-2.1374,"radio_m":300,"descripcion":"La Semana de Música Religiosa de Cuenca, uno de los festivales más importantes del mundo, coincide con la Semana Santa."},

  # LEÓN
  {"id":"ss26_leo_capas_pardas","nombre":"Procesión Capas Pardas León","tipo":"procesion","ciudad":"León","fecha":"2026-04-01","lat":42.5987,"lon":-5.5671,"radio_m":300,"descripcion":"La procesión de las Capas Pardas, símbolo de la Semana Santa de León, Interés Turístico Internacional."},

  # MURCIA
  {"id":"ss26_mur_viernes","nombre":"Viernes Santo Murcia","tipo":"procesion","ciudad":"Murcia","fecha":"2026-04-03","lat":37.9922,"lon":-1.1307,"radio_m":300,"descripcion":"Procesiones del Viernes Santo en el centro de Murcia con los célebres pasos de Salzillo."},
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


def main():
    sql = """INSERT OR REPLACE INTO eventos_geo
      (id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, lat, lon, radio_m, descripcion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
    for e in EVENTOS:
        d1_query(sql, [e["id"], e["nombre"], e["tipo"], e["ciudad"], e["fecha"],
                       e.get("hora_inicio"), e.get("direccion"),
                       e["lat"], e["lon"], e["radio_m"], e["descripcion"]])
        print(f"  ✓ {e['nombre']}")
    print(f"\nTotal: {len(EVENTOS)} eventos cargados.")


if __name__ == "__main__":
    main()
