const express = require('express');
const sequelize = require('../config/database');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('class_book/mark');
});

router.get('/subjects-and-classes', async (req, res) => {
  try {
    const subjectsResults = await sequelize.query('SELECT DISTINCT subj FROM actual', {
      type: sequelize.QueryTypes.SELECT
    });

    if (!subjectsResults) {
      throw new Error('Subjects query returned undefined');
    }

    const subjects = subjectsResults.map(result => result.subj);

    res.json({ subjects });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'Произошла ошибка', error: error.message });
  }
});

router.get('/classes', async (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.status(400).json({ message: 'Параметр предмета обязателен' });
  }

  try {
    const classesResults = await sequelize.query('SELECT DISTINCT class FROM actual WHERE subj = $1', {
      bind: [subject],
      type: sequelize.QueryTypes.SELECT
    });

    if (!classesResults) {
      throw new Error('Classes query returned undefined');
    }

    const classes = classesResults.map(result => result.class);

    res.json({ classes });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'Произошла ошибка', error: error.message });
  }
});

router.get('/schedule', async (req, res) => {
  const { subject, class: classValue } = req.query;

  if (!subject || !classValue) {
    return res.status(400).json({ message: 'Параметры предмета и класса обязательны' });
  }

  try {
    const scheduleResults = await sequelize.query('SELECT DISTINCT date, stdfio FROM actual WHERE subj = $1 AND class = $2', {
      bind: [subject, classValue],
      type: sequelize.QueryTypes.SELECT
    });

    if (!scheduleResults) {
      throw new Error('Schedule query returned undefined');
    }

    const dates = [...new Set(scheduleResults.map(result => result.date))].sort();
    const students = [...new Set(scheduleResults.map(result => result.stdfio))];

    res.json({ dates, students });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'Произошла ошибка', error: error.message });
  }
});

router.get('/get-grades', async (req, res) => {
  const { subject, class: classValue } = req.query;

  if (!subject || !classValue) {
    return res.status(400).json({ message: 'Параметры предмета и класса обязательны' });
  }

  try {
    const gradesResults = await sequelize.query(
      'SELECT stdfio, date, grades, comment FROM grades WHERE subj = $1 AND class = $2',
      {
        bind: [subject, classValue],
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({ grades: gradesResults });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'Произошла ошибка', error: error.message });
  }
});

router.post('/save-grades', async (req, res) => {
  const { student, date, grades, comment, subject, class: classValue } = req.body;

  try {
    await sequelize.query(
      'INSERT INTO grades (stdfio, date, grades, comment, subj, class) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (stdfio, date, subj, class) DO UPDATE SET grades = $3, comment = $4',
      {
        bind: [student, date, JSON.stringify(grades), comment, subject, classValue],
        type: sequelize.QueryTypes.INSERT
      }
    );

    res.json({ success: true, grades, comment });
  } catch (error) {
    console.error('Error saving grades:', error);
    res.status(500).json({ message: 'Произошла ошибка', error: error.message });
  }
});

module.exports = router;