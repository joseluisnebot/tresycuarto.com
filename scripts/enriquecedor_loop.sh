#!/bin/bash
# Bucle permanente del agente enriquecedor — ciudad a ciudad
CIUDADES=("Madrid" "Barcelona" "Valencia" "Sevilla" "Bilbao" "Málaga" "Zaragoza" "Murcia")
SCRIPTS_DIR="$(dirname "$0")"
LOG_DIR="$SCRIPTS_DIR/../logs"

export CLOUDFLARE_API_TOKEN="WCvwZkoXOw_qE6onJYlsVrqupNoIt3msrgo2WGIM"
export CLOUDFLARE_ACCOUNT_ID="0c4d9c91bb0f3a4c905545ecc158ec65"

mkdir -p "$LOG_DIR"

while true; do
  for CIUDAD in "${CIUDADES[@]}"; do
    LOGFILE="$LOG_DIR/enriquecedor_$(echo $CIUDAD | tr '[:upper:]' '[:lower:]' | tr -d 'áéíóúü' | sed 's/á/a/g;s/é/e/g;s/í/i/g;s/ó/o/g;s/ú/u/g;s/ü/u/g;s/Á/a/g;s/É/e/g;s/Ó/o/g;s/Ú/u/g;s/Ü/u/g' | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null || echo $CIUDAD | tr '[:upper:]' '[:lower:]').log"
    echo "[$(date '+%Y-%m-%d %H:%M')] Iniciando $CIUDAD..." >> "$LOGFILE"
    python3 "$SCRIPTS_DIR/enriquecedor.py" --ciudad "$CIUDAD" --limite 100 >> "$LOGFILE" 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M')] Fin $CIUDAD. Pausa 5 min..." >> "$LOGFILE"
    sleep 300
  done
  echo "[$(date '+%Y-%m-%d %H:%M')] Vuelta completa. Pausa 2h..." >> "$LOG_DIR/enriquecedor_loop.log"
  sleep 7200
done
