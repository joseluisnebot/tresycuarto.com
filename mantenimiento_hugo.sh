#!/usr/bin/env bash
set -euo pipefail

# CONFIG editable
REPO="/home/papa/proyectos/tresycuarto/tresycuarto.com"
CFG="$REPO/hugo.yaml"
POST_DIR="$REPO/content/post"
ARCHIVE_DIR="$REPO/content/post-archivo"
IMAGES_DIR="$REPO/static/images/noticias"

DAYS=70          # días para archivar/borrar
PAGINATE=50      # tamaño de paginación
CLEAN_IMAGES=1   # 1= borrar imágenes antiguas; 0= no borrar
DRY_RUN=0        # 1= no ejecuta cambios, solo muestra

usage() {
  cat <<USAGE
Uso: $(basename "$0") [opciones]
  -d N       Archivar/borrar contenidos con más de N días (por defecto $DAYS)
  -p N       Establecer paginate a N (por defecto $PAGINATE)
  -n         Dry-run (no hace cambios, solo muestra)
  --no-images  No borrar imágenes antiguas
Ejemplos:
  $(basename "$0") -n
  $(basename "$0") -d 120 -p 100
USAGE
}

# Parse args
while (( "$#" )); do
  case "${1:-}" in
    -d) DAYS="${2:-}"; shift 2;;
    -p) PAGINATE="${2:-}"; shift 2;;
    -n) DRY_RUN=1; shift;;
    --no-images) CLEAN_IMAGES=0; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Opción desconocida: $1" >&2; usage; exit 1;;
  esac
done

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

echo "==> Repo: $REPO"
echo "==> Días: $DAYS | paginate: $PAGINATE | borrar imágenes: $CLEAN_IMAGES | dry-run: $DRY_RUN"

# 0) Comprobaciones básicas
if [ ! -d "$REPO/.git" ]; then
  echo "ERROR: $REPO no parece un repo git" >&2; exit 2
fi
if [ ! -f "$CFG" ]; then
  echo "ERROR: No existe config $CFG" >&2; exit 2
fi

# 1) Asegurar configuración en hugo.yaml
echo "==> Asegurando configuración en $CFG (sin aliases y paginate=$PAGINATE)"

# Quitar bloque antiguo 'pagination:' si existe (Hugo no lo usa)
run "sed -i '/^pagination:/,/^[^[:space:]]/d' \"$CFG\""

# disableAliases: true
if grep -q '^[[:space:]]*disableAliases:' "$CFG"; then
  run "sed -i 's/^[[:space:]]*disableAliases:.*/disableAliases: true/' \"$CFG\""
else
  run "printf '\n%s\n' 'disableAliases: true' >> \"$CFG\""
fi

# build.writeAliases: false
if grep -q '^[[:space:]]*build:' "$CFG"; then
  if grep -q '^[[:space:]]*writeAliases:' "$CFG"; then
    run "sed -i 's/^[[:space:]]*writeAliases:.*/  writeAliases: false/' \"$CFG\""
  else
    run "sed -i '/^build:/a \  writeAliases: false' \"$CFG\""
  fi
else
  run "printf '\n%s\n%s\n' 'build:' '  writeAliases: false' >> \"$CFG\""
fi

# paginate: N
if grep -q '^[[:space:]]*paginate:' "$CFG"; then
  run "sed -i 's/^[[:space:]]*paginate:.*/paginate: $PAGINATE/' \"$CFG\""
else
  run "sed -i '/^theme:/a paginate: $PAGINATE' \"$CFG\""
fi

# 2) Crear sección de archivo (no render)
echo '==> Creando sección de archivo (no render) si no existe'
run "mkdir -p \"$ARCHIVE_DIR\""
if [ ! -f "$ARCHIVE_DIR/_index.md" ]; then
  run "cat > \"$ARCHIVE_DIR/_index.md\" <<'EOM'
---
title: \"Archivo (no publicado)\"
_build:
  render: false
  list: false
  publishResources: false
cascade:
  _build:
    render: false
    list: false
    publishResources: false
---
EOM"
fi

# 3) Mover posts > DAYS días a archivo conservando estructura
echo "==> Archivando posts de > ${DAYS} días desde $POST_DIR a $ARCHIVE_DIR"
COUNT_BEFORE=$(find "$POST_DIR" -type f -name '*.md' | wc -l || true)
TO_MOVE=$(find "$POST_DIR" -type f -name '*.md' -mtime +$DAYS -print0 | xargs -0 -I{} echo {} | wc -l || true)
echo "   Posts actuales: $COUNT_BEFORE | A archivar: $TO_MOVE"

if [ "$TO_MOVE" -gt 0 ]; then
  while IFS= read -r -d '' f; do
    rel="${f#$POST_DIR/}"
    dst="$ARCHIVE_DIR/$rel"
    run "mkdir -p \"\$(dirname \"$dst\")\""
    run "git mv -f \"$f\" \"$dst\""
  done < <(find "$POST_DIR" -type f -name '*.md' -mtime +$DAYS -print0)
else
  echo "   No hay posts para archivar (> ${DAYS} días)."
fi

# 4) (Opcional) Borrar imágenes antiguas
if [ "$CLEAN_IMAGES" -eq 1 ] && [ -d "$IMAGES_DIR" ]; then
  echo "==> Borrando imágenes en $IMAGES_DIR de > ${DAYS} días"
  run "find \"$IMAGES_DIR\" -type f -mtime +$DAYS -print -delete"
else
  echo "==> Salto borrado de imágenes (desactivado o carpeta no existe)"
fi

# 5) Limpieza de 'aliases' residuales en front matter (YAML/TOML) por si acaso
echo "==> Limpiando 'aliases' en front matter de todos los .md (YAML y TOML)"
run "find \"$REPO/content\" -type f -name '*.md' -print0 | xargs -0 perl -0777 -i -pe \"
  s/^\\s*aliases:\\s*\\[[^\\]]*\\]\\s*\\n?//gm;
  s/^\\s*aliases:\\s*\\n(?:\\s*-\\s*.*\\n)+//gm;
  s/^\\s*aliases\\s*=\\s*\\[[^\\]]*\\]\\s*\\n?//gm;
  s/^\\s*aliases\\s*=\\s*\\[(?:[^\\]]|\\n)*\\]\\s*\\n?//gm;
\""

# 6) Commit & push
if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] git add -A && git commit -m 'mantenimiento: sin aliases, paginate=$PAGINATE, archivo >${DAYS}d' && git push"
else
  echo "==> Haciendo commit & push"
  git add -A
  git commit -m "mantenimiento: sin aliases, paginate=$PAGINATE, archivo >${DAYS}d"
  git push
fi

echo "==> Terminado. Revisa el despliegue en Cloudflare Pages:"
echo "    - Aliases debe salir 0"
echo "    - Pages bajará según lo archivado"
echo "    - Paginator pages debería bajar con paginate=$PAGINATE"
