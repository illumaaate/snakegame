document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.querySelector('#lb tbody');
  const msg = document.getElementById('lb-msg');

  const dialog = document.getElementById('lb-dialog');
  const btnClose = document.getElementById('lb-close');
  const sub = document.getElementById('lb-sub');
  const outJson = document.getElementById('lb-json');
  const outXml = document.getElementById('lb-xml');

  btnClose.addEventListener('click', () => dialog.close());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });

  function escapeXml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function buildPlayerXml(player) {
    const recentXml = (player.recent || [])
      .map((x) => {
        const d = new Date(x.createdAt);
        return `    <game>
      <score>${Number(x.score || 0)}</score>
      <createdAt>${escapeXml(x.createdAt || '')}</createdAt>
      <localTime>${escapeXml(d.toLocaleString('ru-RU'))}</localTime>
    </game>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<player>
  <username>${escapeXml(player.username || '')}</username>
  <bestScore>${Number(player.bestScore || 0)}</bestScore>
  <recentGames>
${recentXml || '    <empty />'}
  </recentGames>
</player>`;
  }

  function openDialogForPlayer(player) {
    sub.textContent = `${player.username} · рекорд ${player.bestScore}`;
    outJson.textContent = JSON.stringify(player, null, 2);
    outXml.textContent = buildPlayerXml(player);
    dialog.showModal(); // нативный модал [web:87]
  }

  function renderFromJson(top) {
    tbody.innerHTML = '';

    top.forEach((u, i) => {
      const tr = document.createElement('tr');
      tr.classList.add('clickable-row');
      tr.tabIndex = 0;

      const nested = document.createElement('table');
      nested.className = 'table nested';
      nested.innerHTML = `<thead><tr><th>Счёт</th><th>Дата</th></tr></thead>`;
      const ntb = document.createElement('tbody');

      (u.recent || []).forEach((x) => {
        const r = document.createElement('tr');
        const d = new Date(x.createdAt);
        r.innerHTML = `<td>${x.score}</td><td>${d.toLocaleString('ru-RU')}</td>`;
        ntb.appendChild(r);
      });

      if (!(u.recent || []).length) {
        const r = document.createElement('tr');
        r.innerHTML = `<td colspan="2">Нет игр</td>`;
        ntb.appendChild(r);
      }

      nested.appendChild(ntb);

      const tdNested = document.createElement('td');
      tdNested.appendChild(nested);

      tr.innerHTML = `<td>${i + 1}</td><td>${u.username}</td><td>${u.bestScore}</td>`;
      tr.appendChild(tdNested);

      tr.addEventListener('click', () => openDialogForPlayer(u));
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openDialogForPlayer(u);
      });

      tbody.appendChild(tr);
    });
  }

  async function loadJsonLeaderboard() {
    msg.textContent = 'Загрузка...';

    const res = await fetch((window.API_BASE || '') + '/api/scores/leaderboard?limit=20');
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      msg.textContent = 'Ошибка загрузки лидерборда';
      return;
    }

    msg.textContent = '';
    renderFromJson(data.top || []);
  }

  loadJsonLeaderboard();
});
