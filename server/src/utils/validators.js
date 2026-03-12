const { body, param, query } = require('express-validator');

// Flinders University email domain
const ALLOWED_DOMAINS = ['flinders.edu.au'];

/**
 * Validate that an email belongs to an allowed university domain.
 */
function isUniversityEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

// Auth validators
const signupValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .custom((value) => {
      if (!isUniversityEmail(value)) {
        throw new Error('Must use a Flinders University email address');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('student_id')
    .trim()
    .notEmpty()
    .withMessage('Student ID is required'),
  body('major')
    .optional()
    .trim(),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Room validators
const createRoomValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Room name is required')
    .isLength({ max: 100 })
    .withMessage('Room name must be under 100 characters'),
  body('course_name')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

const joinRoomValidation = [
  body('invite_code')
    .trim()
    .notEmpty()
    .withMessage('Invite code is required'),
];

// Event validators
const createEventValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ max: 200 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('location_name')
    .optional()
    .trim(),
  body('start_time')
    .isISO8601()
    .withMessage('Valid start time is required'),
  body('end_time')
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_time)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('enable_location_sharing')
    .optional()
    .isBoolean(),
];

const updateEventValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('location_name')
    .optional()
    .trim(),
  body('start_time')
    .optional()
    .isISO8601(),
  body('end_time')
    .optional()
    .isISO8601()
    .custom((value, { req }) => {
      // If both are provided, end must be after start
      const startTime = req.body.start_time;
      if (startTime && new Date(value) <= new Date(startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('enable_location_sharing')
    .optional()
    .isBoolean(),
];

// Message validators
const sendMessageValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 5000 })
    .withMessage('Message must be under 5000 characters'),
  body('message_type')
    .optional()
    .isIn(['text', 'system', 'file'])
    .withMessage('Invalid message type'),
];

// Location validators
const updateLocationValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('status')
    .optional()
    .isIn(['on_the_way', 'arrived', 'late'])
    .withMessage('Invalid status'),
];

// Task validators
const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('assigned_to')
    .optional()
    .isUUID(),
  body('due_date')
    .optional()
    .isISO8601(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']),
];

const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done']),
  body('assigned_to')
    .optional()
    .isUUID(),
  body('due_date')
    .optional()
    .isISO8601(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']),
];

// Param validators
const roomIdParam = [
  param('roomId').isUUID().withMessage('Invalid room ID'),
];

const eventIdParam = [
  param('eventId').isUUID().withMessage('Invalid event ID'),
];

const fileIdParam = [
  param('fileId').isUUID().withMessage('Invalid file ID'),
];

const taskIdParam = [
  param('taskId').isUUID().withMessage('Invalid task ID'),
];

module.exports = {
  isUniversityEmail,
  ALLOWED_DOMAINS,
  signupValidation,
  loginValidation,
  createRoomValidation,
  joinRoomValidation,
  createEventValidation,
  updateEventValidation,
  sendMessageValidation,
  updateLocationValidation,
  createTaskValidation,
  updateTaskValidation,
  roomIdParam,
  eventIdParam,
  fileIdParam,
  taskIdParam,
};
