document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('register-form');
  const empresaSelect = document.getElementById('empresa');

  // Obtener información del usuario autenticado
  try {
    const userRes = await fetch('/api/me', { credentials: 'include' });
    if (!userRes.ok) {
      window.location.href = '/login.html';
      return;
    }
    const user = await userRes.json();

    // Verificar que sea admin
    if (!user.is_admin) {
      window.location.href = '/view.html';
      return;
    }
  } catch (error) {
    console.error('Error al verificar usuario:', error);
    window.location.href = '/login.html';
    return;
  }

  // Cargar empresas
  function cargarEmpresas() {
    fetch('/api/empresas', { credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        data.forEach(empresa => {
          const option = document.createElement('option');
          option.value = empresa.id;
          option.textContent = empresa.nombre;
          empresaSelect.appendChild(option);
        });
      })
      .catch(error => console.error('Error al cargar empresas:', error));
  }

  cargarEmpresas();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const empresaId = empresaSelect.value;
    const claveMaestra = document.getElementById('clave-maestra').value;

    fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password, clave_maestra: claveMaestra, empresa_id: empresaId }),
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => { throw err; });
      }
      return response.json();
    })
    .then(data => {
      alert('Usuario registrado correctamente');
      window.location.href = '/admin.html'; // Redirigir a admin
    })
    .catch(error => {
      console.error('Error:', error);
      alert(error.error || 'Error al registrar el usuario. Por favor, intenta nuevamente.');
    });
  });
});
