const { supabaseAdmin } = require('../services/supabase');
const { fetchSingleTopic } = require('../utils/topicCrawler');

/**
 * GET /timetable/topics/search?q=COMP&year=2026
 * Search topics by code or title.
 */
async function searchTopics(req, res, next) {
  try {
    const { q, year = 2026 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const search = q.trim().toUpperCase();

    // Search by topic_code prefix first, then by title
    const { data, error } = await supabaseAdmin
      .from('flinders_topics')
      .select('id, topic_code, title, credit_points, level, school, semesters, campuses, delivery_modes')
      .eq('year', parseInt(year))
      .or(`topic_code.ilike.%${search}%,title.ilike.%${search}%`)
      .order('topic_code')
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    // If no results and query looks like a topic code, try fetching from handbook on-demand
    if ((!data || data.length === 0) && /^[A-Z]{3,4}\d{3,4}/i.test(search)) {
      try {
        const fetched = await fetchSingleTopic(search);
        if (fetched) {
          const { data: retryData } = await supabaseAdmin
            .from('flinders_topics')
            .select('id, topic_code, title, credit_points, level, school, semesters, campuses, delivery_modes')
            .eq('topic_code', fetched.topic_code)
            .eq('year', parseInt(year))
            .limit(1);
          if (retryData?.length > 0) return res.json(retryData);
        }
      } catch {
        // fall through to empty results
      }
    }

    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /timetable/my
 * Get the current user's timetable entries with topic + room info.
 */
async function getMyTimetable(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('user_timetable')
      .select(`
        id, day_of_week, start_time, end_time, class_type, location, added_at,
        topic:flinders_topics(id, topic_code, title, credit_points, level, school, semesters, campuses),
        room_id
      `)
      .eq('user_id', userId)
      .order('day_of_week')
      .order('start_time');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /timetable/add
 * Add a topic to the user's timetable + auto-create/join chat room.
 * Body: { topicId, dayOfWeek, startTime, endTime, classType, location }
 */
async function addToTimetable(req, res, next) {
  try {
    const userId = req.user.id;
    const { topicId, dayOfWeek, startTime, endTime, classType, location } = req.body;

    if (!topicId) return res.status(400).json({ error: 'topicId is required' });

    // 1. Check topic exists
    const { data: topic, error: topicError } = await supabaseAdmin
      .from('flinders_topics')
      .select('id, topic_code, title')
      .eq('id', topicId)
      .single();

    if (topicError || !topic) return res.status(404).json({ error: 'Topic not found' });

    // 2. Find or create the topic room
    let roomId;
    const { data: existingTopicRoom } = await supabaseAdmin
      .from('topic_rooms')
      .select('room_id')
      .eq('topic_id', topicId)
      .single();

    if (existingTopicRoom) {
      roomId = existingTopicRoom.room_id;
    } else {
      // Create a new room for this topic
      const inviteCode = generateInviteCode();
      const { data: newRoom, error: roomError } = await supabaseAdmin
        .from('rooms')
        .insert({
          name: `${topic.topic_code} — ${topic.title}`,
          course_name: topic.topic_code,
          description: `Auto-created chat room for ${topic.topic_code} ${topic.title}`,
          owner_id: null,
          invite_code: inviteCode,
          room_type: 'topic',
        })
        .select()
        .single();

      if (roomError) return res.status(500).json({ error: 'Failed to create topic room: ' + roomError.message });

      roomId = newRoom.id;

      // Link topic → room
      await supabaseAdmin
        .from('topic_rooms')
        .insert({ topic_id: topicId, room_id: roomId });
    }

    // 3. Auto-join the room (if not already a member)
    const { data: existingMember } = await supabaseAdmin
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (!existingMember) {
      await supabaseAdmin
        .from('room_members')
        .insert({ room_id: roomId, user_id: userId, role: 'member' });
    }

    // 4. Add timetable entry
    const entry = {
      user_id: userId,
      topic_id: topicId,
      room_id: roomId,
      day_of_week: dayOfWeek != null ? parseInt(dayOfWeek) : null,
      start_time: startTime || null,
      end_time: endTime || null,
      class_type: classType || null,
      location: location || null,
    };

    const { data: timetableEntry, error: insertError } = await supabaseAdmin
      .from('user_timetable')
      .upsert(entry, { onConflict: 'user_id,topic_id,day_of_week,start_time' })
      .select(`
        id, day_of_week, start_time, end_time, class_type, location, added_at,
        topic:flinders_topics(id, topic_code, title, credit_points, level, school, semesters, campuses),
        room_id
      `)
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    res.status(201).json(timetableEntry);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /timetable/:entryId
 * Remove a timetable entry. Does NOT leave the room (user may have other classes for the same topic).
 */
async function removeFromTimetable(req, res, next) {
  try {
    const userId = req.user.id;
    const { entryId } = req.params;

    // Get the entry first to know the topic
    const { data: entry } = await supabaseAdmin
      .from('user_timetable')
      .select('id, topic_id, room_id')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (!entry) return res.status(404).json({ error: 'Timetable entry not found' });

    // Delete the entry
    const { error } = await supabaseAdmin
      .from('user_timetable')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });

    // Check if user has other entries for the same topic
    const { count } = await supabaseAdmin
      .from('user_timetable')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('topic_id', entry.topic_id);

    // If no more entries for this topic, leave the room
    if (count === 0 && entry.room_id) {
      await supabaseAdmin
        .from('room_members')
        .delete()
        .eq('room_id', entry.room_id)
        .eq('user_id', userId);
    }

    res.json({ success: true, leftRoom: count === 0 });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /timetable/topic/:topicId
 * Remove all timetable entries for a topic + leave the room.
 */
async function removeTopic(req, res, next) {
  try {
    const userId = req.user.id;
    const { topicId } = req.params;

    // Get the room for this topic
    const { data: entries } = await supabaseAdmin
      .from('user_timetable')
      .select('room_id')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .limit(1);

    const roomId = entries?.[0]?.room_id;

    // Delete all entries for this topic
    const { error } = await supabaseAdmin
      .from('user_timetable')
      .delete()
      .eq('user_id', userId)
      .eq('topic_id', topicId);

    if (error) return res.status(500).json({ error: error.message });

    // Leave the room
    if (roomId) {
      await supabaseAdmin
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /timetable/topic/:topicId/members
 * Get count of members in a topic's chat room.
 */
async function getTopicMembers(req, res, next) {
  try {
    const { topicId } = req.params;

    const { data: topicRoom } = await supabaseAdmin
      .from('topic_rooms')
      .select('room_id')
      .eq('topic_id', topicId)
      .single();

    if (!topicRoom) return res.json({ count: 0 });

    const { count } = await supabaseAdmin
      .from('room_members')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', topicRoom.room_id);

    res.json({ count: count || 0 });
  } catch (err) {
    next(err);
  }
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = {
  searchTopics,
  getMyTimetable,
  addToTimetable,
  removeFromTimetable,
  removeTopic,
  getTopicMembers,
};
