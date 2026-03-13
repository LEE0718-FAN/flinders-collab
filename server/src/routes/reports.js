const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// POST /api/reports - Create a report (any user)
router.post('/reports', reportController.createReport);

// GET /api/reports - Get all reports (admin only)
router.get('/reports', reportController.getReports);

// PATCH /api/reports/:reportId - Update report status (admin only)
router.patch('/reports/:reportId', reportController.updateReport);

// GET /api/admin/users - Get all users (admin only)
router.get('/admin/users', reportController.getUsers);

// PATCH /api/admin/users/:userId/admin - Toggle admin status (admin only)
router.patch('/admin/users/:userId/admin', reportController.toggleAdmin);

// DELETE /api/admin/users/:userId - Delete a user (admin only)
router.delete('/admin/users/:userId', reportController.deleteUser);

module.exports = router;
