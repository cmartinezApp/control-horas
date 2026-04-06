document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include' // Asegurar que las cookies se envíen
    })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        // Redirigir según el tipo de usuario
        if (data.is_admin) {
          window.location.href = '/admin.html';
        } else {
          window.location.href = '/view.html';
        }
      } else {
        alert('Error: ' + (data.error || 'Usuario o contraseña incorrectos'));
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Ocurrió un error al iniciar sesión.');
    });
  });
});
