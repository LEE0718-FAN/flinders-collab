const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const monitor = require('../utils/monitor');
const { getNextMaintenanceTime, runOptimization } = require('../utils/maintenance');
const config = require('../config');
const path = require('path');

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
 * GET /api/admin/storage
 * Refresh and return storage usage stats.
 */
router.get('/storage', async (req, res) => {
  try {
    const result = await monitor.checkStorageUsage();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check storage usage' });
  }
});

/**
 * GET /api/admin/maintenance
 * Get next maintenance schedule.
 */
router.get('/maintenance', (req, res) => {
  const next = getNextMaintenanceTime();
  res.json({
    nextMaintenanceTime: next ? next.toISOString() : null,
    timezone: 'ACDT (UTC+10:30)',
    schedule: 'Daily at 3:00 AM ACDT',
  });
});

/**
 * POST /api/admin/maintenance/run
 * Manually trigger maintenance optimization.
 */
router.post('/maintenance/run', async (req, res) => {
  try {
    const result = await runOptimization();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Maintenance failed: ' + err.message });
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

async function storageObjectExists(bucket, storagePath) {
  const directory = path.posix.dirname(storagePath);
  const fileName = path.posix.basename(storagePath);
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(directory === '.' ? '' : directory, { limit: 100, search: fileName });

  if (error) {
    throw error;
  }

  return (data || []).some((item) => item.name === fileName);
}

router.get('/files/deleted', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('files')
      .select(`
        id,
        room_id,
        file_name,
        file_type,
        file_size,
        file_url,
        backup_path,
        created_at,
        deleted_at,
        users:uploaded_by (
          id,
          full_name,
          university_email
        ),
        rooms:room_id (
          id,
          name
        )
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load deleted files' });
  }
});

router.post('/files/:fileId/restore', async (req, res) => {
  try {
    const { fileId } = req.params;
    const mainBucket = config.upload.storageBucket;
    const backupBucket = config.upload.backupBucket;

    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (error || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!file.deleted_at) {
      return res.status(400).json({ error: 'File is already active' });
    }

    if (!file.backup_path) {
      return res.status(409).json({ error: 'No backup copy is recorded for this file' });
    }

    const backupExists = await storageObjectExists(backupBucket, file.backup_path);
    if (!backupExists) {
      return res.status(409).json({ error: 'Backup file is missing and cannot be restored' });
    }

    const { data: backupBlob, error: backupDownloadError } = await supabaseAdmin.storage
      .from(backupBucket)
      .download(file.backup_path);

    if (backupDownloadError || !backupBlob) {
      return res.status(500).json({ error: backupDownloadError?.message || 'Failed to read backup file' });
    }

    const restoreBuffer = Buffer.from(await backupBlob.arrayBuffer());
    const { error: restoreError } = await supabaseAdmin.storage
      .from(mainBucket)
      .upload(file.file_url, restoreBuffer, {
        contentType: file.file_type || 'application/octet-stream',
        upsert: true,
      });

    if (restoreError) {
      return res.status(500).json({ error: restoreError.message });
    }

    const { data: restoredFile, error: updateError } = await supabaseAdmin
      .from('files')
      .update({ deleted_at: null })
      .eq('id', fileId)
      .select(`
        id,
        room_id,
        file_name,
        file_type,
        file_size,
        file_url,
        backup_path,
        created_at,
        deleted_at,
        users:uploaded_by (
          id,
          full_name,
          university_email
        ),
        rooms:room_id (
          id,
          name
        )
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({
      message: 'File restored successfully',
      file: restoredFile,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore file' });
  }
});

router.get('/files/integrity', async (req, res) => {
  try {
    const mainBucket = config.upload.storageBucket;
    const backupBucket = config.upload.backupBucket;
    const { data: files, error } = await supabaseAdmin
      .from('files')
      .select('id, room_id, file_name, file_url, backup_path, deleted_at, created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const checks = await Promise.all(
      (files || []).map(async (file) => {
        const mainExists = file.file_url
          ? await storageObjectExists(mainBucket, file.file_url).catch(() => false)
          : false;
        const backupExists = file.backup_path
          ? await storageObjectExists(backupBucket, file.backup_path).catch(() => false)
          : false;
        const status = !file.deleted_at
          ? (mainExists && backupExists ? 'healthy' : 'missing_backup')
          : (backupExists ? 'restorable' : 'missing_backup');

        return {
          ...file,
          main_exists: mainExists,
          backup_exists: backupExists,
          integrity_status: status,
        };
      })
    );

    const summary = checks.reduce((acc, file) => {
      acc.total += 1;
      if (file.deleted_at) acc.deleted += 1;
      else acc.active += 1;
      if (file.backup_exists) acc.withBackup += 1;
      if (file.integrity_status === 'healthy') acc.healthy += 1;
      if (file.integrity_status === 'restorable') acc.restorable += 1;
      if (file.integrity_status === 'missing_backup') acc.missingBackup += 1;
      return acc;
    }, {
      total: 0,
      active: 0,
      deleted: 0,
      withBackup: 0,
      healthy: 0,
      restorable: 0,
      missingBackup: 0,
    });

    res.json({
      checkedAt: new Date().toISOString(),
      summary,
      files: checks,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run file integrity check' });
  }
});

module.exports = router;
