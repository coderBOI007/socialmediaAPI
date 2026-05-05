const router = require('express').Router();
const { signup, signin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { signupRules, signinRules, validate } = require('../middleware/validate');

router.post('/signup', signupRules, validate, signup);
router.post('/signin', signinRules, validate, signin);
router.get('/me', protect, getMe);

module.exports = router;