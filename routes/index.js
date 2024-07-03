const express = require('express');
const router = express.Router();

// router.get('/', (req, res) => {
//   res.render('index', { title: 'Home' });
// });


router.get('/', (req, res) => {
  const user = req.session.user || null;
  res.render('index', { user });
});


<<<<<<< HEAD



=======
>>>>>>> nailka
module.exports = router;
