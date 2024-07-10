const express = require('express');
const sequelize = require('../config/database');
const router = express.Router();
const moment = require('moment');
const fs = require('fs');
const xlsx = require('xlsx');

router.get('/', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }
  res.render('homework', { title: 'Журнал' });
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





router.get('/homework', (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }
  res.render('homework', { title: 'Просмотр домашних заданий' }, (err, html) => {
    if (err) {
      console.error('Error rendering homework template:', err);
      return next(err);
    }
    res.send(html);
  });
});

router.get('/get_homework', async (req, res) => {
  const { classId, subjectId, date } = req.query;
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  try {
    const [homework] = await sequelize.query(`
      SELECT homework_text, attachment, attachment_filename
      FROM homework
      WHERE class_id = ? AND subject_id = ? AND lesson_date = ?
    `, {
      replacements: [classId, subjectId, date]
    });

    if (homework.length > 0) {
      res.json(homework[0]);
    } else {
      res.json({ message: 'Домашнее задание не найдено' });
    }
  } catch (error) {
    console.error('Error loading homework:', error);
    res.status(500).json({ message: 'Ошибка загрузки домашнего задания' });
  }
});

router.get('/download_homework_file', async (req, res) => {
  const { classId, subjectId, date } = req.query;
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  try {
    const [homework] = await sequelize.query(`
      SELECT attachment, attachment_filename
      FROM homework
      WHERE class_id = ? AND subject_id = ? AND lesson_date = ?
    `, {
      replacements: [classId, subjectId, date]
    });

    if (homework.length > 0 && homework[0].attachment && homework[0].attachment_filename) {
      res.setHeader('Content-Disposition', `attachment; filename=${homework[0].attachment_filename}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(homework[0].attachment);
    } else {
      res.status(404).json({ message: 'Файл не найден' });
    }
  } catch (error) {
    console.error('Error downloading homework file:', error);
    res.status(500).json({ message: 'Ошибка загрузки файла домашнего задания' });
  }
});

module.exports = router;