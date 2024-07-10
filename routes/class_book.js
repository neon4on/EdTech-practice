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

router.post('/save-grade', async (req, res) => {
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

router.delete('/delete-grade', async (req, res) => {
  const { studentId, classId, subjectId, date, category } = req.body;

  try {
    const [result] = await sequelize.query(`
      DELETE FROM grades
      WHERE student_id = ? AND class_id = ? AND subject_id = ? AND date = ? AND category = ?
    `, {
      replacements: [studentId, classId, subjectId, date, category],
      type: sequelize.QueryTypes.DELETE
    });

    res.status(200).json({ message: 'Оценка успешно удалена', rowsAffected: result });
    console.log('Grade deleted successfully');
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ message: 'Ошибка удаления оценки', error: error.message });
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

router.get('/study_plan', async (req, res) => {
  const { subjectId, classId } = req.query;
  try {
    const [studyPlan] = await sequelize.query(`
      SELECT sp.id, sp.title, sp.description, sp.classid, c.name as classname, sp.file_id
      FROM studyplans sp
      LEFT JOIN classes c ON sp.classid = c.id
      WHERE sp.subjectid = ? AND sp.classid = ?
    `, {
      replacements: [subjectId, classId]
    });

    if (studyPlan.length === 0) {
      return res.status(404).json({ message: 'Учебный план не найден' });
    }

    const fileId = studyPlan[0].file_id;

    const [fileResults] = await sequelize.query('SELECT file_data FROM files WHERE id = ?', {
      replacements: [fileId],
    });

    if (!fileResults || fileResults.length === 0) {
      return res.status(400).json({ message: 'No file found' });
    }

    const fileData = fileResults[0].file_data;
    const fileBuffer = Buffer.from(fileData, 'binary');
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const topics = excelData.slice(5).map(row => row[0]);

    res.status(200).json({ topics });
  } catch (error) {
    console.error('Ошибка загрузки учебного плана:', error);
    res.status(500).json({ message: 'Ошибка загрузки учебного плана' });
  }
});

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/update_topic', upload.single('homeworkFile'), async (req, res) => {
  const { subjectId, classId, date, newTopic, originalTopic, topicIndex, homework } = req.body;
  const homeworkFile = req.file;
  const teacherId = req.session.user.id; // Assuming teacher ID is stored in session

  console.log('Received ', { subjectId, classId, date, newTopic, originalTopic, topicIndex, homework, homeworkFile });

  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  if (!subjectId || !classId || !date || !newTopic || !originalTopic || topicIndex === undefined) {
    console.error('Missing required ', { subjectId, classId, date, newTopic, originalTopic, topicIndex, homework });
    return res.status(400).json({ message: 'Отсутствуют необходимые данные' });
  }

  try {
    const [studyPlan] = await sequelize.query(`
      SELECT sp.id, sp.file_id
      FROM studyplans sp
      WHERE sp.subjectid = ? AND sp.classid = ?
    `, {
      replacements: [subjectId, classId]
    });

    if (studyPlan.length === 0) {
      return res.status(404).json({ message: 'Учебный план не найден' });
    }

    const fileId = studyPlan[0].file_id;

    const [fileResults] = await sequelize.query('SELECT file_data FROM files WHERE id = ?', {
      replacements: [fileId],
    });

    if (!fileResults || fileResults.length === 0) {
      return res.status(400).json({ message: 'Файл не найден' });
    }

    const fileData = fileResults[0].file_data;
    const fileBuffer = Buffer.from(fileData, 'binary');
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const adjustedIndex = parseInt(topicIndex) + 5;

    if (!excelData[adjustedIndex] || !Array.isArray(excelData[adjustedIndex])) {
      return res.status(400).json({ message: 'Неверный индекс темы' });
    }

    if (excelData[adjustedIndex][0] !== originalTopic) {
      return res.status(409).json({ message: 'Тема была изменена другим пользователем' });
    }

    excelData[adjustedIndex][0] = newTopic;

    const updatedWorksheet = xlsx.utils.aoa_to_sheet(excelData);
    workbook.Sheets[workbook.SheetNames[0]] = updatedWorksheet;
    const updatedBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await sequelize.query('UPDATE files SET file_data = ? WHERE id = ?', {
      replacements: [updatedBuffer, fileId],
    });

    // Save homework
    const homeworkData = {
      class_id: classId,
      subject_id: subjectId,
      lesson_date: date,
      homework_text: homework,
      teacher_id: teacherId,
    };

    if (homeworkFile && homeworkFile.buffer && homeworkFile.originalname) {
      console.log('Received homework file:', homeworkFile);
      console.log('Homework file buffer:', homeworkFile.buffer);
      console.log('Homework file original name:', homeworkFile.originalname);

      homeworkData.attachment = homeworkFile.buffer;
      homeworkData.attachment_filename = homeworkFile.originalname;
    } else {
      console.log('No valid homework file data found');
    }


    
    console.log('Homework data to save:', homeworkData);

    await sequelize.query(`
      INSERT INTO homework (class_id, subject_id, lesson_date, homework_text, teacher_id, attachment, attachment_filename)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (class_id, subject_id, lesson_date) DO UPDATE
      SET homework_text = EXCLUDED.homework_text,
      attachment = EXCLUDED.attachment,
      attachment_filename = EXCLUDED.attachment_filename,
      updated_at = CURRENT_TIMESTAMP
      `, {
        replacements: [
          homeworkData.class_id,
          homeworkData.subject_id,
          homeworkData.lesson_date,
          homeworkData.homework_text,
          homeworkData.teacher_id,
          homeworkData.attachment || null,
          homeworkData.attachment_filename || null,
        ],
      });

    console.log('Homework saved successfully');
    res.status(200).json({ message: 'Тема и домашнее задание успешно обновлены' });
  } catch (error) {
    console.error('Error updating topic and homework:', error);
    res.status(500).json({ message: 'Ошибка обновления темы и домашнего задания', error: error.message });
  }
});

router.get('/attendance', async (req, res) => {
  const { classId, startDate, endDate } = req.query;
  if (!req.session.user || req.session.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }

  try {
    const [attendance] = await sequelize.query(`
      SELECT a.user_id, a.date_from, a.date_to, a.type
      FROM attendance a
      JOIN user_classes uc ON a.user_id = uc.user_id
      WHERE uc.class_id = ? AND 
      ((a.date_from BETWEEN ? AND ?) OR (a.date_to BETWEEN ? AND ?) OR (? BETWEEN a.date_from AND a.date_to))
    `, {
      replacements: [classId, startDate, endDate, startDate, endDate, startDate]
    });
    res.json(attendance);
  } catch (error) {
    console.error('Error loading attendance:', error);
    res.status(500).json({ message: 'Ошибка загрузки данных о пропусках' });
  }
});



module.exports = router;