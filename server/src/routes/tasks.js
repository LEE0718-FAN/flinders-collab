const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, requireRoomMember } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createTaskValidation,
  updateTaskValidation,
  roomIdParam,
  taskIdParam,
} = require('../utils/validators');

// All task routes require authentication
router.use(authenticate);

// POST /rooms/:roomId/tasks - Create a task in a room
router.post(
  '/rooms/:roomId/tasks',
  roomIdParam,
  createTaskValidation,
  validate,
  requireRoomMember,
  taskController.createTask
);

// GET /rooms/:roomId/tasks - List tasks in a room
router.get(
  '/rooms/:roomId/tasks',
  roomIdParam,
  validate,
  requireRoomMember,
  taskController.getTasks
);

// PATCH /rooms/:roomId/tasks/:taskId - Update a task
router.patch(
  '/rooms/:roomId/tasks/:taskId',
  roomIdParam,
  taskIdParam,
  updateTaskValidation,
  validate,
  requireRoomMember,
  taskController.updateTask
);

// DELETE /rooms/:roomId/tasks/:taskId - Delete a task
router.delete(
  '/rooms/:roomId/tasks/:taskId',
  roomIdParam,
  taskIdParam,
  validate,
  requireRoomMember,
  taskController.deleteTask
);

module.exports = router;
