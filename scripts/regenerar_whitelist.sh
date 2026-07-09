#!/bin/bash
# Regenera la lista blanca de fichas con tráfico y, si cambió, commitea + despliega.
# Cron mensual. Ver scripts/regenerar_whitelist.py y project_tresycuarto_spam_penalty.
set -e
cd /root/tresycuarto-sync
source /root/.tresycuarto_env
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

LOG="/root/tresycuarto-sync/logs/regenerar_whitelist.log"
echo "=== $(date '+%Y-%m-%d %H:%M') regenerar_whitelist ===" >> "$LOG"

RES=$(python3 scripts/regenerar_whitelist.py 2>>"$LOG") || { echo "  fallo python: $RES" >> "$LOG"; exit 1; }
echo "  $RES" >> "$LOG"

if [[ "$RES" == CHANGED* ]]; then
  HOME=/root git add functions/_ranking_whitelist.js
  HOME=/root git commit -q -m "chore(seo): actualiza lista blanca de fichas con tráfico ($RES)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
  HOME=/root git push -q origin main >> "$LOG" 2>&1
  bash scripts/deploy.sh >> "$LOG" 2>&1 && echo "  desplegado OK" >> "$LOG"
else
  echo "  sin cambios, no despliego" >> "$LOG"
fi
