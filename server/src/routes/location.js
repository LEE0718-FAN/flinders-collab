const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  updateLocationValidation,
  eventIdParam,
} = require('../utils/validators');

// All location routes require authentication
router.use(authenticate);

// POST /events/:eventId/location/start - Start sharing location
router.post(
  '/events/:eventId/location/start',
  eventIdParam,
  validate,
  locationController.startSharing
);

// POST /events/:eventId/location/update - Update current location
router.post(
  '/events/:eventId/location/update',
  eventIdParam,
  updateLocationValidation,
  validate,
  locationController.updateLocation
);

// POST /events/:eventId/location/stop - Stop sharing location
router.post(
  '/events/:eventId/location/stop',
  eventIdParam,
  validate,
  locationController.stopSharing
);

// GET /events/:eventId/location-status - Get all location sessions
router.get(
  '/events/:eventId/location-status',
  eventIdParam,
  validate,
  locationController.getLocationStatus
);

module.exports = router;
