const { supabaseAdmin } = require('../services/supabase');

// ── Board Posts ──

async function getPosts(req, res, next) {
  try {
    const userId = req.user.id;
    const { category } = req.query;
    let query = supabaseAdmin
      .from('board_posts')
      .select('*, users!board_posts_author_users_fkey(full_name, avatar_url, major, year_level, semester)')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    // Attach participation counts, comment counts, reactions, and poll votes
    const postIds = (data || []).map((p) => p.id);

    const [partResult, commentResult, reactionsResult, pollVotesResult] = await Promise.all([
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
      postIds.length
        ? supabaseAdmin
            .from('post_reactions')
            .select('post_id, emoji, user_id')
            .in('post_id', postIds)
        : { data: [] },
      postIds.length
        ? supabaseAdmin
            .from('poll_votes')
            .select('post_id, option_index, user_id')
            .in('post_id', postIds)
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

    // Build reaction counts per post: { postId: { fire: 2, heart: 1, ... } }
    // Also track which emojis the current user has reacted with
    const reactionMap = {};
    const myReactionMap = {};
    for (const r of reactionsResult.data || []) {
      if (!reactionMap[r.post_id]) reactionMap[r.post_id] = {};
      reactionMap[r.post_id][r.emoji] = (reactionMap[r.post_id][r.emoji] || 0) + 1;
      if (r.user_id === userId) {
        if (!myReactionMap[r.post_id]) myReactionMap[r.post_id] = [];
        myReactionMap[r.post_id].push(r.emoji);
      }
    }

    // Build poll vote counts per post: { postId: { 0: 5, 1: 3, ... } }
    const pollVoteMap = {};
    const myPollVoteMap = {};
    for (const v of pollVotesResult.data || []) {
      if (!pollVoteMap[v.post_id]) pollVoteMap[v.post_id] = {};
      pollVoteMap[v.post_id][v.option_index] = (pollVoteMap[v.post_id][v.option_index] || 0) + 1;
      if (v.user_id === userId) {
        myPollVoteMap[v.post_id] = v.option_index;
      }
    }

    const enriched = (data || []).map((post) => {
      const result = {
        ...post,
        join_count: partMap[post.id]?.join || 0,
        pass_count: partMap[post.id]?.pass || 0,
        comment_count: commentMap[post.id] || 0,
        reactions: reactionMap[post.id] || {},
        my_reactions: myReactionMap[post.id] || [],
        poll_vote_counts: pollVoteMap[post.id] || {},
        my_poll_vote: myPollVoteMap[post.id] !== undefined ? myPollVoteMap[post.id] : null,
      };

      // For anonymous posts, hide author info from other users
      if (post.is_anonymous && post.author_id !== userId) {
        result.users = null;
      }

      return result;
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const userId = req.user.id;
    const { title, content, category, is_anonymous, poll_options } = req.body;

    // Validate poll_options if provided
    if (poll_options !== undefined && poll_options !== null) {
      if (!Array.isArray(poll_options) || poll_options.length < 2 || poll_options.length > 6) {
        return res.status(400).json({ error: 'Poll must have 2-6 options' });
      }
      const allStrings = poll_options.every((opt) => typeof opt === 'string' && opt.trim().length > 0);
      if (!allStrings) {
        return res.status(400).json({ error: 'All poll options must be non-empty strings' });
      }
    }

    const insertData = {
      author_id: userId,
      title: title.trim(),
      content: content.trim(),
      category: (category || 'general').trim(),
      is_anonymous: is_anonymous === true,
    };

    if (poll_options && Array.isArray(poll_options) && poll_options.length >= 2) {
      insertData.poll_options = poll_options.map((opt) => opt.trim());
    }

    const { data, error } = await supabaseAdmin
      .from('board_posts')
      .insert(insertData)
      .select('*, users!board_posts_author_users_fkey(full_name, avatar_url, major, year_level, semester)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    const result = { ...data, join_count: 0, pass_count: 0, comment_count: 0, reactions: {}, my_reactions: [], poll_vote_counts: {}, my_poll_vote: null };

    // If anonymous, hide author info in response (except to the author themselves)
    if (data.is_anonymous) {
      // The creator already knows they are the author, but we keep the pattern consistent
      // by always returning users for the creator
    }

    res.status(201).json(result);
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
      .select('*, users!comments_author_users_fkey(full_name, avatar_url, major, year_level, semester)')
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
      .select('*, users!comments_author_users_fkey(full_name, avatar_url, major, year_level, semester)')
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

// ── Reactions ──

async function toggleReaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { emoji } = req.body;

    const validEmojis = ['fire', 'heart', 'laugh', 'clap', 'think'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji. Must be one of: fire, heart, laugh, clap, think' });
    }

    // Check if reaction already exists
    const { data: existing } = await supabaseAdmin
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove reaction (toggle off)
      await supabaseAdmin.from('post_reactions').delete().eq('id', existing.id);
    } else {
      // Add reaction
      const { error } = await supabaseAdmin
        .from('post_reactions')
        .insert({ post_id: postId, user_id: userId, emoji });
      if (error) return res.status(400).json({ error: error.message });
    }

    // Return updated reaction counts for this post
    const { data: allReactions } = await supabaseAdmin
      .from('post_reactions')
      .select('emoji, user_id')
      .eq('post_id', postId);

    const counts = {};
    const myReactions = [];
    for (const r of allReactions || []) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      if (r.user_id === userId) {
        myReactions.push(r.emoji);
      }
    }

    res.json({ reactions: counts, my_reactions: myReactions });
  } catch (err) {
    next(err);
  }
}

async function getReactions(req, res, next) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('post_reactions')
      .select('emoji, user_id')
      .eq('post_id', postId);

    if (error) return res.status(400).json({ error: error.message });

    const counts = {};
    const myReactions = [];
    for (const r of data || []) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      if (r.user_id === userId) {
        myReactions.push(r.emoji);
      }
    }

    res.json({ reactions: counts, my_reactions: myReactions });
  } catch (err) {
    next(err);
  }
}

// ── Poll Voting ──

async function votePoll(req, res, next) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { optionIndex } = req.body;

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    // Verify the post exists and has poll_options
    const { data: post } = await supabaseAdmin
      .from('board_posts')
      .select('id, poll_options')
      .eq('id', postId)
      .maybeSingle();

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.poll_options || !Array.isArray(post.poll_options)) {
      return res.status(400).json({ error: 'This post does not have a poll' });
    }
    if (optionIndex >= post.poll_options.length) {
      return res.status(400).json({ error: 'Option index out of range' });
    }

    // Check if user already voted
    const { data: existing } = await supabaseAdmin
      .from('poll_votes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'You have already voted on this poll' });
    }

    // Insert vote
    const { error } = await supabaseAdmin
      .from('poll_votes')
      .insert({ post_id: postId, user_id: userId, option_index: optionIndex });

    if (error) return res.status(400).json({ error: error.message });

    // Return updated vote counts
    const { data: allVotes } = await supabaseAdmin
      .from('poll_votes')
      .select('option_index')
      .eq('post_id', postId);

    const voteCounts = {};
    for (const v of allVotes || []) {
      voteCounts[v.option_index] = (voteCounts[v.option_index] || 0) + 1;
    }

    res.json({ poll_vote_counts: voteCounts, my_poll_vote: optionIndex });
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
  toggleReaction,
  getReactions,
  votePoll,
};
