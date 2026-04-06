document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#horas-table tbody');
  const form = document.getElementById('horas-form');

  // Función para cargar las horas
  function loadHoras() {
    fetch('/api/horas')
      .then(response => response.json())
      .then(data => {
        tableBody.innerHTML = '';
        data.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.fecha}</td>
            <td>${row.horas_usadas}</td>
            <td>${row.horas_libres}</td>
          `;
          tableBody.appendChild(tr);
        });
      });
  }

  // Cargar las horas al iniciar
  loadHoras();

  // Manejar el envío del formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fecha = document.getElementById('fecha').value;
    const horasUsadas = document.getElementById('horas-usadas').value;
    const horasLibres = document.getElementById('horas-libres').value;

    fetch('/api/horas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fecha, horas_usadas: horasUsadas, horas_libres: horasLibres }),
    })
    .then(response => response.json())
    .then(() => {
      loadHoras();
      form.reset();
    });
  });
});
