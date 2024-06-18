const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/group');
// const scheduleRoutes = require('./routes/schedule');
// const studentRoutes = require('./routes/students');

const app = express();

const hbs = exphbs.create({ extname: '.hbs' });
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

app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
// app.use('/schedule', scheduleRoutes);
// app.use('/students', studentRoutes);

app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
