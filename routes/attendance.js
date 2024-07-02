const express = require('express');
const sequelize = require('../config/database');
const router = express.Router();

// Получение списка всех студентов
router.get('/users', async (req, res) => {
    try {
        const [users, metadata] = await sequelize.query("SELECT firstname, lastname FROM users WHERE role = 'student'");
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создание записи об отсутствии для студента
router.post('/attendance', async (req, res) => {
    const { date, type, comment } = req.body;
    const user_id = req.session.user.id;
    try {
        await sequelize.query(
            'INSERT INTO attendance (user_id, date, type, comment) VALUES (?, ?, ?, ?)',
            { replacements: [user_id, date, type, comment] },
        );
        res.status(201).json({ message: 'Attendance record created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение списка отсутствий для конкретного студента
router.get('/', async (req, res) => {
    const user_id = req.session.user.id;
    try {
        const [attendance, metadata] = await sequelize.query(
            'SELECT users.firstname, users.lastname, attendance.date, attendance.type, attendance.comment ' +
            'FROM attendance JOIN users ON attendance.user_id = users.id WHERE users.id = ?',
            { replacements: [user_id] },
        );
        if (attendance.length > 0) {
            res.json(attendance);
        } else {
            res.status(404).send('No attendance records found for this student');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновление записи об отсутствии
router.put('/attendance', async (req, res) => {
    const { id, date, type, comment } = req.body;
    try {
        await sequelize.query(
            'UPDATE attendance SET date = ?, type = ?, comment = ? WHERE id = ?',
            { replacements: [date, type, comment, id] },
        );
        res.status(200).json({ message: 'Attendance record updated' });
    } catch (error) {
        res.status500().json({ error: error.message });
    }
});

// Удаление записи об отсутствии
router.delete('/attendance', async (req, res) => {
    const { id } = req.body;
    try {
        await sequelize.query(
            'DELETE FROM attendance WHERE id = ?',
            { replacements: [id] },
        );
        res.status(200).json({ message: 'Attendance record deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;