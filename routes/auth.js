const express = require('express');
const bcrypt = require('bcrypt');
const sequelize = require('../config/database');
const router = express.Router();



router.get('/classes', async (req, res) => {
  try {
    const [classes] = await sequelize.query('SELECT name FROM classes');
    console.log('Classes loaded from database:', classes); // Логирование для отладки
    res.json(classes);
  } catch (error) {
    console.error('Ошибка загрузки классов:', error);
    res.status(500).json({ message: 'Ошибка загрузки классов' });
  }
});

router.get('/subjects', async (req, res) => {
  try {
    const [subjects] = await sequelize.query('SELECT name FROM subjects');
    res.json(subjects);
  } catch (error) {
    console.error('Ошибка загрузки предметов:', error);
    res.status(500).json({ message: 'Ошибка загрузки предметов' });
  }
});


router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Регистрация' });
});

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Вход' });
});

router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  const subjects = req.body['subjects[]'];
  const studentClass = req.body.class;
  const newClass = req.body.newClass;

  console.log('Request body:', req.body); // Логирование для отладки

  try {
    const [results] = await sequelize.query('SELECT * FROM users WHERE email = ?', {
      replacements: [email],
    });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await sequelize.query(
      'INSERT INTO users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?) RETURNING id',
      { replacements: [firstName, lastName, email, hashedPassword, role] }
    );

    if (role === 'teacher' && subjects && subjects.length > 0) {
      const subjectsArray = Array.isArray(subjects) ? subjects : [subjects];
      for (const subjectName of subjectsArray) {
        const [subject] = await sequelize.query('SELECT id FROM subjects WHERE name = ?', {
          replacements: [subjectName],
        });
    
        let subjectId;
        if (subject.length > 0) {
          subjectId = subject[0].id;
        } else {
          const [newSubject] = await sequelize.query('INSERT INTO subjects (name) VALUES (?) RETURNING id', {
            replacements: [subjectName],
          });
          subjectId = newSubject[0].id;
        }
    
        await sequelize.query('INSERT INTO user_subjects (user_id, subject_id) VALUES (?, ?)', {
          replacements: [user[0].id, subjectId],
        });
      }
    }
    

    if (role === 'student') {
      let classId;
      if (newClass) {
        const [existingClass] = await sequelize.query('SELECT id FROM classes WHERE name = ?', {
          replacements: [newClass],
        });

        if (existingClass.length > 0) {
          classId = existingClass[0].id;
        } else {
          const [newClassResult] = await sequelize.query('INSERT INTO classes (name) VALUES (?) RETURNING id', {
            replacements: [newClass],
          });
          classId = newClassResult[0].id;
        }
      } else {
        const [selectedClass] = await sequelize.query('SELECT id FROM classes WHERE name = ?', {
          replacements: [studentClass],
        });

        if (selectedClass.length > 0) {
          classId = selectedClass[0].id;
        } else {
          return res.status(400).json({ message: 'Выбранный класс не существует' });
        }
      }

      await sequelize.query('INSERT INTO user_classes (user_id, class_id) VALUES (?, ?)', {
        replacements: [user[0].id, classId],
      });
    }

    res.status(201).json({ message: 'Регистрация прошла успешно' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Произошла ошибка при регистрации' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны для ввода' });
  }

  const [results] = await sequelize.query('SELECT * FROM users WHERE email = ?', {
    replacements: [email],
  });


  if (results.length === 0) {
    return res.status(404).json({ message: 'Пользователь с таким email не найден' });
  }

  const user = results[0];
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Неверный пароль' });
  }

  // Сохраняем пользователя в сессии
  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstname: user.firstname, // Добавлено
    lastname: user.lastname     // Добавлено
  };

  res.json({ message: 'Вход выполнен успешно' });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при выходе' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Выход выполнен успешно' });
  });
});

module.exports = router;