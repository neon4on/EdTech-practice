const express = require('express');
const sequelize = require('../config/database');
const fs = require('fs');
const xlsx = require('xlsx');

const router = express.Router();

// Показать расписание с соотнесенными темами
router.get('/:id', async (req, res) => {
  try {
    const studyPlanId = parseInt(req.params.id, 10);

    if (isNaN(studyPlanId)) {
      return res.status(400).json({ message: 'Invalid study plan ID' });
    }

    const [results] = await sequelize.query('SELECT * FROM studyplans WHERE id = ?', {
      replacements: [studyPlanId],
    });
    const studyPlan = results[0];

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found' });
    }

    // Получить данные файла из таблицы files по file_id
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

    // Отладочная информация
    console.log('Excel Data:', excelData);

    // Извлечение данных
    const teacher = excelData[0][1]; // Убедитесь, что преподаватель указан в правильной ячейке
    const subject = excelData[1][1]; // Убедитесь, что предмет указан в правильной ячейке
    const classInfo = excelData[2][1].toString(); // Преобразование класса в строку

    // Извлечение тем уроков
    const topics = excelData.slice(5).map(row => row[0]); // Все темы уроков, начиная с 6-й строки

    // Проверка корректности данных
    if (!subject || !classInfo || topics.length === 0) {
      return res.status(400).json({ message: 'Missing required data in Excel file' });
    }

    // Получение расписания для данного предмета и класса
    const [scheduleResults] = await sequelize.query('SELECT * FROM actual WHERE subj = ? AND class = ?', {
      replacements: [subject, classInfo],
    });

    // Сортировка расписания по дате
    scheduleResults.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Подстановка тем по порядку к каждому уроку
    scheduleResults.forEach((lesson, index) => {
      lesson.topic = topics[index % topics.length]; // Повторение тем, если их меньше чем уроков
    });

    res.render('class_book/class_book', { 
      title: studyPlan.title, 
      teacher, 
      subject, 
      classInfo, 
      scheduleResults // Передаем все расписание
    });
  } catch (error) {
    console.error('Error occurred:', error); // Подробный вывод ошибки
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

module.exports = router;