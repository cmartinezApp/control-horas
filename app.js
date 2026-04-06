const http = require('http');

const hostname = '127.0.0.1';
const port = 3001;

// Crear el servidor
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hola Mundo, servidor funcionando!\n');
});

// Escuchar en el puerto
server.listen(port, hostname, () => {
  console.log(`Servidor corriendo en http://${hostname}:${port}/`);
});
