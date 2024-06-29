const express = require('express');
const sequelize = require('../config/database');
const router = express.Router();
const moment = require('moment');

router.get('/', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }
  res.render('class_book', { title: 'Журнал' });
});

router.get('/subjects', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  try {
    const [subjects] = await sequelize.query(`
      SELECT s.id, s.name
      FROM subjects s
      JOIN user_subjects us ON s.id = us.subject_id
      WHERE us.user_id = ?
    `, {
      replacements: [req.session.user.id]
    });
    res.json(subjects);
  } catch (error) {
    console.error('Error loading subjects:', error);
    res.status(500).json({ message: 'Ошибка загрузки предметов' });
  }
});

router.get('/classes', async (req, res) => {
  try {
    const [classes] = await sequelize.query('SELECT id, name FROM classes');
    res.json(classes);
  } catch (error) {
    console.error('Error loading classes:', error);
    res.status(500).json({ message: 'Ошибка загрузки классов' });
  }
});

router.get('/students', async (req, res) => {
  const { classId } = req.query;
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  try {
    const [students] = await sequelize.query(`
      SELECT u.id, u.firstName, u.lastName
      FROM users u
      JOIN user_classes uc ON u.id = uc.user_id
      WHERE uc.class_id = ? AND u.role = 'student'
    `, {
      replacements: [classId]
    });
    res.json(students);
  } catch (error) {
    console.error('Error loading students:', error);
    res.status(500).json({ message: 'Ошибка загрузки учеников' });
  }
});

router.get('/schedule', async (req, res) => {
  const { subjectId, classId } = req.query;
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  const currentDate = moment();
  const startOfCurrentMonth = currentDate.startOf('month').format('YYYY-MM-DD');
  const endOfNextMonth = currentDate.add(1, 'months').endOf('month').format('YYYY-MM-DD');

  try {
    const [schedule] = await sequelize.query(`
      SELECT a.date
      FROM actual a
      WHERE a.subj = (
        SELECT name FROM subjects WHERE id = ?
      ) AND a.class = (
        SELECT name FROM classes WHERE id = ?
      )
      AND a.date BETWEEN ? AND ?
      ORDER BY a.date
    `, {
      replacements: [subjectId, classId, startOfCurrentMonth, endOfNextMonth]
    });

    const formattedSchedule = schedule.map(item => ({
      fullDate: item.date,
      date: moment(item.date).format('D'),
      weekDay: moment(item.date).format('dd'),
      month: moment(item.date).format('MMMM')
    }));

    res.json(formattedSchedule);
  } catch (error) {
    console.error('Error loading schedule:', error);
    res.status(500).json({ message: 'Ошибка загрузки расписания' });
  }
});

router.get('/grade_weights', async (req, res) => {
  try {
    const [weights] = await sequelize.query('SELECT * FROM grade_weights');
    res.json(weights);
  } catch (error) {
    console.error('Error loading grade weights:', error);
    res.status(500).json({ message: 'Ошибка загрузки весов категорий' });
  }
});

router.post('/grade', async (req, res) => {
  const { studentId, classId, subjectId, date, category, weight, grade } = req.body;

  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  if (!studentId || !classId || !subjectId || !date || !category || !weight || !grade) {
    return res.status(400).json({ message: 'Отсутствуют необходимые данные' });
  }

  try {
    await sequelize.query(`
      INSERT INTO grades (student_id, class_id, subject_id, date, category, weight, grade)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (student_id, class_id, subject_id, date, category)
      DO UPDATE SET grade = EXCLUDED.grade, weight = EXCLUDED.weight
    `, {
      replacements: [studentId, classId, subjectId, date, category, weight, grade]
    });
    res.status(200).json({ message: 'Оценка сохранена' });
  } catch (error) {
    console.error('Error saving grade:', error);
    res.status(500).json({ message: 'Ошибка сохранения оценки' });
  }
});

router.get('/existing-grades', async (req, res) => {
  const { classId, subjectId } = req.query;
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  try {
    const [grades] = await sequelize.query(`
      SELECT student_id, date, category, grade
      FROM grades
      WHERE class_id = ? AND subject_id = ?
    `, {
      replacements: [classId, subjectId]
    });
    res.json(grades);
  } catch (error) {
    console.error('Error loading existing grades:', error);
    res.status(500).json({ message: 'Ошибка загрузки существующих оценок' });
  }
});

module.exports = router;