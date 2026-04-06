const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const {
  leerHorasLibres,
  actualizarHorasLibres,
  renovarHorasLibresSiEsPrimerDia,
} = require('./manage');

const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;
const CLAVE_MAESTRA = process.env.CLAVE_MAESTRA;

// Middleware de autenticación
function authenticateToken(req, res, next) {
  // Leer token de la cookie
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

// Middleware de autorización de administrador
function authorizeAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acceso de administrador requerido' });
  }
  next();
}

// Registrar un nuevo usuario
router.post('/register', async (req, res) => {
  const { username, password, clave_maestra, empresa_id, is_admin = false } = req.body;
  if (clave_maestra !== CLAVE_MAESTRA) {
    return res.status(403).json({ error: 'Clave maestra incorrecta' });
  }

  // Validar que se proporcionen username, password y empresa_id
  if (!username || !password || !empresa_id) {
    return res.status(400).json({ error: 'Username, password y empresa_id son obligatorios' });
  }

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO usuarios (username, password, empresa_id, is_admin) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, empresa_id, is_admin ? 1 : 0],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// Iniciar sesión
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, empresa_id: user.empresa_id, is_admin: user.is_admin === 1 },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    // Establecer cookie HTTP-only
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false, // Cambiar a true en producción con HTTPS
      sameSite: 'strict',
      maxAge: 3600000 // 1 hora en milisegundos
    });

    res.json({ token, is_admin: user.is_admin === 1 });
  });
});

// Cerrar sesión
router.post('/logout', (req, res) => {
  // La cookie se limpia en el cliente/navegador al redirigir
  res.json({ message: 'Sesión cerrada' });
});

// Obtener la información del usuario autenticado
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    empresa_id: req.user.empresa_id,
    is_admin: req.user.is_admin
  });
});

// Obtener todas las empresas
router.get('/empresas', (req, res) => {
  db.all('SELECT * FROM empresas', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Ruta para obtener las horas libres actuales
router.get('/horas-libres/:empresa_id', (req, res) => {
  const { empresa_id } = req.params;
  db.get('SELECT horas_libres FROM empresas WHERE id = ?', [empresa_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    res.json({ horas_libres: row.horas_libres });
  });
});

// Obtener todas las entradas de horas
router.get('/horas', (req, res) => {
  const { empresa_id } = req.query;
  let query = 'SELECT * FROM horas';
  let params = [];
  if (empresa_id) {
    query += ' WHERE empresa_id = ?';
    params.push(empresa_id);
  }
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Ruta para agregar una nueva entrada de horas
router.post('/horas', (req, res) => {
  let { fecha, horas_usadas, solicitante, tarea, empresa_id } = req.body;
  // Convertir horas_usadas a número
  horas_usadas = Number(horas_usadas);

  if (isNaN(horas_usadas)) {
    return res.status(400).json({ error: 'Horas usadas inválidas' });
  }

  db.get('SELECT horas_libres FROM empresas WHERE id = ?', [empresa_id], (err, empresa) => {
    if (err || !empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const horasLibres = empresa.horas_libres;

    // Calcular nuevas horas libres
    const nuevas_horas_libres = horasLibres - horas_usadas;

    // Insertar la nueva entrada en la base de datos
    console.log('Datos recibidos:', { fecha, horas_usadas, solicitante, tarea, empresa_id });
    console.log('Tipo de horas_usadas:', typeof horas_usadas);
    db.run(
      'INSERT INTO horas (fecha, horas_usadas, horas_libres, solicitante, tarea, empresa_id) VALUES (?, ?, ?, ?, ?, ?)',
      [fecha, horas_usadas, nuevas_horas_libres, solicitante, tarea, empresa_id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Actualizar horas libres de la empresa
        db.run('UPDATE empresas SET horas_libres = ? WHERE id = ?', [nuevas_horas_libres, empresa_id]);

        res.json({ id: this.lastID });
      }
    );
  });
});

// Ruta para obtener horas por mes y años (formato: dos dígitos, ej: "01")
router.get('/horas/:anio/:mes', authenticateToken, (req, res) => {
  const { anio, mes } = req.params;
  let { empresa_id } = req.query;
  const user = req.user; // JWT decodificado

  // Validaciones básicas
  if (!/^\d{4}$/.test(anio)) return res.status(400).json({ error: 'Formato de año inválido' });
  if (!/^\d{2}$/.test(mes)) return res.status(400).json({ error: 'Formato de mes inválido' });

  let query = `SELECT * FROM horas WHERE strftime('%Y', fecha) = ? AND strftime('%m', fecha) = ?`;
  let params = [anio, mes];

  // Si no es admin, siempre filtramos por su empresa
  if (!user.is_admin) {
    query += ' AND empresa_id = ?';
    params.push(user.empresa_id);
  } else {
    // Si es admin y empresa_id se pasó en query, filtramos solo esa empresa
    if (empresa_id && empresa_id != 0) {
      query += ' AND empresa_id = ?';
      params.push(empresa_id);
    }
    // Si es admin y empresa_id no se pasa o es 0 → devolvemos todas las empresas
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Ruta para renovar horas libres de todas las empresas
router.post('/renew', authenticateToken, authorizeAdmin, (req, res) => {
  db.run('UPDATE empresas SET horas_libres = horas_totales', (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Horas renovadas para todas las empresas' });
  });
});

module.exports = router;
