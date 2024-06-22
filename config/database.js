const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('edtech_practice', 'postgres', '1488', {
  host: 'localhost',
  dialect: 'postgres',
});

module.exports = sequelize;
