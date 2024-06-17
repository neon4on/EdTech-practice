const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./config/database');

// Инициализация приложения :3
const app = express();

// Настройка Handlebars
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');

// Парсинг тела запроса
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Настройка сессий
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

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты
app.use('/', require('./routes/index'));

// Запуск сервера
const PORT = process.env.PORT || 3000;
// sequelize.sync().then(() => {

// });
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
