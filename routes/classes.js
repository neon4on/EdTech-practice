const express = require('express');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const router = express.Router();

// Получение списка всех классов
router.get('/', async (req, res) => {
    try {
        const classesQuery = `
            SELECT id, name
            FROM classes
        `;
        const classes = await sequelize.query(classesQuery, { type: QueryTypes.SELECT });

        res.render('classes', { title: 'Список классов и участников с посещаемостью', classes });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Получение участников для выбранного класса
router.get('/class/:classId', async (req, res) => {
  const classId = req.params.classId;

  try {
      const usersQuery = `
          SELECT u.id, u.firstname, u.lastname, a.date_from, a.date_to, a.type, a.comment
          FROM users u
          JOIN user_classes uc ON u.id = uc.user_id
          LEFT JOIN attendance a ON u.id = a.user_id
          WHERE uc.class_id = :classId
      `;
      const users = await sequelize.query(usersQuery, {
          replacements: { classId },
          type: QueryTypes.SELECT
      });

      console.log('Class ID:', classId); // Отладочная информация
      console.log('Users:', users); // Проверка данных пользователей

      res.json(users);
  } catch (error) {
      console.error('Error fetching class details:', error);
      res.status(500).json({ error: 'Failed to fetch class details' });
  }
});

router.get('/btn_attendance', async (req, res) => {
    const classId = req.params.classId;

    try {
        const attendanceQuery = `
            SELECT u.firstname, u.lastname, a.type, a.date_from, a.date_to, a.comment
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            JOIN user_classes uc ON u.id = uc.user_id
            WHERE uc.class_id = :classId
        `;
        const attendance = await sequelize.query(attendanceQuery, {
            replacements: { classId },
            type: QueryTypes.SELECT
        });
        res.render('attendance', { 
            title: 'Таблица посещаемости',
            attendance
        });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Ошибка при получении данных о посещаемости' });
    }
});


 router.post('/save-attendance', async (req, res) => {

    console.log('Получен запрос на сохранение посещаемости');

    try {
        const { userId, dateFrom, dateTo, attendanceType, comment } = req.body;

        // Добавляем вывод данных в консоль перед отправкой
        console.log('Данные для сохранения в БД:', {
            userId,
            dateFrom,
            dateTo,
            attendanceType,
            comment
        });

        if (!userId || !dateFrom || !dateTo || !attendanceType) {
            console.log('Ошибка: Не все обязательные поля заполнены');
            return res.status(400).json({ error: 'Пожалуйста, заполните все поля!' });
        }

        // Выводим SQL-запрос в консоль
        console.log('SQL-запрос:', 'INSERT INTO attendance (user_id, date_from, date_to, type, comment) VALUES (?, ?, ?, ?, ?)',
            [userId, dateFrom, dateTo, attendanceType, comment]);

        const result = await sequelize.query(
            'INSERT INTO attendance (user_id, date_from, date_to, type, comment) VALUES (:userId, :dateFrom, :dateTo, :attendanceType, :comment)',
            {
                replacements: { userId, dateFrom, dateTo, attendanceType, comment },
                type: QueryTypes.INSERT
            }
        );

        console.log('Результат выполнения запроса:', result);

        res.json({ message: 'Посещаемость сохранена успешно!' });
    } catch (error) {
        console.error('Ошибка при сохранении посещаемости:', error);
        res.status(500).json({ error: 'Ошибка при сохранении посещаемости' });
    }
});



module.exports = router;
