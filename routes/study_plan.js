const express = require('express');
const sequelize = require('../config/database');

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
router.get('/study_plans/:id', async (req, res) => {
  const [results, metadata] = await sequelize.query('SELECT * FROM studyplans WHERE id = ?', {
    replacements: [req.params.id],
  });
  const studyPlan = results[0];
  res.render('study_plans/show', { title: studyPlan.title, studyPlan });
});


router.post('/new', async (req, res) => {
  const { title, description, groupId } = req.body;
  try {
    await sequelize.query(
      'INSERT INTO studyplans (title, description, groupid) VALUES (?, ?, ?)',
      { replacements: [title, description, groupId] },
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

// Обновить учебный план
router.post('/edit/:id', async (req, res) => {
  const { title, description, groupId } = req.body;
  await sequelize.query(
    'UPDATE studyplans SET title = ?, description = ?, groupid = ? WHERE id = ?',
    { replacements: [title, description, groupId, req.params.id] },
  );
  res.redirect('/study_plans');
});

// Удалить учебный план
router.get('/delete/:id', async (req, res) => {
  await sequelize.query(
    'DELETE FROM studyplans WHERE id = ?',
    { replacements: [req.params.id] },
  );
  res.redirect('/study_plans');
});



module.exports = router;
