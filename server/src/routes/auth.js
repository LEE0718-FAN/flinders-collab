const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { signupValidation, loginValidation } = require('../utils/validators');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for avatars
  fileFilter: (req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and WebP images are allowed'));
    }
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Please try again in 15 minutes.' },
});

// POST /auth/signup - Register a new user
router.post('/signup', signupLimiter, signupValidation, validate, authController.signup);

// POST /auth/login - Sign in
router.post('/login', loginLimiter, loginValidation, validate, authController.login);

// POST /auth/logout - Sign out (requires auth)
router.post('/logout', authenticate, authController.logout);

// GET /auth/me - Get current user profile (requires auth)
router.get('/me', authenticate, authController.getMe);

// PATCH /auth/me - Update current user profile
router.patch('/me', authenticate, upload.single('avatar'), authController.updateProfile);

module.exports = router;
