document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#horas-table tbody');
  const ctx = document.getElementById('horasChart').getContext('2d');
  const mesSelect = document.getElementById('mes');
  const filtrarBtn = document.getElementById('filtrar');
  const horasLibresSpan = document.getElementById('horas-libres');
  const anioSelect = document.getElementById('anio');

  // Obtener el token JWT del localStorage
  const token = localStorage.getItem('token');

  if (!token) {
    alert('No estás autenticado. Por favor, inicia sesión.');
    window.location.href = '/login.html'; // Redirigir al login
    return;
  }

  // Verificar la expiración del token
  const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decodificar el token
  const expiraEn = decodedToken.exp * 1000; // Convertir a milisegundos
  const ahora = Date.now();

  if (ahora > expiraEn) {
    alert('Tu sesión ha expirado. Redirigiendo al login...');
    localStorage.removeItem('token'); // Eliminar el token expirado
    window.location.href = '/login.html';
    return;
  }

  const empresaIdUsuario = decodedToken.empresa_id;

  // Cargar las horas libres de la empresa del usuario
  function cargarHorasLibres() {
    fetch(`/api/horas-libres/${empresaIdUsuario}`)
      .then(response => response.json())
      .then(data => {
        horasLibresSpan.textContent = data.horas_libres;
        if (data.horas_libres < 0) {
            horasLibresSpan.style.color = "red";
        } else {
            horasLibresSpan.style.color = "black";
        }
      })
      .catch(error => console.error('Error al cargar horas libres:', error));
  }

  cargarHorasLibres();

  // Obtener el mes actual (formato: "01", "02", ..., "12")
  const hoy = new Date();
  const mesActual = String(hoy.getMonth() + 1).padStart(2, '0'); // getMonth() devuelve 0-11

  // Establecer el mes actual como valor predeterminado en el selector
  mesSelect.value = mesActual;

  // Cargar años automáticamente
  const anioActual = new Date().getFullYear();

  for (let y = anioActual; y >= 2023; y--) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    anioSelect.appendChild(option);
  }

  anioSelect.value = anioActual;


  // Configurar el gráfico
  const horasChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Horas Usadas',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Función para cargar las horas
  function loadHoras(mes, anio) {
    const url = `/api/horas/${anio}/${mes.padStart(2, '0')}?empresa_id=${empresaIdUsuario}`;

    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error('Error al obtener los datos');
        return response.json();
      })
      .then(data => {
        // Limpiar tabla y gráfico
        tableBody.innerHTML = '';
        horasChart.data.labels = [];
        horasChart.data.datasets[0].data = [];

        // Si hay datos, actualizar
        if (data.length > 0) {
          // Llenar tabla
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

          // Actualizar gráfico
          horasChart.data.labels = data.map(row => row.fecha);
          horasChart.data.datasets[0].data = data.map(row => row.horas_usadas);
        }

        horasChart.update(); // Actualizar el gráfico incluso si no hay datos
      })
      .catch(error => {
        console.error('Error:', error);
        alert('No se pudieron cargar los datos.');
      });
  }

  // Cargar horas de la empresa del usuario al iniciar
  loadHoras(mesActual, anioActual);

  // Filtrar por mes
  filtrarBtn.addEventListener('click', () => {
    const mes = mesSelect.value;
    const anio = anioSelect.value;
    loadHoras(mes, anio);
  });

});
