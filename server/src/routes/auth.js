const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');
const { signupValidation, loginValidation, passwordResetValidation } = require('../utils/validators');

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

// POST /auth/password/reset - Send password reset email
router.post('/password/reset', loginLimiter, passwordResetValidation, validate, authController.requestPasswordReset);

// POST /auth/logout - Sign out (requires auth)
router.post('/logout', authenticate, authController.logout);

// GET /auth/me - Get current user profile (requires auth)
router.get('/me', authenticate, authController.getMe);

// PATCH /auth/me - Update current user profile
router.patch('/me', authenticate, upload.single('avatar'), authController.updateProfile);

// GET /auth/preferences - Get current user's cross-device preferences
router.get('/preferences', authenticate, authController.getPreferences);

// PATCH /auth/preferences - Update current user's cross-device preferences
router.patch(
  '/preferences',
  authenticate,
  [
    body('room_order').optional().isArray(),
    body('room_order.*').optional().isString(),
    body('flinders_interests').optional().isArray(),
    body('flinders_interests.*').optional().isString(),
    body('flinders_favorites').optional().isArray(),
    body('flinders_favorites.*').optional().isString(),
  ],
  validate,
  authController.updatePreferences
);

// POST /auth/guest - Create temp tester account (rate limited)
const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
router.post('/guest', guestLimiter, authController.guestLogin);

// POST /auth/guest/cleanup - Delete tester account (requires auth)
router.post('/guest/cleanup', authenticate, authController.guestCleanup);

module.exports = router;
