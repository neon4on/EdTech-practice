const express = require('express');
const sequelize = require('../config/database');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const xlsx = require('xlsx');

const router = express.Router();

// Получить все учебные планы
router.get('/', async (req, res) => {
  try {
    const [studyPlans] = await sequelize.query(`
      SELECT sp.id, sp.title, sp.description, sp.classid, c.name as classname
      FROM studyPlans sp
      LEFT JOIN classes c ON sp.classid = c.id
    `);
    res.render('study_plans', { title: 'Учебные планы', studyPlans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Получить все предметы
router.get('/subjects', async (req, res) => {
  try {
    const [subjects] = await sequelize.query('SELECT id, name FROM subjects');
    res.status(200).json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Получить все классы
router.get('/classes', async (req, res) => {
  try {
    const [classes] = await sequelize.query('SELECT id, name FROM classes');
    res.status(200).json(classes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Показать форму для создания нового учебного плана
router.get('/new', async (req, res) => {
  try {
    const [subjects] = await sequelize.query('SELECT * FROM subjects');
    const [classes] = await sequelize.query('SELECT * FROM classes');
    res.render('study_plans/new', { title: 'Создать новый учебный план', subjects, classes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Показать детали учебного плана
router.get('/:id', async (req, res) => {
  try {
    const [results] = await sequelize.query('SELECT * FROM studyplans WHERE id = ?', {
      replacements: [req.params.id],
    });
    const studyPlan = results[0];

    // Получить данные файла Excel
    const [fileResults] = await sequelize.query('SELECT file_data FROM files WHERE id = ?', {
      replacements: [studyPlan.file_id],
    });

    if (!fileResults || fileResults.length === 0) {
      console.error('No file found');
      return res.status(400).json({ message: 'No file found' });
    }

    const fileData = fileResults[0].file_data;

    // Преобразование данных файла в буфер
    const fileBuffer = Buffer.from(fileData, 'binary');

    // Чтение данных Excel
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Извлечение заголовков классов и данных
    const headerRow1 = excelData[0];
    const headerRow2 = excelData[1];
    const classes = headerRow2.slice(1);
    
    const formattedData = [];
    for (let i = 2; i < excelData.length; i++) {
      const row = excelData[i];
      const subject = row[0];
      const hours = row.slice(1);
      const rowData = { subject, hours };
      formattedData.push(rowData);
    }

    res.render('study_plans/show', { title: studyPlan.title, studyPlan, classes, formattedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Создать новый учебный план с файлом
router.post('/new', upload.single('file'), async (req, res) => {
  const { title, description, subjectid, classid } = req.body;
  const file = req.file;
  const userId = req.session.user.id;  // Получаем ID текущего пользователя из сессии

  // Выводим значения для отладки
  console.log('title:', title);
  console.log('description:', description);
  console.log('subjectid:', subjectid);
  console.log('classid:', classid);
  console.log('file:', file);
  console.log('userId:', userId);

  if (!file) {
    console.error('No file attached');
    return res.status(400).json({ message: 'No file attached' });
  }

  if (!fs.existsSync(file.path)) {
    console.error('File does not exist');
    return res.status(400).json({ message: 'File does not exist' });
  }

  const fileBuffer = fs.readFileSync(file.path);

  try {
    const [fileResults] = await sequelize.query(
      'INSERT INTO files (file_data) VALUES (?) RETURNING id',
      {
        replacements: [fileBuffer],
      },
    );
    const fileId = fileResults[0].id;

    const [studyPlanResults] = await sequelize.query(
      'INSERT INTO studyplans (title, description, subjectid, classid, file_id, user_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      { replacements: [title, description, subjectid, classid, fileId, userId] },
    );

    res.status(201).json({ message: 'Study plan created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Показать форму для редактирования учебного плана
router.get('/edit/:id', async (req, res) => {
  try {
    const [results] = await sequelize.query('SELECT * FROM studyplans WHERE id = ?', {
      replacements: [req.params.id],
    });
    const studyPlan = results[0];
    res.render('study_plans/edit', { title: 'Редактировать учебный план', studyPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Обновить учебный план и заменить файл при наличии
router.post('/edit/:id', upload.single('newFile'), async (req, res) => {
  const { title, description, subjectid, classid } = req.body;
  const file = req.file;

  // Выводим значения для отладки
  console.log('title:', title);
  console.log('description:', description);
  console.log('subjectid:', subjectid);
  console.log('classid:', classid);
  console.log('file:', file);

  try {
    // Получаем текущий файл, связанный с учебным планом
    const [currentFileResults] = await sequelize.query(
      'SELECT file_id FROM studyplans WHERE id = ?',
      {
        replacements: [req.params.id],
      },
    );
    const currentFileId = currentFileResults[0].file_id;

    // Если загружен новый файл, обновляем его в базе данных
    if (file) {
      if (!fs.existsSync(file.path)) {
        console.error('File does not exist');
        return res.status(400).json({ message: 'File does not exist' });
      }

      const fileBuffer = fs.readFileSync(file.path);

      const [fileResults] = await sequelize.query(
        'INSERT INTO files (file_data) VALUES (?) RETURNING id',
        {
          replacements: [fileBuffer],
        },
      );
      const fileId = fileResults[0].id;

      // Обновляем file_id у учебного плана
      await sequelize.query('UPDATE studyplans SET file_id = ? WHERE id = ?', {
        replacements: [fileId, req.params.id],
      });

      // Удаляем старый файл из базы данных
      if (currentFileId) {
        await sequelize.query('DELETE FROM files WHERE id = ?', { replacements: [currentFileId] });
      }
    }

    // Обновляем остальные поля учебного плана
    await sequelize.query(
      'UPDATE studyplans SET title = ?, description = ?, subjectid = ?, classid = ? WHERE id = ?',
      { replacements: [title, description, subjectid, classid, req.params.id] },
    );
    
    // Успешное завершение операции
    res.status(200).json({ message: 'Study plan updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Удалить учебный план
router.get('/delete/:id', async (req, res) => {
  try {
    // Получаем текущий файл, связанный с учебным планом
    const [currentFileResults] = await sequelize.query(
      'SELECT file_id FROM studyplans WHERE id = ?',
      {
        replacements: [req.params.id],
      },
    );
    const currentFileId = currentFileResults[0]?.file_id;

    // Удаляем учебный план из базы данных
    await sequelize.query('DELETE FROM studyplans WHERE id = ?', { replacements: [req.params.id] });

    // Удаляем связанный файл из базы данных, если он существует
    if (currentFileId) {
      await sequelize.query('DELETE FROM files WHERE id = ?', { replacements: [currentFileId] });
    }

    // Отправляем JSON-ответ о успешном удалении
    res.status(200).json({ message: 'Study plan deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

module.exports = router;