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

        res.json(users);
    } catch (error) {
        console.error('Error fetching class details:', error);
        res.status(500).json({ error: 'Failed to fetch class details' });
    }
});

// Маршрут для отображения таблицы
router.get('/table', async (req, res) => {
    const classId = req.query.classId;

    try {
        let usersQuery = `
            SELECT c.name AS class_name, u.id AS user_id, u.firstname, u.lastname, a.type, a.date_from, a.date_to, a.comment
            FROM users u
            JOIN user_classes uc ON u.id = uc.user_id
            JOIN classes c ON uc.class_id = c.id
            LEFT JOIN attendance a ON u.id = a.user_id
            WHERE a.type IS NOT NULL AND a.date_from IS NOT NULL AND a.date_to IS NOT NULL
        `;

        // Добавим фильтр по classId, если он передан
        if (classId) {
            usersQuery += ' AND uc.class_id = :classId';
        }

        const users = await sequelize.query(usersQuery, {
            replacements: classId ? { classId } : {},
            type: QueryTypes.SELECT
        });

        // Запрос для получения списка классов
        const classesQuery = `
            SELECT id, name
            FROM classes
        `;
        const classes = await sequelize.query(classesQuery, { type: QueryTypes.SELECT });

        // Отправка данных в шаблон
        res.render('table', {
            title: 'Таблица посещаемости',
            users,
            classes,
            selectedClassId: classId
        });
    } catch (error) {
        console.error('Error fetching attendance table:', error);
        res.status(500).json({ error: 'Failed to fetch attendance table' });
    }
});

// Добавление маршрута для удаления записи о посещаемости
router.post('/delete-attendance', async (req, res) => {
    try {
        const { userId, dateFrom, dateTo } = req.body;

        if (!userId || !dateFrom || !dateTo) {
            return res.status(400).json({ error: 'Не указаны все необходимые параметры' });
        }

        const deleteQuery = `
            DELETE FROM attendance
            WHERE user_id = :userId AND date_from = :dateFrom AND date_to = :dateTo
        `;

        const result = await sequelize.query(deleteQuery, {
            replacements: { userId, dateFrom, dateTo },
            type: QueryTypes.DELETE
        });

        console.log('Delete result:', result);

        res.json({ message: 'Запись о посещаемости успешно удалена' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ error: 'Ошибка при удалении записи о посещаемости' });
    }
});

// Обработчик сохранения записи о посещаемости
router.post('/save-attendance', async (req, res) => {
    console.log('Получен запрос на сохранение посещаемости');

    try {
        const { userId, dateFrom, dateTo, attendanceType, comment } = req.body;

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

        // Проверяем, есть ли уже запись о посещаемости для этого ученика и указанных дат
        const existingAttendanceQuery = `
            SELECT id
            FROM attendance
            WHERE user_id = :userId
            AND date_from = :dateFrom
            AND date_to = :dateTo
        `;
        const existingAttendance = await sequelize.query(existingAttendanceQuery, {
            replacements: { userId, dateFrom, dateTo },
            type: QueryTypes.SELECT
        });

        if (existingAttendance.length > 0) {
            console.log('Ошибка: Запись о посещаемости уже существует для указанных дат');
            return res.status(400).json({ error: 'Запись о посещаемости уже существует для указанных дат' });
        }

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
