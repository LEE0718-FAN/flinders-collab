const { supabaseAdmin } = require('../services/supabase');
const config = require('../config');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BACKUP_BUCKET = 'room-files-backup';
const SIGNED_URL_TTL_SECONDS = 60 * 5;

function extractStoragePath(rawValue, bucket) {
  if (!rawValue) return null;

  if (!/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  try {
    const url = new URL(rawValue);
    const bucketPattern = new RegExp(
      `/(?:object/(?:public|sign)/)?${bucket}/(.+?)(?:\\?.*)?$`
    );
    const match = url.pathname.match(bucketPattern);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function getMembershipRole(roomId, userId) {
  const { data } = await supabaseAdmin
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role || null;
}

async function buildSignedDownloadUrl(storagePath) {
  const bucket = config.upload.storageBucket;
  const normalizedPath = extractStoragePath(storagePath, bucket);

  if (!normalizedPath) {
    return null;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(normalizedPath, SIGNED_URL_TTL_SECONDS, {
      download: true,
    });

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

/**
 * POST /rooms/:roomId/files
 * Upload a file to Supabase Storage and record metadata.
 * Automatically creates a backup copy in the backup bucket.
 */
async function uploadFile(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;

    // Validate file type
    if (!config.upload.allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'File type not allowed. Supported: PDF, PPTX, DOCX, PNG, JPG, ZIP, TXT',
      });
    }

    // Validate file size (defence-in-depth; multer also limits)
    if (file.size > config.upload.maxFileSize) {
      return res.status(400).json({
        error: `File size exceeds the ${config.upload.maxFileSize / (1024 * 1024)}MB limit`,
      });
    }

    const bucket = config.upload.storageBucket;

    // Generate a unique storage path
    const ext = path.extname(file.originalname);
    const fileUuid = uuidv4();
    const storagePath = `rooms/${roomId}/${fileUuid}${ext}`;
    const backupPath = `rooms/${roomId}/${fileUuid}_backup${ext}`;

    // Upload to main bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }

    // Upload backup copy as part of the write path so every stored file
    // has a deterministic recovery target in the backup bucket.
    const { error: backupError } = await supabaseAdmin.storage
      .from(BACKUP_BUCKET)
      .upload(backupPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (backupError) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]).catch(() => {});
      return res.status(500).json({
        error: 'Failed to create backup copy for this file upload',
      });
    }

    // Save file metadata to database
    const insertObj = {
      room_id: roomId,
      uploaded_by: userId,
      file_name: file.originalname,
      file_url: storagePath,
      file_type: file.mimetype,
      file_size: file.size,
      backup_path: backupPath,
    };
    if (req.body.category) insertObj.category = req.body.category;
    if (req.body.description) insertObj.file_description = req.body.description;
    if (req.body.event_id) insertObj.event_id = req.body.event_id;

    const { data, error: dbError } = await supabaseAdmin
      .from('files')
      .insert(insertObj)
      .select()
      .single();

    if (dbError) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]).catch(() => {});
      return res.status(400).json({ error: dbError.message });
    }

    const download_url = await buildSignedDownloadUrl(data.file_url).catch(() => null);
    res.status(201).json({
      ...data,
      download_url,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rooms/:roomId/files
 * List all files in a room (excluding soft-deleted).
 */
async function getFiles(req, res, next) {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('files')
      .select(`
        *,
        users:uploaded_by (
          id,
          full_name,
          avatar_url
        ),
        event:event_id (
          id,
          title,
          start_time
        )
      `)
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const filesWithSignedUrls = await Promise.all(
      data.map(async (file) => ({
        ...file,
        download_url: await buildSignedDownloadUrl(file.file_url).catch(() => null),
      }))
    );

    res.json(filesWithSignedUrls);
  } catch (err) {
    next(err);
  }
}

async function getFileDownloadUrl(req, res, next) {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('id, room_id, file_name, file_url, deleted_at')
      .eq('id', fileId)
      .maybeSingle();

    if (error || !file || file.deleted_at) {
      return res.status(404).json({ error: 'File not found' });
    }

    const role = await getMembershipRole(file.room_id, userId);
    if (!role) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    const download_url = await buildSignedDownloadUrl(file.file_url);

    res.json({
      file_id: file.id,
      file_name: file.file_name,
      download_url,
      expires_in: SIGNED_URL_TTL_SECONDS,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /files/:fileId
 * Soft-delete a file. The file is hidden from the UI but remains in the
 * backup bucket for recovery. Only the uploader or room admin/owner can delete.
 */
async function deleteFile(req, res, next) {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Fetch file metadata
    const { data: file, error: fetchError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check room membership
    const role = await getMembershipRole(file.room_id, userId);
    if (!role) {
      return res.status(403).json({
        error: 'You are not a member of this room',
      });
    }

    const isUploader = file.uploaded_by === userId;
    const isAdmin = role === 'owner' || role === 'admin';

    if (!isUploader && !isAdmin) {
      return res.status(403).json({
        error: 'Only the uploader or room admin can delete this file',
      });
    }

    // Soft-delete: mark as deleted in DB, remove from main bucket only.
    // Backup bucket retains the file for recovery.
    const { error: updateError } = await supabaseAdmin
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Remove from main bucket (backup stays)
    const bucket = config.upload.storageBucket;
    const storagePath = extractStoragePath(file.file_url, bucket);

    if (storagePath) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
    }

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /files/:fileId
 * Update file metadata (description). Only the uploader or room admin can edit.
 */
async function updateFile(req, res, next) {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const { data: file } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (!file) return res.status(404).json({ error: 'File not found' });

    const role = await getMembershipRole(file.room_id, userId);
    if (!role) return res.status(403).json({ error: 'Not a room member' });

    const isUploader = file.uploaded_by === userId;
    const isAdmin = role === 'owner' || role === 'admin';
    if (!isUploader && !isAdmin) {
      return res.status(403).json({ error: 'Only the uploader or admin can edit this file' });
    }

    const { file_description } = req.body;
    const updates = {};
    if (file_description !== undefined) updates.file_description = file_description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('files')
      .update(updates)
      .eq('id', fileId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadFile,
  getFiles,
  getFileDownloadUrl,
  deleteFile,
  updateFile,
};
