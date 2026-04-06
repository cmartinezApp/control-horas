#!/bin/bash

# Cargar el archivo .env
export $(cat .env | xargs)

HORAS_PAGADAS=$HORAS_PAGADAS
CONFIG_PATH="/opt/cmit/server/config.json"

# Función para renovar horas libres el primer día del mes
renovarHorasLibresSiEsPrimerDia() {
  DIA=$(date +%d) # Obtener el día del mes

  if [ "$DIA" -eq 1 ]; then
    NUEVAS_HORAS_LIBRES=$HORAS_PAGADAS
    actualizarHorasLibres "$NUEVAS_HORAS_LIBRES" # Llamar a la función para actualizar las horas
    echo "Horas libres renovadas: $NUEVAS_HORAS_LIBRES" > /var/log/cron.log
  else
    echo "Horas no actualizadas" > /var/log/cron.log
  fi
}

# Función para actualizar las horas libres en el archivo config.json
actualizarHorasLibres() {
  NUEVAS_HORAS_LIBRES=$1

  # Verificar si el archivo config.json existe
  if [ -f "$CONFIG_PATH" ]; then
    # Usar jq para actualizar el valor de HORAS_LIBRES en el JSON
    jq --arg horas "$NUEVAS_HORAS_LIBRES" '.HORAS_LIBRES = ($horas | tonumber)' "$CONFIG_PATH" > tmp.$$.json && mv tmp.$$.json "$CONFIG_PATH"
    echo "Horas libres actualizadas en config.json: $NUEVAS_HORAS_LIBRES" > /var/log/cron.log
  else
    echo "Directorio actual: $(pwd)" > /var/log/cron.log
    echo "Ruta del archivo config.json: $CONFIG_PATH" > /var/log/cron.log
    echo "Error: El archivo config.json no existe." > /var/log/cron.log
  fi
}

# Ejecutar la función
renovarHorasLibresSiEsPrimerDia
