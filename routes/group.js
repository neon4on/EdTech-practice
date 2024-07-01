const express = require('express');
const sequelize = require('../config/database');

const router = express.Router();

// Получение списка всех групп и рендеринг страницы
router.get('/', async (req, res) => {
  try {
    const [groups, metadata] = await sequelize.query('SELECT * FROM classes');
    res.render('groups', { groups });
  } catch (error) {
    console.error('Ошибка при получении данных из базы:', error);
    res.status(500).send('Ошибка сервера');
  }
});



// Получение конкретной группы по ID
router.get('/:id', async (req, res) => {
  try {
    // Получение информации о группе
    const [groupResult] = await sequelize.query('SELECT * FROM classes WHERE id = ?', {
      replacements: [req.params.id],
    });
    const group = groupResult[0];

    if (!group) {
      return res.status(404).send('Group not found');
    }

    // Получение списка студентов, связанных с этой группой
    const [students] = await sequelize.query(`
      SELECT users.id, users.firstname, users.lastname
      FROM users
      JOIN user_classes ON users.id = user_classes.user_id
      WHERE user_classes.class_id = ? AND users.role = 'student'
    `, {
      replacements: [req.params.id],
    });

    // Рендеринг страницы с названием группы и списком студентов
    res.render('groups/show', {
      groupName: group.name,
      students,
    });
  } catch (error) {
    console.error('Ошибка при получении данных из базы:', error);
    res.status(500).send('Ошибка сервера');
  }
});



module.exports = router;
