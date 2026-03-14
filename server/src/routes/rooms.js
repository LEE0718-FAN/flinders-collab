const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const activityController = require('../controllers/activityController');
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

// POST /rooms/join - Primary join flow from the dashboard using only an invite code
router.post('/join', joinRoomValidation, validate, roomController.joinRoomByCode);

// GET /rooms/:roomId - Get room details (requires membership)
router.get(
  '/:roomId',
  roomIdParam,
  validate,
  requireRoomMember,
  roomController.getRoom
);

// POST /rooms/:roomId/join - Legacy invite-code join route kept for compatibility
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

// PATCH /rooms/:roomId - Update room (owner only)
router.patch(
  '/:roomId',
  roomIdParam,
  validate,
  roomController.updateRoom
);

// POST /rooms/:roomId/leave - Leave a room (non-owners only)
router.post(
  '/:roomId/leave',
  roomIdParam,
  validate,
  roomController.leaveRoom
);

// GET /rooms/:roomId/activity - Get recent activity (requires membership)
router.get(
  '/:roomId/activity',
  roomIdParam,
  validate,
  requireRoomMember,
  activityController.getRoomActivity
);

// DELETE /rooms/:roomId - Delete a room (owner only)
router.delete(
  '/:roomId',
  roomIdParam,
  validate,
  roomController.deleteRoom
);

module.exports = router;
