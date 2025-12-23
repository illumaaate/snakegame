require('dotenv').config();
console.log('ENV check:', {
  hasMongo: Boolean(process.env.MONGODB_URI),
  jwtLen: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
  port: process.env.PORT
});
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Статика (dev server + публикация на Node)
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  })
  .catch((e) => {
    console.error('MongoDB connect error:', e);
    process.exit(1);
  });
