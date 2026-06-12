#!/usr/bin/env bash
#
# deploy.sh — Despliegue SEGURO de tresycuarto.com a Cloudflare Pages.
#
# Por qué existe: en el pasado se desplegó repetidamente desde un working tree
# "sucio" cuyo public/_routes.json excluía /locales/* — eso dejó TODAS las fichas
# de local en 404 durante mucho tiempo sin que se viera en git. Este script
# impide que vuelva a pasar y verifica el resultado tras desplegar.
#
# Uso:
#   export CLOUDFLARE_API_TOKEN=<token master>      # NO se hardcodea aquí (repo público)
#   export CLOUDFLARE_ACCOUNT_ID=0c4d9c91bb0f3a4c905545ecc158ec65
#   bash scripts/deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT="tresycuarto"
DOMAIN="https://tresycuarto.com"
red(){ printf '\033[31m%s\033[0m\n' "$*"; }
grn(){ printf '\033[32m%s\033[0m\n' "$*"; }
ylw(){ printf '\033[33m%s\033[0m\n' "$*"; }

fail(){ red "❌ ABORTADO: $*"; exit 1; }

# ── Credenciales (de entorno, nunca en el repo) ────────────────────────────────
: "${CLOUDFLARE_API_TOKEN:?Falta CLOUDFLARE_API_TOKEN en el entorno}"
: "${CLOUDFLARE_ACCOUNT_ID:=0c4d9c91bb0f3a4c905545ecc158ec65}"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

# ── GUARDA 1 — No desplegar con cambios sin commitear ──────────────────────────
# Regla del proyecto: "si no hay commit, no hay deploy". El commit es la garantía
# de que lo que se despliega es exactamente lo que está en git.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  red "Hay cambios trackeados sin commitear:"; git status --short
  fail "Haz commit (y push) ANTES de desplegar."
fi
grn "✓ Working tree limpio (sin cambios trackeados sin commitear)"

# ── GUARDA 2 — _routes.json no debe excluir rutas dinámicas ────────────────────
# exclude = "no ejecutar Functions, servir estático". /locales/* y / tienen
# Functions (fichas y redirect bio); excluirlos = 404 / features rotas.
for forbidden in "/locales/\*" "^\s*\"/\"\s*,"; do
  if grep -qE "$forbidden" public/_routes.json; then
    red "public/_routes.json contiene una exclusión prohibida que rompería el acceso:"
    grep -nE "/locales/\*|^\s*\"/\"\s*," public/_routes.json || true
    fail "Quita '/locales/*' y '/' de la lista exclude antes de desplegar."
  fi
done
grn "✓ public/_routes.json no excluye /locales/* ni / (las fichas y la home usan Functions)"

# ── GUARDA 3 — Sin secretos hardcodeados en Functions ──────────────────────────
# Endpoints y código que va a un repo PÚBLICO: las credenciales van por env/Secrets.
if grep -rnE "(xkeysib-[a-f0-9]{20,}|sk_(live|test)_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,}|uGsFIP9aSpVW|tc_browser_2026|token\s*!==\s*\"admin\")" functions/ 2>/dev/null; then
  fail "Hay un secreto/credencial hardcodeado en functions/. Muévelo a un Pages Secret y léelo de env.<NOMBRE>."
fi
grn "✓ Sin secretos hardcodeados en functions/"

# ── GUARDA 4 — Sin SELECT * en endpoints públicos de la tabla locales ──────────
# SELECT * filtra columnas privadas (email, email_personal). Enumerar columnas.
if grep -rnE "SELECT \* FROM locales" functions/api/locales functions/api/app functions/locales 2>/dev/null; then
  fail "Hay 'SELECT * FROM locales' en un endpoint público — enumera columnas y excluye email/email_personal/email_outreach_sent."
fi
grn "✓ Sin 'SELECT * FROM locales' en endpoints públicos"

# ── BUILD ──────────────────────────────────────────────────────────────────────
ylw "▶ npm run build…"
npm run build >/tmp/tc_build.log 2>&1 || { tail -30 /tmp/tc_build.log; fail "El build falló."; }
grn "✓ Build OK"

# ── GUARDA 5 — Verificar el _routes.json YA construido (out/) ───────────────────
# Doble check: lo que realmente se va a subir no debe excluir /locales/* ni /.
python3 - <<'PY' || exit 1
import json,sys
ex=json.load(open("out/_routes.json"))["exclude"]
bad=[r for r in ex if r=="/" or r=="/locales/*"]
if bad:
    print("❌ out/_routes.json excluye:",bad); sys.exit(1)
print("✓ out/_routes.json correcto (exclude sin /locales/* ni /)")
PY

# ── DEPLOY ─────────────────────────────────────────────────────────────────────
ylw "▶ Desplegando a Cloudflare Pages…"
npx wrangler pages deploy out --project-name="$PROJECT" --branch=main

# ── SMOKE TEST tras desplegar ──────────────────────────────────────────────────
ylw "▶ Smoke test en $DOMAIN (cache-buster para evitar caché de edge)…"
sleep 5
bust(){ echo "?v=$RANDOM$RANDOM"; }
problems=0

check_200(){ # url etiqueta
  local code; code=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN$1$(bust)")
  if [ "$code" = "200" ]; then grn "  ✓ $2 ($1) → 200"; else red "  ✗ $2 ($1) → $code"; problems=$((problems+1)); fi
}
# Routing de fichas: una URL de ficha DEBE ejecutar la Function, no el 404 de Next.
check_fiche_routing(){
  local body; body=$(curl -s "$DOMAIN/locales/madrid/__deploy_routing_check__$(bust)")
  if echo "$body" | grep -q "This page could not be found"; then
    red "  ✗ ROUTING DE FICHAS ROTO: /locales/[ciudad]/[slug] sirve el 404 estático de Next (la Function no se ejecuta)."
    problems=$((problems+1))
  else
    grn "  ✓ Routing de fichas OK (la Function /locales/[ciudad]/[slug] se ejecuta)"
  fi
}

check_200 "/" "Home"
check_200 "/locales/madrid/" "Página de ciudad"
check_200 "/eventos/" "Eventos"
check_200 "/para-locales/" "Para locales"
check_fiche_routing

if [ "$problems" -ne 0 ]; then
  red "⚠ Despliegue hecho pero el smoke test detectó $problems problema(s). Revisa arriba."
  exit 1
fi
grn "✅ Despliegue verificado: home, ciudad y routing de fichas OK."
