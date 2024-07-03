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

// Получение страницы для добавления студента в группу
router.get('/add_student/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const students = await sequelize.query(
      'SELECT u.id, u.firstname, u.lastname FROM users u WHERE u.id NOT IN (SELECT uc.user_id FROM user_classes uc WHERE uc.class_id = ?) AND u.role IN (\'student\')',
      { replacements: [groupId], type: sequelize.QueryTypes.SELECT }
    );

    res.render('groups/add_student', { students, groupId });
  } catch (error) {
    console.error('Ошибка при получении данных из базы:', error);
    res.status(500).json({ message: 'Ошибка при получении данных из базы: ' + error.message });
  }
});

// Добавление студента в группу
router.post('/add_student/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { studentId } = req.body;

  try {
    console.log(`Добавление студента с ID: ${studentId} в группу с ID: ${groupId}`);

    // Проверяем, существует ли студент
    const [studentResult] = await sequelize.query('SELECT * FROM users WHERE id = ?', {
      replacements: [studentId],
    });
    const student = studentResult[0];
    console.log('Студент:', student);

    // Проверяем, существует ли группа
    const [groupResult] = await sequelize.query('SELECT * FROM classes WHERE id = ?', {
      replacements: [groupId],
    });
    const group = groupResult[0];
    console.log('Группа:', group);

    if (!student || !group) {
      return res.status(404).json({ message: 'Студент или группа не найдены' });
    }

    // Проверяем, не состоит ли студент уже в этой группе
    const [existingRelationResult] = await sequelize.query(
      'SELECT * FROM user_classes WHERE user_id = ? AND class_id = ?',
      {
        replacements: [studentId, groupId],
      }
    );
    const existingRelation = existingRelationResult[0];
    console.log('Существующая связь:', existingRelation);

    if (existingRelation) {
      return res.status(400).json({ message: 'Студент уже состоит в этой группе' });
    }

    // Создаем запись в таблице user_classes
    await sequelize.query('INSERT INTO user_classes (user_id, class_id) VALUES (?, ?)', {
      replacements: [studentId, groupId],
    });

    res.status(200).json({ message: 'Студент успешно добавлен в группу' });
  } catch (error) {
    console.error('Ошибка при добавлении студента в группу:', error);
    res.status(500).json({ message: 'Ошибка при добавлении студента в группу: ' + error.message });
  }
});

module.exports = router;