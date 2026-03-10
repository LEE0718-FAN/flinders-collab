const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticate, requireRoomMember } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createRoomValidation,
  joinRoomValidation,
  roomIdParam,
} = require('../utils/validators');

// All room routes require authentication
router.use(authenticate);

// POST /rooms - Create a new room
router.post('/', createRoomValidation, validate, roomController.createRoom);

// GET /rooms - List my rooms
router.get('/', roomController.getRooms);

// GET /rooms/:roomId - Get room details (requires membership)
router.get(
  '/:roomId',
  roomIdParam,
  validate,
  requireRoomMember,
  roomController.getRoom
);

// POST /rooms/:roomId/join - Join a room with invite code
router.post(
  '/:roomId/join',
  roomIdParam,
  joinRoomValidation,
  validate,
  roomController.joinRoom
);

// GET /rooms/:roomId/members - List room members (requires membership)
router.get(
  '/:roomId/members',
  roomIdParam,
  validate,
  requireRoomMember,
  roomController.getMembers
);

module.exports = router;
