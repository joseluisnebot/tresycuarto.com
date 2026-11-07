#!/usr/bin/env python3
"""
Repasa los eventos futuros activos con el filtro de tardeo de scraper_eventos.py
(lista acordada con JL el 07/11/2026) y desactiva los que no encajan. No borra nada.

A los de Madrid, que entraron sin hora ni categoría, primero les rellena ambas
desde el JSON de datos abiertos (mismo id que usa el scraper).

Uso:
  python3 refiltrar_eventos.py            # simulación: solo cuenta
  python3 refiltrar_eventos.py --aplicar  # escribe en D1 y guarda cómo deshacerlo

Deshacer: el fichero /root/.tresycuarto_refiltro_<fecha>.json lista cada evento
con su tipo y hora anteriores (UPDATE eventos_geo SET activo=1, tipo=?, hora_inicio=? WHERE id=?).
"""
import argparse, collections, hashlib, json, sys
from datetime import datetime

import scraper_eventos as S

MADRID = next(f for f in S.FUENTES if f["id"] == "madrid")


def madrid_por_id():
    """id del scraper → (tipo, hora) leídos con el mismo mapa que procesar_madrid."""
    import re, ast
    src = open(S.__file__).read()
    i = src.index('"TeatroPerformance"')
    tipo_map = ast.literal_eval(re.sub(r"#.*", "", src[src.rindex("{", 0, i):src.index("}", i) + 1]))
    data = json.loads(S.fetch(MADRID["url"]) or "{}")
    items = data if isinstance(data, list) else data.get("@graph", [])
    out = {}
    for it in items:
        nombre = it.get("title", "") or it.get("dtitle", "")
        fecha_raw = it.get("dtstart", "") or ""
        ev_id = "ev_" + hashlib.md5(f"{nombre}_Madrid_{fecha_raw[:10]}".encode()).hexdigest()[:10]
        hora = (it.get("time") or "").strip()[:5] or None
        if not hora and len(fecha_raw) >= 16 and fecha_raw[11:16] != "00:00":
            hora = fecha_raw[11:16]
        out[ev_id] = (tipo_map.get((it.get("@type") or "").rsplit("/", 1)[-1], "otro"), hora)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aplicar", action="store_true")
    a = ap.parse_args()

    eventos = S.d1_query(
        "SELECT id, nombre, tipo, ciudad, fecha, descripcion, hora_inicio FROM eventos_geo "
        "WHERE activo = 1 AND fecha >= date('now')")
    print(f"{len(eventos)} eventos futuros activos")

    mad = madrid_por_id()
    completar, desactivar = [], []
    motivos, por_ciudad = collections.Counter(), collections.Counter()
    for ev in eventos:
        tipo, hora = ev["tipo"], ev["hora_inicio"]
        if ev["id"] in mad and ev["ciudad"] == "Madrid":
            t_new, h_new = mad[ev["id"]]
            if (t_new, h_new) != (tipo, hora) and (tipo == "otro" or not hora):
                completar.append((ev, t_new, h_new))
                tipo, hora = t_new, h_new or hora
        m = S.motivo_descarte(ev["nombre"], tipo, ev["descripcion"] or "", hora, ev["fecha"])
        if m:
            desactivar.append((ev, m))
            motivos[m.split(" (")[0]] += 1
            por_ciudad[ev["ciudad"]] += 1

    print(f"Madrid: {len(completar)} eventos a los que se rellena tipo/hora")
    print(f"Se desactivan {len(desactivar)} · quedan {len(eventos) - len(desactivar)}")
    for k, n in motivos.most_common():
        print(f"  {n:4}  {k}")
    print("Por ciudad:", dict(por_ciudad.most_common(8)))
    for ev, m in desactivar[:12]:
        print(f"    - {ev['ciudad']:10} {ev['nombre'][:55]:55} [{m}]")

    if not a.aplicar:
        print("\n(simulación: no se ha escrito nada; usa --aplicar)")
        return

    deshacer = [{"id": ev["id"], "tipo": ev["tipo"], "hora_inicio": ev["hora_inicio"],
                 "activo": 1} for ev, _, _ in completar] + \
               [{"id": ev["id"], "tipo": ev["tipo"], "hora_inicio": ev["hora_inicio"],
                 "activo": 1} for ev, _ in desactivar]
    ruta = f"/root/.tresycuarto_refiltro_{datetime.now():%Y%m%d_%H%M}.json"
    json.dump(deshacer, open(ruta, "w"), ensure_ascii=False, indent=1)
    print(f"\nCómo deshacer guardado en {ruta}")

    for ev, t_new, h_new in completar:
        S.d1_query("UPDATE eventos_geo SET tipo = ?, hora_inicio = COALESCE(?, hora_inicio) WHERE id = ?",
                   [t_new, h_new, ev["id"]])
    ids = [ev["id"] for ev, _ in desactivar]
    for i in range(0, len(ids), 80):
        lote = ids[i:i + 80]
        S.d1_query(f"UPDATE eventos_geo SET activo = 0 WHERE id IN ({','.join('?' * len(lote))})", lote)
    print(f"Hecho: {len(completar)} completados, {len(ids)} desactivados.")


if __name__ == "__main__":
    main()
