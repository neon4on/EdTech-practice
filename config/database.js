const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('yourdatabase', 'yourusername', 'yourpassword', {
  host: 'localhost',
  dialect: 'postgres',
});

module.exports = sequelize;
