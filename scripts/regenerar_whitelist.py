#!/usr/bin/env python3
"""
Regenera functions/_ranking_whitelist.js a partir del último CSV de Páginas de
Google Search Console en /root/inbox (el de tresycuarto, no el de lamevaescola).

Diseño SEGURO: la lista blanca solo CRECE (unión con la existente). Nunca quita
una ficha ya protegida, aunque un mes deje de recibir tráfico → jamás noindexamos
por accidente una página que rankeó antes.

Criterio de inclusión: fichas /locales/ciudad/slug con clicks>0 O impresiones>=50.

Salida (stdout): "CHANGED <n_nuevas>" si añadió fichas, "UNCHANGED" si no.
"""
import csv, re, glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WL_FILE = os.path.join(ROOT, "functions", "_ranking_whitelist.js")
FICHA_RE = re.compile(r'tresycuarto\.com(/locales/[a-z-]+/[a-z0-9-]+)$')


def cargar_existente():
    if not os.path.exists(WL_FILE):
        return set()
    txt = open(WL_FILE, encoding="utf-8").read()
    m = re.search(r'new Set\((\[.*\])\)', txt, re.S)
    return set(json.loads(m.group(1))) if m else set()


def ultimo_csv_tresycuarto():
    """El _Páginas.csv más reciente que contenga URLs de tresycuarto.com."""
    candidatos = sorted(glob.glob("/root/inbox/*_Páginas.csv"), reverse=True)
    for path in candidatos:
        try:
            with open(path, encoding="utf-8") as f:
                head = f.read(4000)
            if "tresycuarto.com" in head:
                return path
        except Exception:
            continue
    return None


def paths_desde_csv(path):
    out = set()
    with open(path, encoding="utf-8") as f:
        for row in csv.reader(f):
            if len(row) < 3 or not row[1].isdigit():
                continue
            clicks = int(row[1])
            imp = int(row[2]) if row[2].isdigit() else 0
            m = FICHA_RE.search(row[0])
            if m and (clicks > 0 or imp >= 50):
                out.add(m.group(1))
    return out


def main():
    csv_path = ultimo_csv_tresycuarto()
    if not csv_path:
        print("ABORT: no hay CSV de Páginas de tresycuarto en /root/inbox", file=sys.stderr)
        sys.exit(2)

    existente = cargar_existente()
    nuevos = paths_desde_csv(csv_path)
    union = existente | nuevos
    anadidas = union - existente

    if not anadidas:
        print("UNCHANGED")
        return

    wl = sorted(union)
    with open(WL_FILE, "w", encoding="utf-8") as f:
        f.write("// Fichas que reciben tráfico en GSC (clicks>0 o impresiones>=50).\n")
        f.write("// Nunca se noindexan aunque no lleguen al umbral de reseñas.\n")
        f.write("// Regenerado automáticamente por scripts/regenerar_whitelist.py (solo añade).\n")
        f.write("export const RANKING = new Set(" + json.dumps(wl, ensure_ascii=False) + ");\n")
    print(f"CHANGED {len(anadidas)}")


if __name__ == "__main__":
    main()
