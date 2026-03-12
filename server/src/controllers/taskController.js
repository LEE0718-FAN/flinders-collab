const { supabaseAdmin } = require('../services/supabase');

/**
 * POST /rooms/:roomId/tasks
 * Create a new task in a room.
 */
async function createTask(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { title, description, assigned_to, due_date, priority } = req.body;

    // Verify the assignee is a room member
    const { data: assigneeMembership } = await supabaseAdmin
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', assigned_to)
      .single();

    if (!assigneeMembership) {
      return res.status(400).json({ error: 'Assigned user is not a member of this room' });
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        room_id: roomId,
        assigned_to,
        assigned_by: userId,
        title,
        description: description || null,
        due_date: due_date || null,
        priority: priority || 'medium',
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rooms/:roomId/tasks
 * List all tasks in a room with assignee info.
 */
async function getTasks(req, res, next) {
  try {
    const { roomId } = req.params;
    const { status, assigned_to } = req.query;

    let query = supabaseAdmin
      .from('tasks')
      .select(`
        *,
        assignee:assigned_to ( id, full_name, university_email, avatar_url ),
        assigner:assigned_by ( id, full_name, university_email, avatar_url )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /rooms/:roomId/tasks/:taskId
 * Update a task. Assignee can update status; admin/owner/assigner can update all fields.
 */
async function updateTask(req, res, next) {
  try {
    const { roomId, taskId } = req.params;
    const userId = req.user.id;

    // Fetch existing task
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('room_id', roomId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permissions
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    const isAssignee = existing.assigned_to === userId;
    const isAssigner = existing.assigned_by === userId;
    const isAdmin =
      membership && (membership.role === 'owner' || membership.role === 'admin');

    if (!isAssignee && !isAssigner && !isAdmin) {
      return res.status(403).json({
        error: 'Only the assignee, assigner, or room admin can update this task',
      });
    }

    // Assignees can only update status; admins/assigners can update everything
    const allowedFields =
      isAdmin || isAssigner
        ? ['title', 'description', 'assigned_to', 'due_date', 'status', 'priority']
        : ['status'];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select(`
        *,
        assignee:assigned_to ( id, full_name, university_email, avatar_url ),
        assigner:assigned_by ( id, full_name, university_email, avatar_url )
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /rooms/:roomId/tasks/:taskId
 * Delete a task. Only assigner or admin/owner can delete.
 */
async function deleteTask(req, res, next) {
  try {
    const { roomId, taskId } = req.params;
    const userId = req.user.id;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('room_id', roomId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permissions
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    const isAssigner = existing.assigned_by === userId;
    const isAdmin =
      membership && (membership.role === 'owner' || membership.role === 'admin');

    if (!isAssigner && !isAdmin) {
      return res.status(403).json({
        error: 'Only the task creator or room admin can delete this task',
      });
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
};
