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
router.post('/register', authenticateToken, authorizeAdmin, async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = req.body.password;
  const { clave_maestra } = req.body;
  const empresaIds = Array.isArray(req.body.empresa_ids)
    ? [...new Set(req.body.empresa_ids.map(Number))]
    : [Number(req.body.empresa_id)];
  if (clave_maestra !== CLAVE_MAESTRA) {
    return res.status(403).json({ error: 'Clave maestra incorrecta' });
  }

  if (!username || typeof password !== 'string' || password.length === 0 || empresaIds.length === 0 ||
      empresaIds.some(id => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ error: 'Usuario, contraseña y al menos una empresa son obligatorios' });
  }

  const empresaPlaceholders = empresaIds.map(() => '?').join(', ');
  db.all(`SELECT id FROM empresas WHERE id IN (${empresaPlaceholders})`, empresaIds, async (err, empresas) => {
    if (err) return res.status(500).json({ error: err.message });
    if (empresas.length !== empresaIds.length) {
      return res.status(400).json({ error: 'Una o más empresas no existen' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO usuarios (username, password, empresa_id, is_admin) VALUES (?, ?, ?, 0)',
        [username, hashedPassword, empresaIds[0]],
        function (insertError) {
          if (insertError) {
            const status = insertError.code === 'SQLITE_CONSTRAINT' ? 409 : 500;
            const message = status === 409 ? 'Ese nombre de usuario ya está en uso' : insertError.message;
            return res.status(status).json({ error: message });
          }

          const usuarioId = this.lastID;
          const values = empresaIds.map(() => '(?, ?)').join(', ');
          const params = empresaIds.flatMap(empresaId => [usuarioId, empresaId]);
          db.run(
            `INSERT INTO usuario_empresas (usuario_id, empresa_id) VALUES ${values}`,
            params,
            function (assignmentError) {
              if (assignmentError) {
                db.run('DELETE FROM usuario_empresas WHERE usuario_id = ?', [usuarioId]);
                db.run('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
                return res.status(500).json({ error: assignmentError.message });
              }
              res.json({ id: usuarioId });
            }
          );
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// Obtener los usuarios y sus empresas asignadas (solo administradores)
router.get('/usuarios', authenticateToken, authorizeAdmin, (req, res) => {
  db.all(`
    SELECT u.id, u.username, ue.empresa_id
    FROM usuarios u
    LEFT JOIN usuario_empresas ue ON ue.usuario_id = u.id
    ORDER BY u.username
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const usuarios = new Map();
    rows.forEach(row => {
      if (!usuarios.has(row.id)) {
        usuarios.set(row.id, { id: row.id, username: row.username, empresa_ids: [] });
      }
      if (row.empresa_id !== null) usuarios.get(row.id).empresa_ids.push(row.empresa_id);
    });
    res.json(Array.from(usuarios.values()));
  });
});

// Actualizar las empresas visibles para un usuario (solo administradores)
router.put('/usuarios/:id/empresas', authenticateToken, authorizeAdmin, (req, res) => {
  const usuarioId = Number(req.params.id);
  const empresaIds = Array.isArray(req.body.empresa_ids)
    ? [...new Set(req.body.empresa_ids.map(Number))]
    : [];
  if (!Number.isInteger(usuarioId) || usuarioId < 1 ||
      empresaIds.length === 0 ||
      empresaIds.some(id => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ error: 'Usuario y al menos una empresa válida son obligatorios' });
  }

  const empresaPlaceholders = empresaIds.map(() => '?').join(', ');
  db.get('SELECT id FROM usuarios WHERE id = ?', [usuarioId], (userError, user) => {
    if (userError) return res.status(500).json({ error: userError.message });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    db.all(`SELECT id FROM empresas WHERE id IN (${empresaPlaceholders})`, empresaIds, (companyError, empresas) => {
      if (companyError) return res.status(500).json({ error: companyError.message });
      if (empresas.length !== empresaIds.length) {
        return res.status(400).json({ error: 'Una o más empresas no existen' });
      }

      db.run('DELETE FROM usuario_empresas WHERE usuario_id = ?', [usuarioId], deleteError => {
        if (deleteError) return res.status(500).json({ error: deleteError.message });
        const values = empresaIds.map(() => '(?, ?)').join(', ');
        const params = empresaIds.flatMap(empresaId => [usuarioId, empresaId]);
        db.run(`INSERT INTO usuario_empresas (usuario_id, empresa_id) VALUES ${values}`, params, insertError => {
          if (insertError) return res.status(500).json({ error: insertError.message });
          db.run('UPDATE usuarios SET empresa_id = ? WHERE id = ?', [empresaIds[0], usuarioId], updateError => {
            if (updateError) return res.status(500).json({ error: updateError.message });
            res.json({ message: 'Empresas actualizadas' });
          });
        });
      });
    });
  });
});

// Actualizar una cuenta existente (solo administradores)
router.put('/usuarios/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const usuarioId = Number(req.params.id);
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = req.body.password;
  const empresaIds = Array.isArray(req.body.empresa_ids)
    ? [...new Set(req.body.empresa_ids.map(Number))]
    : [];

  if (!Number.isInteger(usuarioId) || usuarioId < 1 ||
      !username ||
      (password !== undefined && typeof password !== 'string') ||
      empresaIds.length === 0 ||
      empresaIds.some(id => !Number.isInteger(id) || id < 1)) {
    return res.status(400).json({ error: 'Usuario y al menos una empresa válida son obligatorios' });
  }

  try {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const empresaPlaceholders = empresaIds.map(() => '?').join(', ');

    db.get('SELECT id FROM usuarios WHERE id = ?', [usuarioId], (userError, user) => {
      if (userError) return res.status(500).json({ error: userError.message });
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      db.get('SELECT id FROM usuarios WHERE username = ? AND id != ?', [username, usuarioId], (nameError, duplicate) => {
        if (nameError) return res.status(500).json({ error: nameError.message });
        if (duplicate) return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });

        db.all(`SELECT id FROM empresas WHERE id IN (${empresaPlaceholders})`, empresaIds, (companyError, empresas) => {
          if (companyError) return res.status(500).json({ error: companyError.message });
          if (empresas.length !== empresaIds.length) {
            return res.status(400).json({ error: 'Una o más empresas no existen' });
          }

          db.serialize(() => {
            db.run('BEGIN IMMEDIATE', beginError => {
              if (beginError) return res.status(500).json({ error: beginError.message });
              const rollback = error => {
                db.run('ROLLBACK', rollbackError => {
                  res.status(500).json({ error: rollbackError ? rollbackError.message : error.message });
                });
              };

              db.run(
                'UPDATE usuarios SET username = ?, password = COALESCE(?, password), empresa_id = ? WHERE id = ?',
                [username, hashedPassword, empresaIds[0], usuarioId],
                updateError => {
                  if (updateError) return rollback(updateError);
                  db.run('DELETE FROM usuario_empresas WHERE usuario_id = ?', [usuarioId], deleteError => {
                    if (deleteError) return rollback(deleteError);

                    const values = empresaIds.map(() => '(?, ?)').join(', ');
                    const params = empresaIds.flatMap(empresaId => [usuarioId, empresaId]);
                    db.run(
                      `INSERT INTO usuario_empresas (usuario_id, empresa_id) VALUES ${values}`,
                      params,
                      insertError => {
                        if (insertError) return rollback(insertError);
                        db.run('COMMIT', commitError => {
                          if (commitError) return rollback(commitError);
                          res.json({ message: 'Usuario actualizado correctamente' });
                        });
                      }
                    );
                  });
                }
              );
            });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
      { expiresIn: '12h' }
    );

    // Establecer cookie HTTP-only
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true, // Cambiar a true en producción con HTTPS
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000 // 12 horas en milisegundos
    });

    res.json({ token, is_admin: user.is_admin === 1 });
  });
});

// Cerrar sesión
router.post('/logout', (req, res) => {
  // La cookie se limpia en el cliente/navegador al redirigir
  res.clearCookie('authToken');
  res.json({ message: 'Sesión cerrada' });
});

// Obtener la información del usuario autenticado
router.get('/me', authenticateToken, (req, res) => {
  db.all('SELECT empresa_id FROM usuario_empresas WHERE usuario_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const empresaIds = rows.map(row => row.empresa_id);
    res.json({
      id: req.user.id,
      username: req.user.username,
      empresa_id: empresaIds[0] || req.user.empresa_id,
      empresa_ids: empresaIds.length ? empresaIds : [req.user.empresa_id],
      is_admin: req.user.is_admin
    });
  });
});

// Obtener todas las empresas
router.get('/empresas', authenticateToken, (req, res) => {
  const query = req.user.is_admin
    ? 'SELECT * FROM empresas'
    : `SELECT e.* FROM empresas e
       JOIN usuario_empresas ue ON ue.empresa_id = e.id
       WHERE ue.usuario_id = ?`;
  const params = req.user.is_admin ? [] : [req.user.id];
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Ruta para obtener las horas libres actuales
router.get('/horas-libres/:empresa_id', authenticateToken, (req, res) => {
  const { empresa_id } = req.params;
  const query = req.user.is_admin
    ? 'SELECT horas_libres FROM empresas WHERE id = ?'
    : `SELECT e.horas_libres FROM empresas e
       JOIN usuario_empresas ue ON ue.empresa_id = e.id
       WHERE e.id = ? AND ue.usuario_id = ?`;
  const params = req.user.is_admin ? [empresa_id] : [empresa_id, req.user.id];
  db.get(query, params, (err, row) => {
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
router.get('/horas', authenticateToken, (req, res) => {
  const { empresa_id } = req.query;
  let query = 'SELECT * FROM horas';
  let params = [];
  if (empresa_id) {
    query += ' WHERE empresa_id = ?';
    params.push(empresa_id);
  }
  if (!req.user.is_admin) {
    query += empresa_id ? ' AND' : ' WHERE';
    query += ' empresa_id IN (SELECT empresa_id FROM usuario_empresas WHERE usuario_id = ?)';
    params.push(req.user.id);
  }
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Ruta para agregar una nueva entrada de horas
router.post('/horas', authenticateToken, (req, res) => {
  let { fecha, horas_usadas, solicitante, tarea, empresa_id } = req.body;
  // Convertir horas_usadas a número
  horas_usadas = Number(horas_usadas);

  if (isNaN(horas_usadas)) {
    return res.status(400).json({ error: 'Horas usadas inválidas' });
  }

  const query = req.user.is_admin
    ? 'SELECT horas_libres FROM empresas WHERE id = ?'
    : `SELECT e.horas_libres FROM empresas e
       JOIN usuario_empresas ue ON ue.empresa_id = e.id
       WHERE e.id = ? AND ue.usuario_id = ?`;
  const params = req.user.is_admin ? [empresa_id] : [empresa_id, req.user.id];
  db.get(query, params, (err, empresa) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!empresa) {
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
  const { empresa_id } = req.query;
  const user = req.user; // JWT decodificado

  // Validaciones básicas
  if (!/^\d{4}$/.test(anio)) return res.status(400).json({ error: 'Formato de año inválido' });
  if (!/^\d{2}$/.test(mes)) return res.status(400).json({ error: 'Formato de mes inválido' });

  let query = `SELECT h.*, e.nombre AS empresa_nombre
    FROM horas h JOIN empresas e ON e.id = h.empresa_id
    WHERE strftime('%Y', h.fecha) = ? AND strftime('%m', h.fecha) = ?`;
  let params = [anio, mes];

  if (!user.is_admin) {
    query += ' AND h.empresa_id IN (SELECT empresa_id FROM usuario_empresas WHERE usuario_id = ?)';
    params.push(user.id);
  }
  if (empresa_id && empresa_id !== '0') {
    query += ' AND h.empresa_id = ?';
    params.push(empresa_id);
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
