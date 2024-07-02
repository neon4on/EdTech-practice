const express = require('express');
const sequelize = require('../config/database');
const router = express.Router();

// Получение списка всех студентов
router.get('/users', async (req, res) => {
  const [users, metadata] = await sequelize.query("SELECT * FROM users WHERE role = 'student'");
  res.json(users);
});

// Создание записи об отсутствии для студента
router.post('/attendance', async (req, res) => {
  const { user_id, date, type } = req.body;
  await sequelize.query(
    'INSERT INTO attendance (user_id, date, type) VALUES (?, ?, ?)',
    { replacements: [user_id, date, type] },
  );
  res.status(201).json({ message: 'attendance created' });
});

// Получение списка отсутствий для конкретного студента
router.get('/attendance', async (req, res) => {
  const [attendance, metadata] = await sequelize.query('SELECT * FROM attendance WHERE id = ?', {
    replacements: [req.params.id],
  });
  if (attendance.length > 0) {
    res.json(attendance);
  } else {
    res.status(404).send('No attendance found for this student');
  }
});

// Обновление записи об отсутствии для студента
router.put('/attendance/:id', async (req, res) => {
  const { date, type, comment } = req.body;
  await sequelize.query(
    'UPDATE attendance SET date = ?, type = ?, comment = ? WHERE id = ?',
    { replacements: [date, type, comment, req.params.id] },
  );
  res.json({ message: 'attendance updated' });
});

module.exports = router;
