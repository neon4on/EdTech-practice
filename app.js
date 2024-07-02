const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./config/database');
const bcrypt = require('bcrypt'); // Не забудьте подключить bcrypt
const authRouter = require('./routes/auth');
const groupRoutes = require('./routes/group');
const studyplanRoutes = require('./routes/study_plan');
const classBookRoutes = require('./routes/class_book'); // Подключаем маршрут для журнала
const indexRoutes = require('./routes/index');
const attendanceRoutes = require('./routes/attendance');

const app = express();

const hbs = exphbs.create({
  extname: '.hbs',
  helpers: {
    eq: function (v1, v2) {
      return v1 === v2;
    }
  }
}); 

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  session({
    secret: 'supersecretkey',
    store: new SequelizeStore({
      db: sequelize,
    }),
    resave: false,
    saveUninitialized: false,
  }),
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Middleware для проверки аутентификации
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

// Перенаправляем корневой маршрут на страницу авторизации, если пользователь не авторизован
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/index');
  } else {
    res.redirect('/auth/login');
  }
});

app.get('/index', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  res.render('index', { title: 'Главная страница' });
});

// Защищаем маршруты от неавторизованных пользователей
app.use('/groups', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}, groupRoutes);

app.use('/study_plans', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}, studyplanRoutes);

app.use('/class_book', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}, classBookRoutes);

app.use('/auth', authRouter);

app.use('/attendance', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}, attendanceRoutes);

// Остальные маршруты...
app.use('/index', indexRoutes); 

const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
