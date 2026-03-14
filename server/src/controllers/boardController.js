const { supabaseAdmin } = require('../services/supabase');

// ── Board Posts ──

async function getPosts(req, res, next) {
  try {
    const { category } = req.query;
    let query = supabaseAdmin
      .from('board_posts')
      .select('*, users!board_posts_author_id_fkey(full_name, avatar_url, major, year_level, semester)')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    // Attach participation counts and comment counts
    const postIds = (data || []).map((p) => p.id);

    const [partResult, commentResult] = await Promise.all([
      postIds.length
        ? supabaseAdmin
            .from('board_participations')
            .select('post_id, status')
            .in('post_id', postIds)
        : { data: [] },
      postIds.length
        ? supabaseAdmin
            .from('comments')
            .select('target_id')
            .eq('target_type', 'board_post')
            .in('target_id', postIds)
        : { data: [] },
    ]);

    const partMap = {};
    for (const p of partResult.data || []) {
      if (!partMap[p.post_id]) partMap[p.post_id] = { join: 0, pass: 0 };
      partMap[p.post_id][p.status] = (partMap[p.post_id][p.status] || 0) + 1;
    }

    const commentMap = {};
    for (const c of commentResult.data || []) {
      commentMap[c.target_id] = (commentMap[c.target_id] || 0) + 1;
    }

    const enriched = (data || []).map((post) => ({
      ...post,
      join_count: partMap[post.id]?.join || 0,
      pass_count: partMap[post.id]?.pass || 0,
      comment_count: commentMap[post.id] || 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const userId = req.user.id;
    const { title, content, category } = req.body;

    const { data, error } = await supabaseAdmin
      .from('board_posts')
      .insert({
        author_id: userId,
        title: title.trim(),
        content: content.trim(),
        category: (category || 'general').trim(),
      })
      .select('*, users!board_posts_author_id_fkey(full_name, avatar_url, major, year_level, semester)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ ...data, join_count: 0, pass_count: 0, comment_count: 0 });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const { data: post } = await supabaseAdmin
      .from('board_posts')
      .select('id, author_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== userId) return res.status(403).json({ error: 'Not authorized' });

    const { error } = await supabaseAdmin.from('board_posts').delete().eq('id', postId);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
}

// ── Participation ──

async function toggleParticipation(req, res, next) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { status } = req.body; // 'join' | 'pass'

    // Check if already participated
    const { data: existing } = await supabaseAdmin
      .from('board_participations')
      .select('id, status')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.status === status) {
        // Same status → remove (toggle off)
        await supabaseAdmin.from('board_participations').delete().eq('id', existing.id);
        return res.json({ action: 'removed', status: null });
      }
      // Different status → update
      const { data, error } = await supabaseAdmin
        .from('board_participations')
        .update({ status })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ action: 'updated', status: data.status });
    }

    // New participation
    const { data, error } = await supabaseAdmin
      .from('board_participations')
      .insert({ post_id: postId, user_id: userId, status })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ action: 'created', status: data.status });
  } catch (err) {
    next(err);
  }
}

async function getMyParticipations(req, res, next) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('board_participations')
      .select('post_id, status')
      .eq('user_id', userId);

    if (error) return res.status(400).json({ error: error.message });

    const map = {};
    for (const p of data || []) {
      map[p.post_id] = p.status;
    }
    res.json(map);
  } catch (err) {
    next(err);
  }
}

// ── Comments ──

async function getComments(req, res, next) {
  try {
    const { targetType, targetId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('*, users!comments_author_id_fkey(full_name, avatar_url, major, year_level, semester)')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

async function createComment(req, res, next) {
  try {
    const userId = req.user.id;
    const { targetType, targetId } = req.params;
    const { content } = req.body;

    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        target_type: targetType,
        target_id: targetId,
        author_id: userId,
        content: content.trim(),
      })
      .select('*, users!comments_author_id_fkey(full_name, avatar_url, major, year_level, semester)')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;

    const { data: comment } = await supabaseAdmin
      .from('comments')
      .select('id, author_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author_id !== userId) return res.status(403).json({ error: 'Not authorized' });

    const { error } = await supabaseAdmin.from('comments').delete().eq('id', commentId);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
}

// ── Academic Info ──

async function updateAcademicInfo(req, res, next) {
  try {
    const userId = req.user.id;
    const { year_level, semester } = req.body;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ year_level, semester })
      .eq('id', userId)
      .select('id, year_level, semester')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getAcademicInfo(req, res, next) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, year_level, semester')
      .eq('id', userId)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPosts,
  createPost,
  deletePost,
  toggleParticipation,
  getMyParticipations,
  getComments,
  createComment,
  deleteComment,
  updateAcademicInfo,
  getAcademicInfo,
};
