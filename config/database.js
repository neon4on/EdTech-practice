const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('timetable', 'platonsrv', 'platonpass', {
  host: 'platon.teyhd.ru',
  dialect: 'postgres',
});

module.exports = sequelize;
