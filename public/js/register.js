document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('register-form');
  const usuarioSelect = document.getElementById('usuario');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const passwordLabel = document.getElementById('password-label');
  const passwordHelp = document.getElementById('password-help');
  const empresaSelect = document.getElementById('empresa');
  const claveMaestraContainer = document.getElementById('clave-maestra-container');
  const claveMaestraInput = document.getElementById('clave-maestra');
  const guardarUsuarioBtn = document.getElementById('guardar-usuario');
  let usuarios = [];

  try {
    const userRes = await fetch('/api/me', { credentials: 'include' });
    if (!userRes.ok) {
      window.location.href = '/login.html';
      return;
    }
    const user = await userRes.json();
    if (!user.is_admin) {
      window.location.href = '/view.html';
      return;
    }

    const [empresasRes, usuariosRes] = await Promise.all([
      fetch('/api/empresas', { credentials: 'include' }),
      fetch('/api/usuarios', { credentials: 'include' }),
    ]);
    if (!empresasRes.ok || !usuariosRes.ok) {
      throw new Error('No se pudieron cargar los datos de usuarios y empresas.');
    }

    const [empresas, usuariosData] = await Promise.all([empresasRes.json(), usuariosRes.json()]);
    usuarios = usuariosData;

    empresas.forEach(empresa => {
      const option = document.createElement('option');
      option.value = empresa.id;
      option.textContent = empresa.nombre;
      empresaSelect.appendChild(option);
    });

    usuarios.forEach(usuario => {
      const option = document.createElement('option');
      option.value = usuario.id;
      option.textContent = usuario.username;
      usuarioSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar la gestión de usuarios:', error);
    alert(error.message || 'No se pudieron cargar los datos.');
    return;
  }

  function setCreateMode() {
    usernameInput.value = '';
    passwordInput.value = '';
    passwordInput.required = true;
    passwordInput.placeholder = 'Contraseña';
    passwordLabel.textContent = 'Contraseña:';
    passwordHelp.hidden = true;
    claveMaestraContainer.hidden = false;
    claveMaestraInput.required = true;
    claveMaestraInput.value = '';
    Array.from(empresaSelect.options).forEach(option => { option.selected = false; });
    guardarUsuarioBtn.textContent = 'Crear usuario';
  }

  function setEditMode(usuario) {
    usernameInput.value = usuario.username;
    passwordInput.value = '';
    passwordInput.required = false;
    passwordInput.placeholder = 'Nueva contraseña (opcional)';
    passwordLabel.textContent = 'Nueva contraseña (opcional):';
    passwordHelp.hidden = false;
    claveMaestraContainer.hidden = true;
    claveMaestraInput.required = false;
    claveMaestraInput.value = '';
    const empresasAsignadas = new Set(usuario.empresa_ids.map(String));
    Array.from(empresaSelect.options).forEach(option => {
      option.selected = empresasAsignadas.has(option.value);
    });
    guardarUsuarioBtn.textContent = 'Guardar cambios';
  }

  usuarioSelect.addEventListener('change', () => {
    const usuario = usuarios.find(item => String(item.id) === usuarioSelect.value);
    if (usuario) {
      setEditMode(usuario);
    } else {
      setCreateMode();
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const empresaIds = Array.from(empresaSelect.selectedOptions, option => Number(option.value));
    if (empresaIds.length === 0) {
      alert('Seleccioná al menos una empresa.');
      return;
    }

    const usuarioId = usuarioSelect.value;
    const isEditing = Boolean(usuarioId);
    const body = {
      username: usernameInput.value.trim(),
      empresa_ids: empresaIds,
    };

    let url = '/api/register';
    let method = 'POST';
    if (isEditing) {
      url = `/api/usuarios/${encodeURIComponent(usuarioId)}`;
      method = 'PUT';
      if (passwordInput.value) body.password = passwordInput.value;
    } else {
      body.password = passwordInput.value;
      body.clave_maestra = claveMaestraInput.value;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el usuario.');

      alert(isEditing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
      window.location.reload();
    } catch (error) {
      console.error('Error al guardar el usuario:', error);
      alert(error.message || 'Ocurrió un error al guardar el usuario.');
    }
  });
});
