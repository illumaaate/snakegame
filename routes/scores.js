const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Score = require('../models/Score');

const router = express.Router();

function escapeXml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// POST /api/scores/submit (auth)
router.post('/submit', auth, async (req, res, next) => {
  try {
    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await Score.create({
      userId: user._id,
      username: user.username,
      score
    });

    if (score > user.bestScore) {
      user.bestScore = score;
      await user.save();
    }

    res.json({ ok: true, bestScore: user.bestScore });
  } catch (e) {
    next(e);
  }
});

// GET /api/scores/leaderboard.xml?limit=20
router.get('/leaderboard.xml', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));

    const topUsers = await User.find()
      .select('username bestScore')
      .sort({ bestScore: -1, username: 1 })
      .limit(limit);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<leaderboard>\n`;
    topUsers.forEach((u, idx) => {
      xml += `  <player rank="${idx + 1}">\n`;
      xml += `    <username>${escapeXml(u.username)}</username>\n`;
      xml += `    <bestScore>${u.bestScore}</bestScore>\n`;
      xml += `  </player>\n`;
    });
    xml += `</leaderboard>\n`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (e) {
    next(e);
  }
});

// GET /api/scores/leaderboard?limit=20
// Возвращаем топ + последние 3 игры (ВЛОЖЕННАЯ ТАБЛИЦА)
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));

    const topUsers = await User.find()
      .select('_id username bestScore')
      .sort({ bestScore: -1, username: 1 })
      .limit(limit);

    const top = [];
    for (const u of topUsers) {
      // ВАЖНО: ищем по userId, а не по username
      const recent = await Score.find({ userId: u._id })
        .select('score createdAt')
        .sort({ createdAt: -1 })
        .limit(3);

      top.push({
        username: u.username,
        bestScore: u.bestScore,
        recent: recent.map((x) => ({ score: x.score, createdAt: x.createdAt }))
      });
    }

    res.json({ top });
  } catch (e) {
    next(e);
  }
});

// GET /api/scores/my (auth) — последние игры текущего пользователя
router.get('/my', auth, async (req, res, next) => {
  try {
    const items = await Score.find({ userId: req.user.id })
      .select('score createdAt')
      .sort({ createdAt: -1 })
      .limit(40);

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
