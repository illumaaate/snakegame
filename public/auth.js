const TOKEN_KEY = 'snake_token';

function api(path, options = {}) {
  const base = window.API_BASE || '';
  return fetch(base + path, options);
}

function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function apiAuth(path, options = {}) {
  const token = getToken();
  const headers = Object.assign({}, options.headers || {});
  if (token) headers.Authorization = 'Bearer ' + token;
  return api(path, { ...options, headers });
}

async function loadMe() {
  const token = getToken();
  if (!token) return null;
  const res = await apiAuth('/api/auth/me');
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.user;
}

function show(el, text, cls) {
  el.className = 'msg ' + (cls || '');
  el.textContent = text;
}

function validateUsername(u) {
  if (!u) return 'Введите имя пользователя';
  if (u.length < 3) return 'Имя пользователя должно быть минимум 3 символа';
  if (u.length > 24) return 'Имя пользователя слишком длинное';
  if (!/^[a-zA-Z0-9_а-яА-Я-]+$/.test(u)) return 'Разрешены буквы, цифры, _, -';
  return null;
}

function validatePassword(p) {
  if (!p) return 'Введите пароль';
  if (p.length < 6) return 'Пароль должен быть минимум 6 символов';
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const logout = document.getElementById('logout-link');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      clearToken();
      window.location.href = 'index.html';
    });
  }

  const regForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('register-msg');

      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;

      const eu = validateUsername(username);
      if (eu) return show(msg, eu, 'err');

      const ep = validatePassword(password);
      if (ep) return show(msg, ep, 'err');

      show(msg, 'Регистрация...', '');

      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return show(msg, data.error || 'Ошибка регистрации', 'err');

      setToken(data.token);
      show(msg, 'Аккаунт создан. Перенаправление...', 'ok');
      setTimeout(() => (window.location.href = 'game.html'), 600);
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('login-msg');

      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      const eu = validateUsername(username);
      if (eu) return show(msg, eu, 'err');

      const ep = validatePassword(password);
      if (ep) return show(msg, ep, 'err');

      show(msg, 'Вход...', '');

      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return show(msg, data.error || 'Ошибка входа', 'err');

      setToken(data.token);
      show(msg, 'Успешно. Перенаправление...', 'ok');
      setTimeout(() => (window.location.href = 'game.html'), 600);
    });
  }

  // На game.html требуем авторизацию
  if (location.pathname.endsWith('game.html')) {
    const me = await loadMe();
    if (!me) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }
    const meEl = document.getElementById('me');
    const bestEl = document.getElementById('best');
    if (meEl) meEl.textContent = me.username;
    if (bestEl) bestEl.textContent = String(me.bestScore || 0);
  }
});

window.SnakeAuth = { api, apiAuth, getToken, setToken, clearToken, loadMe };
