const express = require('express');
const sequelize = require('../config/database');

const router = express.Router();

// Получение списка всех групп
router.get('/', async (req, res) => {
  const [groups, metadata] = await sequelize.query('SELECT * FROM groups');
  res.json(groups);
});

// Создание новой группы
router.post('/', async (req, res) => {
  const { name, description, direction, course } = req.body;
  await sequelize.query(
    'INSERT INTO groups (name, description, direction, course) VALUES (?, ?, ?, ?)',
    { replacements: [name, description, direction, course] },
  );
  res.status(201).json({ message: 'Group created' });
});

// Получение конкретной группы по ID
router.get('/:id', async (req, res) => {
  const [groups, metadata] = await sequelize.query('SELECT * FROM groups WHERE id = ?', {
    replacements: [req.params.id],
  });
  const group = groups[0];
  if (group) {
    res.json(group);
  } else {
    res.status(404).send('Group not found');
  }
});

// Обновление существующей группы
router.put('/:id', async (req, res) => {
  const { name, description, direction, course } = req.body;
  await sequelize.query(
    'UPDATE groups SET name = ?, description = ?, direction = ?, course = ? WHERE id = ?',
    { replacements: [name, description, direction, course, req.params.id] },
  );
  res.json({ message: 'Group updated' });
});

// Удаление группы
router.delete('/:id', async (req, res) => {
  await sequelize.query('DELETE FROM groups WHERE id = ?', { replacements: [req.params.id] });
  res.status(204).send();
});

module.exports = router;
