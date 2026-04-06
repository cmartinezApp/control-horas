// server/horasLibres.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const HORAS_PAGADAS = process.env.HORAS_PAGADAS;

const CONFIG_PATH = path.join(__dirname, 'config.json');

// Función para leer horas libres
function leerHorasLibres() {
  const data = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(data).HORAS_LIBRES;
}

// Función para actualizar horas libres
function actualizarHorasLibres(nuevasHoras) {
  const config = { HORAS_LIBRES: nuevasHoras };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Función para renovar horas libres el primer día del mes
function renovarHorasLibresSiEsPrimerDia() {
  const hoy = new Date();
  const esPrimerDia = hoy.getDate() === 1; // Verificar si es el primer día del mes

  if (esPrimerDia) {
    const nuevasHorasLibres = HORAS_PAGADAS; // Valor predeterminado
    actualizarHorasLibres(nuevasHorasLibres); // Actualizar horas libres
    console.log('Horas libres renovadas:', nuevasHorasLibres);
  }
}

module.exports = {
  leerHorasLibres,
  actualizarHorasLibres,
  renovarHorasLibresSiEsPrimerDia,
};
