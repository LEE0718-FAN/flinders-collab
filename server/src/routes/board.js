const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body, param, query } = require('express-validator');
const boardController = require('../controllers/boardController');

router.use(authenticate);

// ── Posts ──

router.get(
  '/board/posts',
  [query('category').optional().trim()],
  validate,
  boardController.getPosts
);

router.post(
  '/board/posts',
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 5000 }),
    body('category').optional().trim().isLength({ max: 50 }),
  ],
  validate,
  boardController.createPost
);

router.delete(
  '/board/posts/:postId',
  [param('postId').isUUID()],
  validate,
  boardController.deletePost
);

// ── Participation ──

router.post(
  '/board/posts/:postId/participate',
  [
    param('postId').isUUID(),
    body('status').isIn(['join', 'pass']).withMessage('Status must be join or pass'),
  ],
  validate,
  boardController.toggleParticipation
);

router.get(
  '/board/my-participations',
  boardController.getMyParticipations
);

// ── Comments (generic) ──

router.get(
  '/comments/:targetType/:targetId',
  [
    param('targetType').isIn(['board_post', 'event', 'file']),
    param('targetId').isUUID(),
  ],
  validate,
  boardController.getComments
);

router.post(
  '/comments/:targetType/:targetId',
  [
    param('targetType').isIn(['board_post', 'event', 'file']),
    param('targetId').isUUID(),
    body('content').trim().notEmpty().withMessage('Comment cannot be empty').isLength({ max: 2000 }),
  ],
  validate,
  boardController.createComment
);

router.delete(
  '/comments/:commentId',
  [param('commentId').isUUID()],
  validate,
  boardController.deleteComment
);

// ── Academic Info ──

router.get('/academic-info', boardController.getAcademicInfo);

router.put(
  '/academic-info',
  [
    body('year_level').isInt({ min: 1, max: 7 }).withMessage('Year must be 1-7'),
    body('semester').isInt({ min: 1, max: 3 }).withMessage('Semester must be 1-3'),
  ],
  validate,
  boardController.updateAcademicInfo
);

module.exports = router;
