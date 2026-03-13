const { supabaseAdmin } = require('../services/supabase');
const config = require('../config');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BACKUP_BUCKET = 'room-files-backup';

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

    // Upload backup copy (non-blocking, don't fail if backup fails)
    supabaseAdmin.storage
      .from(BACKUP_BUCKET)
      .upload(backupPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      })
      .catch(() => {});

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    // Save file metadata to database
    const insertObj = {
      room_id: roomId,
      uploaded_by: userId,
      file_name: file.originalname,
      file_url: urlData.publicUrl,
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
      return res.status(400).json({ error: dbError.message });
    }

    res.status(201).json(data);
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

    res.json(data);
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
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', file.room_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'You are not a member of this room',
      });
    }

    const isUploader = file.uploaded_by === userId;
    const isAdmin = membership.role === 'owner' || membership.role === 'admin';

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
    let storagePath = null;
    try {
      const url = new URL(file.file_url);
      const bucketPattern = new RegExp(`/(?:object/(?:public|sign)/)?${bucket}/(.+?)(?:\\?.*)?$`);
      const match = url.pathname.match(bucketPattern);
      if (match) {
        storagePath = decodeURIComponent(match[1]);
      }
    } catch {
      storagePath = file.file_url;
    }

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

    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', file.room_id)
      .eq('user_id', userId)
      .single();

    if (!membership) return res.status(403).json({ error: 'Not a room member' });

    const isUploader = file.uploaded_by === userId;
    const isAdmin = membership.role === 'owner' || membership.role === 'admin';
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
  deleteFile,
  updateFile,
};
