const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const pool = require('../db');  // ваш пул соединений с базой данных

// Создание расписания
router.post('/schedule', async (req, res) => {
    const { year, chapter, date, class_id, subject_id, time } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO schedule (year, chapter, date, class_id, subject_id, time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [year, chapter, date, class_id, subject_id, time]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/schedule/group/:groupId', async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.*
             FROM schedule s
             JOIN classes c ON s.class_id = c.id
             WHERE c.group_id = $1`,
            [groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/schedule/group/:groupId', async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.date, s.time, sub.name as subject_name
             FROM schedule s
             JOIN classes c ON s.class_id = c.id
             JOIN subjects sub ON s.subject_id = sub.id
             WHERE c.group_id = $1`,
            [groupId]
        );
        const groupResult = await pool.query('SELECT name FROM groups WHERE id = $1', [groupId]);
        res.render('schedule', {
            groupName: groupResult.rows[0].name,
            schedule: result.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;

