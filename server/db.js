const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Crear tabla de empresas
  db.run(`
    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      horas_totales INTEGER NOT NULL,
      horas_libres INTEGER NOT NULL
    )
  `);

  // Crear tabla de horas
  db.run(`
    CREATE TABLE IF NOT EXISTS horas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      horas_usadas INTEGER NOT NULL,
      horas_libres INTEGER NOT NULL,
      solicitante TEXT NOT NULL,
      tarea TEXT NOT NULL,
      empresa_id INTEGER NOT NULL,
      FOREIGN KEY (empresa_id) REFERENCES empresas (id)
    )
  `);

  // Crear tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      empresa_id INTEGER NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (empresa_id) REFERENCES empresas (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuario_empresas (
      usuario_id INTEGER NOT NULL,
      empresa_id INTEGER NOT NULL,
      PRIMARY KEY (usuario_id, empresa_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
      FOREIGN KEY (empresa_id) REFERENCES empresas (id)
    )
  `);
  db.run(`
    INSERT OR IGNORE INTO usuario_empresas (usuario_id, empresa_id)
    SELECT id, empresa_id FROM usuarios
  `);

  // Insertar empresas por defecto si no existen
  db.run(`INSERT OR IGNORE INTO empresas (nombre, horas_totales, horas_libres) VALUES ('Meucci Calidad', 720, 720)`);
  db.run(`INSERT OR IGNORE INTO empresas (nombre, horas_totales, horas_libres) VALUES ('Meucci Reporteria', 480, 480)`);
});

module.exports = db;
