const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Search topics
router.get('/topics/search', timetableController.searchTopics);

// Get my timetable
router.get('/my', timetableController.getMyTimetable);

// Add topic to timetable (auto-create/join room)
router.post('/add', timetableController.addToTimetable);

// Remove a single timetable entry
router.delete('/:entryId', timetableController.removeFromTimetable);

// Remove entire topic from timetable + leave room
router.delete('/topic/:topicId', timetableController.removeTopic);

// Get member count for a topic
router.get('/topic/:topicId/members', timetableController.getTopicMembers);

module.exports = router;
