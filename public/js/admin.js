document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('horas-form');
  const horasLibresSpan = document.getElementById('horas-libres');
  const empresaSelect = document.getElementById('empresa');
  const logoutBtn = document.getElementById('logoutBtn');
  const registerBtn = document.getElementById('registerBtn');

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

  // Cargar las horas libres al cambiar empresa
  function cargarHorasLibres(empresaId) {
    if (!empresaId) return;
    fetch(`/api/horas-libres/${empresaId}`, { credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        horasLibresSpan.textContent = data.horas_libres;
        if (data.horas_libres < 0) {
            horasLibresSpan.style.color = "red";
        } else {
            horasLibresSpan.style.color = "black";
        }
      })
      .catch(error => {
          console.error('Error al cargar horas libres:', error);
        });
  }

  empresaSelect.addEventListener('change', () => {
    cargarHorasLibres(empresaSelect.value);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const empresaId = empresaSelect.value;
    const fecha = document.getElementById('fecha').value;
    const horasUsadas = document.getElementById('horas-usadas').value;
    const solicitante = document.getElementById('solicitante').value;
    const tarea = document.getElementById('tarea').value;

    fetch('/api/horas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ fecha, horas_usadas: horasUsadas, solicitante, tarea, empresa_id: empresaId }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al guardar los datos');
      }
      return response.json();
    })
    .then(data => {
      alert('Horas cargadas correctamente');
      cargarHorasLibres(empresaId);
      form.reset();
      empresaSelect.value = '';
      horasLibresSpan.textContent = '720'; // reset
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error al guardar los datos. Por favor, intenta nuevamente.');
    });
  });

  // Funcionalidad de Cerrar Sesión
  logoutBtn.addEventListener('click', () => {
    // Limpiar cookie (el servidor hará esto cuando expire)
    window.location.href = '/login.html';
  });

  // Funcionalidad de Boton de Registro
  registerBtn.addEventListener('click', () => {
    window.location.href = '/register.html';
  });

});
