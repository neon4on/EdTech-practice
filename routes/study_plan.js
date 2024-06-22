const express = require('express');
const sequelize = require('../config/database');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const xlsx = require('xlsx');

const router = express.Router();

// Получить все учебные планы
router.get('/', async (req, res) => {
  const [results, metadata] = await sequelize.query('SELECT * FROM studyPlans');
  res.render('study_plans', { title: 'Учебные планы', studyPlans: results });
});

// Показать форму для создания нового учебного плана
router.get('/new', (req, res) => {
  res.render('study_plans/new', { title: 'Создать новый учебный план' });
});


// Показать детали учебного плана
router.get('/:id', async (req, res) => {
  const [results, metadata] = await sequelize.query('SELECT * FROM studyplans WHERE id = ?', {
    replacements: [req.params.id],
  });
  const studyPlan = results[0];

  // Получить данные файла Excel
  const [fileResults, fileMetadata] = await sequelize.query('SELECT file_data FROM files WHERE id = ?', {
    replacements: [studyPlan.file_id],
  });

  // Проверка наличия файла
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
  const excelData = xlsx.utils.sheet_to_json(worksheet);

  res.render('study_plans/show', { title: studyPlan.title, studyPlan, excelData });
});

// Создать новый учебный план с файлом
router.post('/new', upload.single('file'), async (req, res) => {
  const { title, description, groupId } = req.body;
  const file = req.file;

  // Проверка наличия файла
  if (!file) {
    console.error('No file attached');
    return res.status(400).json({ message: 'No file attached' });
  }

  // Проверка существования файла
  if (!fs.existsSync(file.path)) {
    console.error('File does not exist');
    return res.status(400).json({ message: 'File does not exist' });
  }

  const fileBuffer = fs.readFileSync(file.path);

  try {
    // Добавление файла в таблицу files
    const [fileResults] = await sequelize.query(
      'INSERT INTO files (file_data) VALUES (?) RETURNING id',
      { replacements: [fileBuffer] },
    );
    const fileId = fileResults[0].id;


    
    // Добавление учебного плана в таблицу studyplans
    const [studyPlanResults] = await sequelize.query(
      'INSERT INTO studyplans (title, description, groupid, file_id) VALUES (?, ?, ?, ?) RETURNING id',
      { replacements: [title, description, groupId, fileId] },
    );

    res.status(201).json({ message: 'Study plan created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Показать форму для редактирования учебного плана
router.get('/edit/:id', async (req, res) => {
  const [results, metadata] = await sequelize.query('SELECT * FROM studyplans WHERE id = ?', {
    replacements: [req.params.id],
  });
  const studyPlan = results[0];
  res.render('study_plans/edit', { title: 'Редактировать учебный план', studyPlan });
});

// Обновить учебный план и заменить файл при наличии
router.post('/edit/:id', upload.single('newFile'), async (req, res) => {
  const { title, description, groupId } = req.body;
  const file = req.file;

  try {
    // Получить текущий file_id учебного плана
    const [currentFileResults] = await sequelize.query(
      'SELECT file_id FROM studyplans WHERE id = ?',
      { replacements: [req.params.id] },
    );
    const currentFileId = currentFileResults[0].file_id;

    // Если предоставлен новый файл, обновить файл
    if (file) {
      // Проверка существования файла
      if (!fs.existsSync(file.path)) {
        console.error('File does not exist');
        return res.status(400).json({ message: 'File does not exist' });
      }

      const fileBuffer = fs.readFileSync(file.path);

      // Добавление нового файла в таблицу files
      const [fileResults] = await sequelize.query(
        'INSERT INTO files (file_data) VALUES (?) RETURNING id',
        { replacements: [fileBuffer] },
      );
      const fileId = fileResults[0].id;

      // Обновление file_id учебного плана
      await sequelize.query(
        'UPDATE studyplans SET file_id = ? WHERE id = ?',
        { replacements: [fileId, req.params.id] },
      );

      // Удаление старого файла из таблицы files
      if (currentFileId) {
        await sequelize.query(
          'DELETE FROM files WHERE id = ?',
          { replacements: [currentFileId] },
        );
      }
    }

    // Обновление информации учебного плана
    await sequelize.query(
      'UPDATE studyplans SET title = ?, description = ?, groupid = ? WHERE id = ?',
      { replacements: [title, description, groupId, req.params.id] },
    );

    res.redirect('/study_plans');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});



// Удалить учебный план
router.get('/delete/:id', async (req, res) => {
  try {
    // Получить file_id учебного плана
    const [currentFileResults] = await sequelize.query(
      'SELECT file_id FROM studyplans WHERE id = ?',
      { replacements: [req.params.id] },
    );
    const currentFileId = currentFileResults[0].file_id;

    // Удалить учебный план
    await sequelize.query(
      'DELETE FROM studyplans WHERE id = ?',
      { replacements: [req.params.id] },
    );

    // Если у учебного плана был файл, удалить его
    if (currentFileId) {
      await sequelize.query(
        'DELETE FROM files WHERE id = ?',
        { replacements: [currentFileId] },
      );
    }

    res.redirect('/study_plans');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});






module.exports = router;





/* далее пойдет код который под сомнением 

 //ОТОБРАЖЕНИЕ ЭКСЕЛЬ 
// Получить Excel файл для учебного плана
router.get('/study_plans/:id/excel', async (req, res) => {
  try {
    // Получить file_id учебного плана
    const [currentFileResults] = await sequelize.query(
      'SELECT file_id FROM studyplans WHERE id = ?',
      { replacements: [req.params.id] },
    );
    const fileId = currentFileResults[0].file_id;

    // Получить данные файла из таблицы files
    const [fileResults] = await sequelize.query(
      'SELECT file_data FROM files WHERE id = ?',
      { replacements: [fileId] },
    );
    const fileData = fileResults[0].file_data;

    // Отправить данные файла как Buffer
    res.send(Buffer.from(fileData));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

*/