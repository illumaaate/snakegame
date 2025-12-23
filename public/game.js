document.addEventListener('DOMContentLoaded', async () => {
  const { apiAuth, loadMe } = window.SnakeAuth;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const msgEl = document.getElementById('game-msg');

  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');

  // show/hide правила
  const btnRules = document.getElementById('btn-rules');
  const rules = document.getElementById('rules');
  btnRules.addEventListener('click', () => rules.classList.toggle('hidden'));

  // Dialog elements
  const dialog = document.getElementById('detail-dialog');
  const dialogClose = document.getElementById('detail-close');
  const detailSub = document.getElementById('detail-sub');
  const detailJson = document.getElementById('detail-json');
  const detailXml = document.getElementById('detail-xml');

  dialogClose.addEventListener('click', () => dialog.close());

  function buildXmlForScore(item, username) {
    const d = new Date(item.createdAt);
    // простая “ручная” XML-строка для одной игры
    return `<?xml version="1.0" encoding="UTF-8"?>
<game>
  <username>${escapeXml(username || '')}</username>
  <score>${Number(item.score || 0)}</score>
  <createdAt>${escapeXml(item.createdAt || '')}</createdAt>
  <localTime>${escapeXml(d.toLocaleString('ru-RU'))}</localTime>
</game>`;
  }

  function escapeXml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function openDetail(item, username) {
    const d = new Date(item.createdAt);
    detailSub.textContent = `Счёт: ${item.score} · ${d.toLocaleString('ru-RU')}`;

    const jsonObj = {
      username,
      score: item.score,
      createdAt: item.createdAt,
      createdAtLocal: d.toLocaleString('ru-RU')
    };

    detailJson.textContent = JSON.stringify(jsonObj, null, 2);
    detailXml.textContent = buildXmlForScore(item, username);

    // showModal — нативное модальное открытие dialog [web:87]
    dialog.showModal();
  }

  // Слайдер последних игр
  const viewport = document.getElementById('slider-viewport');
  const dotsEl = document.getElementById('dots');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  let sliderItems = [];
  let page = 0;
  const pageSize = 5;

  let currentUsername = '';

  function renderSlider() {
    const pages = Math.max(1, Math.ceil(sliderItems.length / pageSize));
    page = Math.max(0, Math.min(page, pages - 1));

    const start = page * pageSize;
    const slice = sliderItems.slice(start, start + pageSize);

    viewport.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `<thead><tr><th>Счёт</th><th>Дата</th></tr></thead>`;
    const tb = document.createElement('tbody');

    if (!slice.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="2">Пока нет игр</td>`;
      tb.appendChild(tr);
    } else {
      slice.forEach((x) => {
        const tr = document.createElement('tr');
        tr.classList.add('clickable-row');
        tr.tabIndex = 0; // чтобы можно было открыть Enter
        tr.dataset.createdAt = x.createdAt;
        tr.innerHTML = `<td>${x.score}</td><td>${new Date(x.createdAt).toLocaleString('ru-RU')}</td>`;
        tr.addEventListener('click', () => openDetail(x, currentUsername));
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') openDetail(x, currentUsername);
        });
        tb.appendChild(tr);
      });
    }

    table.appendChild(tb);
    viewport.appendChild(table);

    dotsEl.innerHTML = '';
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot' + (i === page ? ' active' : '');
      dot.addEventListener('click', () => {
        page = i;
        renderSlider();
      });
      dotsEl.appendChild(dot);
    }
  }

  prevBtn.addEventListener('click', () => { page--; renderSlider(); });
  nextBtn.addEventListener('click', () => { page++; renderSlider(); });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.open) dialog.close();
    if (e.key === 'ArrowLeft' && e.shiftKey) { page--; renderSlider(); }
    if (e.key === 'ArrowRight' && e.shiftKey) { page++; renderSlider(); }
  });

  async function loadMyScores() {
    const res = await apiAuth('/api/scores/my');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;

    sliderItems = data.items || [];
    renderSlider();
  }

  // Игра (Canvas)
  const GRID = 20;
  const CELL = canvas.width / GRID;

  let interval = null;
  let paused = false;
  let running = false;

  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };

  let snake = [];
  let food = { x: 10, y: 10 };
  let score = 0;

  function randCell() {
    return Math.floor(Math.random() * GRID);
  }

  function placeFood() {
    while (true) {
      const f = { x: randCell(), y: randCell() };
      if (!snake.some((p) => p.x === f.x && p.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function resetGame() {
    snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    scoreEl.textContent = '0';
    msgEl.textContent = '';
    placeFood();
  }

  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  }

  function draw() {
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }

    drawCell(food.x, food.y, '#ef4444');

    snake.forEach((p, idx) => {
      const c = idx === 0 ? '#22c55e' : 'rgba(34,197,94,0.75)';
      drawCell(p.x, p.y, c);
    });

    if (!running) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Нажми "Новая игра"', canvas.width / 2, canvas.height / 2 - 6);
      ctx.font = '14px system-ui';
      ctx.fillText('Space — пауза, управлять с помощью стрелок', canvas.width / 2, canvas.height / 2 + 18);
    }

    if (paused && running) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Пауза', canvas.width / 2, canvas.height / 2);
    }
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function speedMs() {
    return Math.max(60, 120 - Math.floor(score / 30));
  }

  function tick() {
    if (!running || paused) return;

    if (!isOpposite(nextDir, dir)) dir = nextDir;

    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return gameOver();
    if (snake.some((p) => p.x === nx && p.y === ny)) return gameOver();

    const newHead = { x: nx, y: ny };
    snake.unshift(newHead);

    if (nx === food.x && ny === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      placeFood();
      clearInterval(interval);
      interval = setInterval(tick, speedMs());
    } else {
      snake.pop();
    }

    draw();
  }

  async function gameOver() {
    running = false;
    paused = false;
    draw();

    msgEl.className = 'msg err';
    msgEl.textContent = `Игра окончена. Счёт: ${score}. Сохраняю...`;

    const res = await apiAuth('/api/scores/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      bestEl.textContent = String(data.bestScore);
      msgEl.className = 'msg ok';
      msgEl.textContent = `Результат сохранён. Рекорд: ${data.bestScore}`;
      await loadMyScores();
    } else {
      msgEl.className = 'msg err';
      msgEl.textContent = 'Не удалось сохранить результат.';
    }
  }

  function start() {
    resetGame();
    running = true;
    paused = false;
    clearInterval(interval);
    interval = setInterval(tick, speedMs());
    draw();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    draw();
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ' || e.code === 'Space') {
      e.preventDefault();
      togglePause();
      return;
    }

    const map = {
      arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 }
    };

    const nd = map[k];
    if (nd) nextDir = nd;
  });

  btnStart.addEventListener('click', start);
  btnPause.addEventListener('click', togglePause);

  // init
  draw();
  const me = await loadMe();
  if (me) {
    currentUsername = me.username;
    bestEl.textContent = String(me.bestScore || 0);
  }

  await loadMyScores();
});
