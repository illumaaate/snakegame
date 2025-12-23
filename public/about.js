document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('demo-formats');
  const out = document.getElementById('formats-out');

  btn.addEventListener('click', async () => {
    out.classList.toggle('hidden');

    const jsonRes = await fetch((window.API_BASE || '') + '/api/scores/leaderboard?limit=5');
    const json = await jsonRes.json().catch(() => ({}));

    const xmlRes = await fetch((window.API_BASE || '') + '/api/scores/leaderboard.xml?limit=5');
    const xmlText = await xmlRes.text();

    out.textContent =
      'JSON (через JSON.stringify):\n' +
      JSON.stringify(json, null, 2) +
      '\n\nXML (сырой текст):\n' +
      xmlText;
  });
});
