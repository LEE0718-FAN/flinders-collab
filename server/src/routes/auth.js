const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { signupValidation, loginValidation } = require('../utils/validators');

// POST /auth/signup - Register a new user
router.post('/signup', signupValidation, validate, authController.signup);

// POST /auth/login - Sign in
router.post('/login', loginValidation, validate, authController.login);

// POST /auth/logout - Sign out (requires auth)
router.post('/logout', authenticate, authController.logout);

// GET /auth/me - Get current user profile (requires auth)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
