const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const routes = require('./routes');
const db = require('./db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 3001;

const SECRET_KEY = process.env.SECRET_KEY;
const CLAVE_MAESTRA = process.env.CLAVE_MAESTRA;

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));
app.use('/css', express.static(path.join(__dirname, '../public/css')));

// Middleware para parsear JSON y cookies
app.use(bodyParser.json());
app.use(cookieParser());

// Rutas de la API
app.use('/api', routes);

// Middleware para verificar el token JWT
function authenticateToken(req, res, next) {
  const publicPaths = ['/login.html', '/', '/js/', '/css/'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Leer token de la cookie
  const token = req.cookies.authToken;

  if (!token) {
    return res.redirect('/login.html');
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      // Limpiar cookie inválida
      res.clearCookie('authToken');
      return res.redirect('/login.html');
    }
    req.user = user;
    next();
  });
}

// Middleware para verificar si es admin
function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== true) {
    // Redirigir a view.html si no es admin
    return res.redirect('/view.html');
  }
  next();
}

// Proteger la ruta de admin.html
app.get('/admin.html', authenticateToken, authorizeAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Ruta raíz para servir el archivo view.html
app.get('/view.html', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/view.html'));
});

// Proteger la ruta de register.html
app.get('/register.html', authenticateToken, authorizeAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

// Ruta raíz para servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/*.html', authenticateToken, (req, res) => {
  // Si el usuario no es admin y la página no es view.html, redirigir
  const allowed = ['/view.html', '/login.html'];
  if (!allowed.includes(req.path) && req.user.is_admin !== true) {
    return res.redirect('/view.html');
  }
  res.sendFile(path.join(__dirname, '../public', req.path));
});

console.log('Iniciando servidor...');

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
