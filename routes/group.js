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



=======
  }
});

// Открытие страницы для создания новой группы
router.get('/new', (req, res) => {
  res.render('groups/new');
});

// Создание новой группы
router.post('/new', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Требуется ввести название группы!' });
    }

    await sequelize.query(
      'INSERT INTO classes (name) VALUES (?)',
      { replacements: [name] }
    );

    res.json({ message: 'Группа успешно создана!' });
  } catch (error) {
    console.error('Ошибка при получении данных из базы:', error);
    res.status(500).json({ message: 'Ошибка: не удалось создать группу!' });
  }
});


// Отображение страницы редактирования группы
router.get('/:id/edit', async (req, res) => {
  const { id } = req.params;

  try {
    const [[group]] = await sequelize.query(
      'SELECT * FROM classes WHERE id = ?',
      { replacements: [id] }
    );
    
    res.render('groups/edit', {
      title: 'Редактирование группы',
      group: group,
    });    
  } catch (error) {
    console.error('Ошибка при получении данных из базы:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Редактирование данных группы
router.post('/:id', async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Требуется ввести данные для изменения!' });
    }

    await sequelize.query(
      'UPDATE classes SET name = ? WHERE id = ?',
      { replacements: [name, id] }
    );

    const [updatedGroup] = await sequelize.query(
      'SELECT * FROM classes WHERE id = ?',
      { replacements: [id] }
    );

    res.json({
      message: 'Данные группы успешно обновлены!',
      group: updatedGroup,
    });
  } catch (error) {
    console.error('Ошибка при получении данных из базы:', error);
    res.status(500).json({ message: 'Ошибка: данные группы не удалось изменить!' });
  }
});

// Удаление группы
router.post('/:id/delete', async (req, res) => {
  const { id } = req.params;

  try {
    await sequelize.query(
      'DELETE FROM classes WHERE id = ?',
      { replacements: [id] }
    );

    res.json({ message: 'Группа успешно удалена!' });
  } catch (error) {
    console.error('Ошибка при удалении данных из базы:', error);
    res.status(500).json({ message: 'Ошибка: не удалось удалить группу!' });
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
      group: group,
    });
  } catch (error) {
    console.error('Ошибка при получении данных из базы:', error);
    res.status(500).send('Ошибка сервера');
  }
});

>>>>>>> nailka
module.exports = router;
