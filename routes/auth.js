const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Добавляем импорт библиотеки jsonwebtoken
const sequelize = require('../config/database'); // убедитесь, что путь к файлу правильный

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

  try {
    // Проверка на наличие email
    const [results, metadata] = await sequelize.query('SELECT * FROM users WHERE email = ?', {
      replacements: [email],
    });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await sequelize.query(
      'INSERT INTO users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?)',
      { replacements: [firstName, lastName, email, hashedPassword, role] },
    );

    res.status(201).json({ message: 'Регистрация прошла успешно' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Произошла ошибка при регистрации' });
  }
});

// Вход пользователя
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Проверка на наличие email и password
  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны для ввода' });
  }

  // Запрос пользователя по email
  const [results, metadata] = await sequelize.query('SELECT * FROM users WHERE email = ?', {
    replacements: [email],
  });

  // Проверка наличия пользователя
  if (results.length === 0) {
    return res.status(404).json({ message: 'Пользователь с таким email не найден' });
  }

  const user = results[0];

  // Проверка пароля
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Неверный пароль' });
  }

  // Создание JWT токена
  const token = jwt.sign({ id: user.id, role: user.role }, 'supersecretkey', { expiresIn: '1h' });

  // Успешный ответ с токеном
  res.json({ message: 'Вход выполнен успешно', token });
});

module.exports = router;