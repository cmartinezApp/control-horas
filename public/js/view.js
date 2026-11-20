document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#horas-table tbody');
  const ctx = document.getElementById('horasChart').getContext('2d');
  const mesSelect = document.getElementById('mes');
  const filtrarBtn = document.getElementById('filtrar');
  const horasLibresSpan = document.getElementById('horas-libres');
  const anioSelect = document.getElementById('anio');

  let isAdmin = false;
  let empresaIdsUsuario = [];

  try {
    const userRes = await fetch('/api/me', { credentials: 'include' });
    if (!userRes.ok) {
      window.location.href = '/login.html';
      return;
    }
    const user = await userRes.json();
    isAdmin = user.is_admin;
    empresaIdsUsuario = user.empresa_ids || [user.empresa_id];
  } catch (error) {
    console.error('Error al verificar usuario:', error);
    window.location.href = '/login.html';
    return;
  }

  let empresaSelect = null;
  if (isAdmin || empresaIdsUsuario.length > 1) {
    const header = document.getElementById('header');
    const empresaLabel = document.createElement('label');
    empresaLabel.htmlFor = 'empresa';
    empresaLabel.textContent = 'Filtrar por empresa:';
    empresaSelect = document.createElement('select');
    empresaSelect.id = 'empresa';
    header.insertBefore(empresaLabel, filtrarBtn);
    header.insertBefore(empresaSelect, filtrarBtn);

    try {
      const response = await fetch('/api/empresas', { credentials: 'include' });
      if (!response.ok) throw new Error('No se pudieron cargar las empresas');
      const empresas = await response.json();
      const allOption = document.createElement('option');
      allOption.value = '0';
      allOption.textContent = isAdmin ? 'Todas las empresas' : 'Todas mis empresas';
      empresaSelect.appendChild(allOption);

      empresas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa.id;
        option.textContent = empresa.nombre;
        empresaSelect.appendChild(option);
      });
      empresaSelect.value = '0';
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      alert('No se pudieron cargar las empresas.');
      return;
    }
  }

  function cargarHorasLibres(empresaId) {
    if (!empresaId || empresaId === '0') {
      horasLibresSpan.textContent = isAdmin ? 'Todas las empresas' : 'Seleccioná una empresa';
      horasLibresSpan.style.color = 'black';
      return;
    }

    fetch(`/api/horas-libres/${empresaId}`, { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error('No se pudieron cargar las horas libres');
        return response.json();
      })
      .then(data => {
        horasLibresSpan.textContent = data.horas_libres;
        horasLibresSpan.style.color = data.horas_libres < 0 ? 'red' : 'black';
      })
      .catch(error => {
        console.error('Error al cargar horas libres:', error);
        horasLibresSpan.textContent = 'No disponible';
      });
  }

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

  const horasChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Horas Usadas', data: [], backgroundColor: 'rgba(75, 192, 192, 0.2)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 }] },
    options: { scales: { y: { beginAtZero: true } } }
  });

  function loadHoras(mes, anio, empresaId) {
    const empresaQuery = empresaId && empresaId !== '0' ? `?empresa_id=${encodeURIComponent(empresaId)}` : '';
    const url = `/api/horas/${anio}/${mes.padStart(2, '0')}${empresaQuery}`;

    fetch(url, { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error('Error al obtener los datos');
        return response.json();
      })
      .then(data => {
        tableBody.innerHTML = '';
        horasChart.data.labels = [];
        horasChart.data.datasets[0].data = [];

        data.forEach(row => {
          const tr = document.createElement('tr');
          [row.fecha, row.empresa_nombre, row.horas_usadas, row.horas_libres, row.solicitante, row.tarea]
            .forEach(value => {
              const td = document.createElement('td');
              td.textContent = value == null ? '' : value;
              tr.appendChild(td);
            });
          tableBody.appendChild(tr);
        });

        horasChart.data.labels = data.map(row => row.fecha);
        horasChart.data.datasets[0].data = data.map(row => row.horas_usadas);
        horasChart.update();
      })
      .catch(error => {
        console.error('Error:', error);
        alert('No se pudieron cargar los datos.');
      });

    cargarHorasLibres(empresaId);
  }

  const empresaInicial = empresaSelect ? '0' : String(empresaIdsUsuario[0]);
  loadHoras(mesActual, anioActual, empresaInicial);

  filtrarBtn.addEventListener('click', () => {
    const mes = mesSelect.value;
    const anio = anioSelect.value;
    const empresaId = empresaSelect ? empresaSelect.value : empresaInicial;
    loadHoras(mes, anio, empresaId);
  });

  if (empresaSelect) {
    empresaSelect.addEventListener('change', () => cargarHorasLibres(empresaSelect.value));
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = '/login.html';
    });
  }
});
