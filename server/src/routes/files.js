const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');
const { authenticate, requireRoomMember } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { roomIdParam, fileIdParam } = require('../utils/validators');
const config = require('../config');

// Configure multer for memory storage (files go to Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// All file routes require authentication
router.use(authenticate);

// POST /rooms/:roomId/files - Upload a file
router.post(
  '/rooms/:roomId/files',
  roomIdParam,
  validate,
  requireRoomMember,
  upload.single('file'),
  fileController.uploadFile
);

// GET /rooms/:roomId/files - List files in a room
router.get(
  '/rooms/:roomId/files',
  roomIdParam,
  validate,
  requireRoomMember,
  fileController.getFiles
);

// PATCH /files/:fileId - Update file metadata
router.patch(
  '/files/:fileId',
  fileIdParam,
  validate,
  fileController.updateFile
);

// DELETE /files/:fileId - Delete a file
router.delete(
  '/files/:fileId',
  fileIdParam,
  validate,
  fileController.deleteFile
);

module.exports = router;
