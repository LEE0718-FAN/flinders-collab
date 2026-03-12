const { supabaseAdmin } = require('../services/supabase');
const config = require('../config');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /rooms/:roomId/files
 * Upload a file to Supabase Storage and record metadata.
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
    const storagePath = `rooms/${roomId}/${uuidv4()}${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    // Save file metadata to database
    const { data, error: dbError } = await supabaseAdmin
      .from('files')
      .insert({
        room_id: roomId,
        uploaded_by: userId,
        file_name: file.originalname,
        file_url: urlData.publicUrl,
        file_type: file.mimetype,
        file_size: file.size,
      })
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
 * List all files in a room.
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
        )
      `)
      .eq('room_id', roomId)
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
 * Delete a file. Only the uploader or room admin/owner can delete.
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

    const bucket = config.upload.storageBucket;

    // Extract storage path from URL robustly
    // Handles public URLs, signed URLs, and plain object keys
    let storagePath = null;
    try {
      const url = new URL(file.file_url);
      // Try both bucket names in the path for resilience
      const bucketPattern = new RegExp(`/(?:object/(?:public|sign)/)?${bucket}/(.+?)(?:\\?.*)?$`);
      const match = url.pathname.match(bucketPattern);
      if (match) {
        storagePath = decodeURIComponent(match[1]);
      }
    } catch {
      // file_url might be a plain object key (no protocol)
      storagePath = file.file_url;
    }

    if (storagePath) {
      await supabaseAdmin.storage
        .from(bucket)
        .remove([storagePath]);
    }

    // Delete metadata from database
    const { error: deleteError } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadFile,
  getFiles,
  deleteFile,
};
