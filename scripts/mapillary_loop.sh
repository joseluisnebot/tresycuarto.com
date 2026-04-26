#!/bin/bash
# Loop permanente: descarga fotos Mapillary para todas las ciudades
CIUDADES=(
  "Barcelona" "Madrid" "Valencia" "Sevilla" "Málaga"
  "Bilbao" "Zaragoza" "Murcia" "Palma" "Las Palmas"
  "Córdoba" "Valladolid" "Alicante" "Vigo" "Gijón"
  "Granada" "La Coruña" "Vitoria" "Santander" "Pamplona"
  "Albacete" "Almería" "Badajoz" "Burgos" "Cáceres"
  "Cádiz" "Cartagena" "Ciudad Real" "Cuenca" "Girona"
  "Guadalajara" "Huelva" "Huesca" "Jaén" "Jerez de la Frontera"
  "León" "Lleida" "Logroño" "Lugo" "Oviedo"
  "Palencia" "Pontevedra" "Salamanca" "San Sebastián" "Santa Cruz de Tenerife"
  "Segovia" "Soria" "Tarragona" "Teruel" "Toledo"
  "Zamora" "Alcalá de Henares" "Algeciras" "Arona" "Altea"
  "Barakaldo" "Benidorm" "Cullera" "Dénia" "Getafe"
  "Leganés" "Móstoles" "Santa Pola" "Torrevieja" "Vinaròs"
)

export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
export CLOUDFLARE_ACCOUNT_ID="0c4d9c91bb0f3a4c905545ecc158ec65"

LOG_DIR="/root/tresycuarto-sync/logs"
SCRIPTS_DIR="/root/tresycuarto-sync/scripts"
mkdir -p "$LOG_DIR"

while true; do
  for CIUDAD in "${CIUDADES[@]}"; do
    SLUG=$(echo "$CIUDAD" | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '_' | sed 's/_*$//')
    LOGFILE="$LOG_DIR/mapillary_${SLUG}.log"
    echo "[$(date '+%Y-%m-%d %H:%M')] Iniciando $CIUDAD..." >> "$LOGFILE"
    python3 -u "$SCRIPTS_DIR/mapillary_fotos.py" --ciudad "$CIUDAD" --limite 500 >> "$LOGFILE" 2>&1
    sleep 10
  done
  echo "[$(date '+%Y-%m-%d %H:%M')] Vuelta completa. Pausa 6h..." >> "$LOG_DIR/mapillary_loop.log"
  sleep 21600
done
