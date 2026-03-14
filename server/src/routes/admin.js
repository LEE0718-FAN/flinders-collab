const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const monitor = require('../utils/monitor');

/**
 * Middleware to check if the authenticated user is an admin.
 */
async function requireAdmin(req, res, next) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
}

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/monitor
 * Returns all monitoring stats for the admin dashboard.
 */
router.get('/monitor', (req, res) => {
  try {
    const stats = monitor.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve monitoring stats' });
  }
});

/**
 * POST /api/admin/alerts/:alertId/resolve
 * Resolve a specific alert by ID.
 */
router.post('/alerts/:alertId/resolve', (req, res) => {
  try {
    const alertId = parseInt(req.params.alertId, 10);

    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    const alert = monitor.resolveAlert(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert resolved', alert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

/**
 * GET /api/admin/health
 * Trigger a manual health check and return results.
 */
router.get('/health', async (req, res) => {
  try {
    const result = await monitor.checkSupabaseHealth();
    res.json({
      supabase: result,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;
