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
<<<<<<< HEAD
  }
});

// Создание новой группы
router.post('/', async (req, res) => {
  const { student_id, group_name, study_year, tutor_id } = req.body;
  await sequelize.query(
    'INSERT INTO groups (student_id, group_name, study_year, tutor_id) VALUES (?, ?, ?, ?)',
    { replacements: [student_id, group_name, study_year, tutor_id] }
  );
  res.status(201).json({ message: 'Group created' });
});

// Получение конкретной группы по ID
router.get('/:id', async (req, res) => {
  const [groups, metadata] = await sequelize.query('SELECT * FROM classes WHERE class_id = ?', {
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
  const { student_id, group_name, study_year, tutor_id } = req.body;
  await sequelize.query(
    'UPDATE groups SET student_id = ?, group_name = ?, study_year = ?, tutor_id = ? WHERE group_id = ?',
    { replacements: [student_id, group_name, study_year, tutor_id, req.params.id] },
  );
  res.json({ message: 'Group updated' });
});

// Удаление группы
router.delete('/:id', async (req, res) => {
  await sequelize.query('DELETE FROM groups WHERE group_id = ?', { replacements: [req.params.id] });
  res.status(204).send();
});
=======
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


>>>>>>> 83b5098eeaa79181bea8145a71cca72d90b72743

module.exports = router;
