/*
-— код для создания таблицы study_plan —-

CREATE TABLE study_plan (
id SERIAL PRIMARY KEY,
title VARCHAR(255),
description TEXT,
groupId INT
);


*/

const express = require('express');
const app = express();
app.use(express.json());

let studyPlans = [];

// Маршрут для получения учебных планов. Если указан id, возвращается конкретный учебный план.
app.get('/study_plans/:id?', (req, res) => {
if (req.params.id) {
const plan = studyPlans.find(plan => plan.id === parseInt(req.params.id));
res.send(plan);
} else {
res.send(studyPlans);
}
});

// Маршрут для создания нового учебного плана
app.post('/study_plans', (req, res) => {
const newPlan = req.body;
studyPlans.push(newPlan);
res.send(newPlan);
});

// Маршрут для обновления существующего учебного плана
app.put('/study_plans/:id', (req, res) => {
const updatedPlan = req.body;
studyPlans = studyPlans.map(plan => plan.id === parseInt(req.params.id) ? updatedPlan : plan);
res.send(updatedPlan);
});

// Маршрут для удаления учебного плана
app.delete('/study_plans/:id', (req, res) => {
studyPlans = studyPlans.filter(plan => plan.id !== parseInt(req.params.id));
res.send({ message: 'Study plan deleted' });
});

// Запуск сервера на порту 3000
app.listen(3000, () => console.log('Server is running on port 3000'));


/* 

------ ФУНКЦИИ ------- 

*/

// Импорт модуля для работы с базой данных
const db = require('./config');

// Получение списка всех учебных планов из базы данных
async function getAllStudyPlans() {
    const studyPlans = await db.query('SELECT * FROM StudyPlans');
    return studyPlans;
}

// Создание нового учебного плана и сохранение его в базе данных
async function createStudyPlan(plan) {
    const result = await db.query('INSERT INTO StudyPlans SET ?', plan);
    return result.insertId;
}

// Получение конкретного учебного плана по идентификатору
async function getStudyPlanById(id) {
    const plan = await db.query('SELECT * FROM StudyPlans WHERE id = ?', [id]);
    return plan[0];
}

// Обновление существующего учебного плана
async function updateStudyPlan(id, updatedPlan) {
    await db.query('UPDATE StudyPlans SET ? WHERE id = ?', [updatedPlan, id]);
}

// Удаление учебного плана
async function deleteStudyPlan(id) {
    await db.query('DELETE FROM StudyPlans WHERE id = ?', [id]);
}
