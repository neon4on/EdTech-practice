const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('users', 'admin', '1234', {
  host: 'localhost',
  dialect: 'postgres',
});

module.exports = sequelize;
