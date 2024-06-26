const express = require('express');
const sequelize = require('../config/database');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('class_book/mark'); // Здесь 'mark' - это название вашего шаблона mark.hbs
});

// Получение всех предметов и классов
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
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

// Получение всех классов по выбранному предмету
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

    if (!classesResults) {
      throw new Error('Classes query returned undefined');
    }

    const classes = classesResults.map(result => result.class);

    res.json({ classes });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

// Получение расписания для выбранного предмета и класса
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

    if (!scheduleResults) {
      throw new Error('Schedule query returned undefined');
    }

    const dates = [...new Set(scheduleResults.map(result => result.date))].sort();
    const students = [...new Set(scheduleResults.map(result => result.stdfio))];

    res.json({ dates, students });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

module.exports = router;
