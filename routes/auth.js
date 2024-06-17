const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');

const router = express.Router();

// Показать форму регистрации
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Регистрация' });
});

// Показать форму логина
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Вход' });
});

// Регистрация пользователя
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await sequelize.query(
    'INSERT INTO users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?)',
    { replacements: [firstName, lastName, email, hashedPassword, role] },
  );
  res.status(201).json({ message: 'User registered' });
});

// Вход пользователя
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const [results, metadata] = await sequelize.query('SELECT * FROM users WHERE email = ?', {
    replacements: [email],
  });
  const user = results[0];
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user.id, role: user.role }, 'supersecretkey', { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

module.exports = router;
