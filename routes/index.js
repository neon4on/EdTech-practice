const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});


// Маршрут для рендеринга страницы mark
router.get('/', (req, res) => {
  res.render('mark'); // Здесь 'mark' - это название вашего шаблона mark.hbs
});

module.exports = router;


module.exports = router;
