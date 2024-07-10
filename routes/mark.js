const express = require('express');
const sequelize = require('../config/database');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('class_book/mark'); // Здесь 'mark' - это название вашего шаблона mark.hbs
});

router.get('/subjects-and-classes', async (req, res) => {
  try {
    const subjectsResults = await sequelize.query('SELECT DISTINCT subj FROM actual', {
      type: sequelize.QueryTypes.SELECT
    });

    const subjects = subjectsResults.map(result => result.subj);
    res.json({ subjects });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

router.get('/classes', async (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.status(400).json({ message: 'Subject parameter is required' });
  }

  try {
    const classesResults = await sequelize.query('SELECT DISTINCT class FROM actual WHERE subj = $1', {
      bind: [subject],
      type: sequelize.QueryTypes.SELECT
    });

    const classes = classesResults.map(result => result.class);
    res.json({ classes });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

router.get('/schedule', async (req, res) => {
  const { subject, class: classValue } = req.query;

  if (!subject || !classValue) {
    return res.status(400).json({ message: 'Subject and class parameters are required' });
  }

  try {
    const scheduleResults = await sequelize.query('SELECT DISTINCT date, stdfio FROM actual WHERE subj = $1 AND class = $2', {
      bind: [subject, classValue],
      type: sequelize.QueryTypes.SELECT
    });

    const dates = [...new Set(scheduleResults.map(result => result.date))].sort();
    const students = [...new Set(scheduleResults.map(result => result.stdfio))];

    res.json({ dates, students });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

router.post('/save-grades', async (req, res) => {
  const { student, date, grades, comment } = req.body;

  try {
    // Извлекаем оценки и веса из массива grades
    const mark1 = grades[0] ? grades[0].grade : null;
    const mark2 = grades[1] ? grades[1].grade : null;
    const mark3 = grades[2] ? grades[2].grade : null;
    const weight1 = grades[0] ? getWeightValue(grades[0].weight) : null;
    const weight2 = grades[1] ? getWeightValue(grades[1].weight) : null;
    const weight3 = grades[2] ? getWeightValue(grades[2].weight) : null;

    // Проверяем, существует ли уже запись с такими значениями (stdfio, class, subj, date)
    const existingRecord = await sequelize.query(`
      SELECT 1
      FROM marks
      WHERE stdfio = $1 AND class = $2 AND subj = $3 AND date = $4
    `, {
      bind: [student, '10', 'Информатика', date],
      type: sequelize.QueryTypes.SELECT
    });

    // Если запись существует, удаляем её
    if (existingRecord.length > 0) {
      await sequelize.query(`
        DELETE FROM marks
        WHERE stdfio = $1 AND class = $2 AND subj = $3 AND date = $4
      `, {
        bind: [student, '10', 'Информатика', date],
        type: sequelize.QueryTypes.DELETE
      });
    }

    // Вставляем новую запись
    await sequelize.query(`
      INSERT INTO marks (stdfio, class, subj, date, mark1, mark2, mark3, weight1, weight2, weight3, comment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, {
      bind: [student, '10', 'Информатика', date, mark1, mark2, mark3, weight1, weight2, weight3, comment],
      type: sequelize.QueryTypes.INSERT
    });

    res.status(200).json({ message: 'Оценки успешно сохранены' });
  } catch (error) {
    console.error('Ошибка сохранения оценок:', error);
    res.status(500).json({ message: 'Произошла ошибка', error: error.message });
  }
});

// Функция для получения числового значения веса
function getWeightValue(weightText) {
  switch (weightText) {
    case 'Контрольная работа':
      return 3;
    case 'Практическая работа':
      return 2;
    case 'Оценка за урок/домашняя работа':
      return 1;
    default:
      return null; // В случае невалидного значения, возвращаем null или другое значение по умолчанию
  }
}

module.exports = router;
