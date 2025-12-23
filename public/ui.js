function greetingByHour(h) {
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 18) return 'Добрый день';
  if (h >= 18 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

function getToken() {
  return localStorage.getItem('snake_token');
}

function clearToken() {
  localStorage.removeItem('snake_token');
}


async function fetchMe() {
  const token = getToken();
  if (!token) return null;

  const res = await fetch((window.API_BASE || '') + '/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token }
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.user || null;
}

function setupAuthNav() {
  const a = document.getElementById('auth-action');
  if (!a) return;

  const token = getToken();
  if (!token) {
    a.textContent = 'Вход';
    a.href = 'index.html';
    a.onclick = null;
    return;
  }

  // token есть → показываем "Выйти"
  a.textContent = 'Выйти';
  a.href = 'index.html';
  a.onclick = (e) => {
    e.preventDefault();
    clearToken();
    window.location.href = 'index.html';
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  setupAuthNav();

  const el = document.getElementById('greeting');
  if (!el) return;

  const base = greetingByHour(new Date().getHours());
  const me = await fetchMe();

  // если токен протух/битый — убираем его и возвращаем "Вход"
  if (!me && getToken()) {
    clearToken();
    setupAuthNav();
    el.textContent = base;
    return;
  }

  el.textContent = me ? `${base}, ${me.username}` : base;
});
