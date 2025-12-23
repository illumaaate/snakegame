const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (username.length < 3) return res.status(400).json({ error: 'Username too short (min 3)' });
    if (password.length < 6) return res.status(400).json({ error: 'Password too short (min 6)' });

    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });

    const token = makeToken(user);
    res.status(201).json({ token, user: { username: user.username, bestScore: user.bestScore } });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Bad credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Bad credentials' });

    const token = makeToken(user);
    res.json({ token, user: { username: user.username, bestScore: user.bestScore } });
  } catch (e) {
    next(e);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('username bestScore createdAt');
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
