document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#horas-table tbody');
  const ctx = document.getElementById('horasChart').getContext('2d');
  const mesSelect = document.getElementById('mes');
  const filtrarBtn = document.getElementById('filtrar');
  const horasLibresSpan = document.getElementById('horas-libres');
  const anioSelect = document.getElementById('anio');

  // Obtener información del usuario autenticado
  let isAdmin = false;
  let empresaIdUsuario = null;

  try {
    const userRes = await fetch('/api/me', { credentials: 'include' });
    if (!userRes.ok) {
      window.location.href = '/login.html';
      return;
    }
    const user = await userRes.json();
    isAdmin = user.is_admin;
    empresaIdUsuario = user.empresa_id;
  } catch (error) {
    console.error('Error al verificar usuario:', error);
    window.location.href = '/login.html';
    return;
  }

  // Crear selector de empresas solo para admins
  let empresaSelect = null;
  if (isAdmin) {
    empresaSelect = document.createElement('select');
    empresaSelect.id = 'empresa';
    empresaSelect.style.marginRight = '10px';
    document.getElementById('header').insertBefore(empresaSelect, filtrarBtn);

    // Cargar empresas desde API
    fetch('/api/empresas', { credentials: 'include' })
      .then(res => res.json())
      .then(empresas => {
        // Opción para ver todas
        const allOption = document.createElement('option');
        allOption.value = '0';
        allOption.textContent = 'Todas las empresas';
        empresaSelect.appendChild(allOption);

        empresas.forEach(e => {
          const option = document.createElement('option');
          option.value = e.id;
          option.textContent = e.nombre;
          empresaSelect.appendChild(option);
        });
        empresaSelect.value = '0';
      })
      .catch(err => console.error('Error al cargar empresas:', err));
  }

  // Función para cargar horas libres
  function cargarHorasLibres(empresaId) {
    if (!empresaId || empresaId === '0') {
      // Admin viendo todas → mostrar texto genérico
      horasLibresSpan.textContent = 'Todas las empresas';
      horasLibresSpan.style.color = 'black';
      return;
    }

    fetch(`/api/horas-libres/${empresaId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        horasLibresSpan.textContent = data.horas_libres;
        horasLibresSpan.style.color = data.horas_libres < 0 ? 'red' : 'black';
      })
      .catch(err => console.error('Error al cargar horas libres:', err));
  }

  // Inicializar mes y año
  const hoy = new Date();
  const mesActual = String(hoy.getMonth() + 1).padStart(2, '0');
  mesSelect.value = mesActual;

  const anioActual = hoy.getFullYear();
  for (let y = anioActual; y >= 2023; y--) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    anioSelect.appendChild(option);
  }
  anioSelect.value = anioActual;

  // Configurar gráfico
  const horasChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Horas Usadas', data: [], backgroundColor: 'rgba(75, 192, 192, 0.2)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 }] },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // Función para cargar horas
  function loadHoras(mes, anio, empresaId) {
    const empresaQuery = empresaId && empresaId !== '0' ? `?empresa_id=${empresaId}` : '';
    const url = `/api/horas/${anio}/${mes.padStart(2,'0')}${empresaQuery}`;

    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener los datos');
        return res.json();
      })
      .then(data => {
        tableBody.innerHTML = '';
        horasChart.data.labels = [];
        horasChart.data.datasets[0].data = [];

        data.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.fecha}</td>
            <td>${row.horas_usadas}</td>
            <td>${row.horas_libres}</td>
            <td>${row.solicitante}</td>
            <td>${row.tarea}</td>
          `;
          tableBody.appendChild(tr);
        });

        horasChart.data.labels = data.map(row => row.fecha);
        horasChart.data.datasets[0].data = data.map(row => row.horas_usadas);
        horasChart.update();
      })
      .catch(err => {
        console.error('Error:', err);
        alert('No se pudieron cargar los datos.');
      });

    cargarHorasLibres(empresaId);
  }

  // Cargar horas al iniciar
  if (isAdmin) {
    loadHoras(mesActual, anioActual, '0'); // Admin: todas las empresas
  } else {
    loadHoras(mesActual, anioActual, empresaIdUsuario); // Usuario normal
  }

  // Filtrar por mes/año/empresa
  filtrarBtn.addEventListener('click', () => {
    const mes = mesSelect.value;
    const anio = anioSelect.value;
    const empresaId = isAdmin ? empresaSelect.value : empresaIdUsuario;
    loadHoras(mes, anio, empresaId);
  });

  // Funcionalidad de Cerrar Sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = '/login.html';
    });
  }
});