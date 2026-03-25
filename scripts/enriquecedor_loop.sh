#!/bin/bash
# Bucle permanente del agente enriquecedor — todas las ciudades publicadas
CIUDADES=(
  "Albacete" "Alcalá de Henares" "Algeciras" "Almería" "Altea"
  "Arona" "Ávila" "Badajoz" "Barakaldo" "Barcelona"
  "Benidorm" "Bilbao" "Burgos" "Cáceres" "Cádiz"
  "Cartagena" "Ciudad Real" "Córdoba" "Cuenca" "Cullera"
  "Dénia" "Getafe" "Girona" "Granada" "Guadalajara"
  "Huelva" "Huesca" "Jaén" "Jerez de la Frontera" "La Coruña"
  "Las Palmas" "Leganés" "León" "Lleida" "Logroño"
  "Lorca" "Lugo" "Madrid" "Málaga" "Móstoles"
  "Murcia" "Oviedo" "Palencia" "Palma" "Pontevedra"
  "Salamanca" "San Sebastián" "Santa Cruz de Tenerife" "Santa Pola" "Santander"
  "Segovia" "Sevilla" "Soria" "Tarragona" "Teruel"
  "Toledo" "Torrevieja" "Valencia" "Valladolid" "Vinaròs"
  "Vitoria" "Zamora" "Zaragoza"
)

SCRIPTS_DIR="$(dirname "$0")"
LOG_DIR="$SCRIPTS_DIR/../logs"

export CLOUDFLARE_API_TOKEN="KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix"
export CLOUDFLARE_ACCOUNT_ID="0c4d9c91bb0f3a4c905545ecc158ec65"

mkdir -p "$LOG_DIR"

while true; do
  for CIUDAD in "${CIUDADES[@]}"; do
    SLUG=$(echo "$CIUDAD" | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '_' | sed 's/_*$//')
    LOGFILE="$LOG_DIR/enriquecedor_${SLUG}.log"
    echo "[$(date '+%Y-%m-%d %H:%M')] Iniciando $CIUDAD..." >> "$LOGFILE"
    python3 "$SCRIPTS_DIR/enriquecedor.py" --ciudad "$CIUDAD" --limite 100 >> "$LOGFILE" 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M')] Fin $CIUDAD. Pausa 3 min..." >> "$LOGFILE"
    sleep 180
  done
  echo "[$(date '+%Y-%m-%d %H:%M')] Vuelta completa (63 ciudades). Pausa 4h..." >> "$LOG_DIR/enriquecedor_loop.log"
  sleep 14400
done
