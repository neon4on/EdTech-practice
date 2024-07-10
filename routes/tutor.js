const express = require('express');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const router = express.Router();

// Получение списка всех домашних заданий
router.get('/', async (req, res) => {
    try {
        const homeworkQuery = `
            SELECT u.firstname, u.lastname, h.id, h.lesson_date, h.homework_text, h.attachment, h.attachment_filename
            FROM homework h
            JOIN users u ON h.teacher_id = u.id
            WHERE u.role = 'teacher'
        `;
        const homework = await sequelize.query(homeworkQuery, { type: QueryTypes.SELECT });

        res.render('tutor', { title: 'Список домашних заданий', homework });
    } catch (error) {
        console.error('Error fetching homework:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Маршрут для скачивания вложения
router.get('/download/:id', async (req, res) => {
    const homeworkId = req.params.id;

    try {
        const attachmentQuery = `
            SELECT attachment, attachment_filename
            FROM homework
            WHERE id = :homeworkId
        `;
        const attachmentResult = await sequelize.query(attachmentQuery, {
            replacements: { homeworkId },
            type: QueryTypes.SELECT
        });

        if (attachmentResult.length === 0) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const { attachment, attachment_filename } = attachmentResult[0];

        res.setHeader('Content-Disposition', `attachment; filename="${attachment_filename}"`);
        res.send(attachment);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ error: 'Failed to download attachment' });
    }
});

module.exports = router;
