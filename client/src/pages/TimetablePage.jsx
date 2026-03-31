import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { searchTopics, getMyTimetable, addToTimetable, removeFromTimetable, removeTopic, getPopularTimes } from '@/services/timetable';
import { apiUrl } from '@/lib/api';
import { getAuthHeaders, parseResponse } from '@/lib/api-headers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Search, Plus, X, BookOpen, Clock, MapPin, Users,
  MessageSquare, GraduationCap, Trash2, Check, Pencil, UserPlus, Mail,
} from 'lucide-react';
import { getFriendRequests, sendFriendRequest, respondToFriendRequest } from '@/services/flinders';
import { socket } from '@/lib/socket';

const ChatPanel = lazy(() => import('@/components/chat/ChatPanel'));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am–8pm
const HOUR_HEIGHT = 56; // px per hour row

const COURSE_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', accent: 'bg-blue-500', hex: '#3b82f6' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', accent: 'bg-emerald-500', hex: '#10b981' },
  { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', accent: 'bg-violet-500', hex: '#8b5cf6' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', accent: 'bg-amber-500', hex: '#f59e0b' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', accent: 'bg-rose-500', hex: '#f43f5e' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', accent: 'bg-cyan-500', hex: '#06b6d4' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', accent: 'bg-orange-500', hex: '#f97316' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', accent: 'bg-indigo-500', hex: '#6366f1' },
];

function getColorForIndex(i) { return COURSE_COLORS[i % COURSE_COLORS.length]; }
function timeToHour(t) { if (!t) return null; const [h, m] = t.split(':').map(Number); return h + m / 60; }
function hourToTime(h) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; }
function formatHour(h) { return h > 12 ? `${h-12}pm` : h === 12 ? '12pm' : `${h}am`; }

// Snap to 15-min increments
function snapHour(h) { return Math.round(h * 4) / 4; }

export default function TimetablePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('setup');

  // Course slots
  const [slots, setSlots] = useState([
    { id: 1, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
    { id: 2, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
    { id: 3, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
    { id: 4, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
  ]);

  // Drag-to-add state
  const [dragTopic, setDragTopic] = useState(null); // topic being added via calendar drag
  const [dragOffering, setDragOffering] = useState(null);
  const [popularTimes, setPopularTimes] = useState([]);

  // Class form (offering selection + mini confirm after drag)
  const [classForm, setClassForm] = useState(null);
  const [confirmForm, setConfirmForm] = useState(null); // {topicId, dayOfWeek, startTime, endTime, classType, location}
  const [editEntry, setEditEntry] = useState(null); // entry being edited
  const [chatPopup, setChatPopup] = useState(null); // {roomId, topicCode, topicTitle}
  const [showMembers, setShowMembers] = useState(false);
  const [chatMembers, setChatMembers] = useState([]);
  const [friendState, setFriendState] = useState({ incoming: [], outgoing: [], friends: [] });
  const [friendLoading, setFriendLoading] = useState(null); // userId being acted on
  const [friendRequestDialog, setFriendRequestDialog] = useState(null); // { memberId, memberName }
  const [friendRequestMsg, setFriendRequestMsg] = useState('');
  const [topicUnread, setTopicUnread] = useState({}); // roomId → count

  const [searchTimers, setSearchTimers] = useState({});

  const loadTimetable = useCallback(async () => {
    try {
      const data = await getMyTimetable();
      setTimetable(data);
      const uniqueTopics = [];
      const seen = new Set();
      for (const entry of data) {
        if (entry.topic && !seen.has(entry.topic.id)) {
          seen.add(entry.topic.id);
          uniqueTopics.push(entry.topic);
        }
      }
      if (uniqueTopics.length > 0) {
        setSlots((prev) => {
          const newSlots = [...prev];
          uniqueTopics.forEach((topic, i) => {
            if (i < newSlots.length) {
              newSlots[i] = { ...newSlots[i], selectedTopic: topic, query: topic.topic_code };
            }
          });
          return newSlots;
        });
        setView('calendar');
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTimetable(); }, [loadTimetable]);

  // Join topic rooms for unread badge via Socket.IO
  useEffect(() => {
    const roomIds = [...new Set(timetable.map((e) => e.room_id).filter(Boolean))];
    if (roomIds.length === 0) return;

    roomIds.forEach((rid) => socket.emit('chat:join', { roomId: rid }));

    const handleMessage = (msg) => {
      if (msg.user_id === user?.id) return;
      // Only count if the chat popup is NOT open for this room
      if (chatPopup?.roomId === msg.room_id) return;
      if (roomIds.includes(msg.room_id)) {
        setTopicUnread((prev) => ({ ...prev, [msg.room_id]: (prev[msg.room_id] || 0) + 1 }));
      }
    };

    socket.on('chat:message', handleMessage);
    return () => {
      socket.off('chat:message', handleMessage);
      roomIds.forEach((rid) => socket.emit('chat:leave', { roomId: rid }));
    };
  }, [timetable, user?.id, chatPopup?.roomId]);

  // Clear unread when opening a chat popup
  useEffect(() => {
    if (chatPopup?.roomId) {
      setTopicUnread((prev) => {
        if (!prev[chatPopup.roomId]) return prev;
        const next = { ...prev };
        delete next[chatPopup.roomId];
        return next;
      });
    }
  }, [chatPopup?.roomId]);

  // Search
  const handleSearch = useCallback(async (slotId, query) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, query, results: [], selectedTopic: null, searched: false } : s)));
    if (query.trim().length < 2) return;
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, searching: true, searched: false } : s)));
    try {
      const results = await searchTopics(query);
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, results, searching: false, searched: true } : s)));
    } catch {
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, searching: false, searched: true } : s)));
    }
  }, []);

  const onQueryChange = (slotId, value) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, query: value } : s)));
    if (searchTimers[slotId]) clearTimeout(searchTimers[slotId]);
    const timer = setTimeout(() => handleSearch(slotId, value), 400);
    setSearchTimers((prev) => ({ ...prev, [slotId]: timer }));
  };

  // Select topic → show offering selection
  const selectTopic = (slotId, topic) => {
    setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, selectedTopic: topic, query: topic.topic_code, results: [] } : s));
    const offerings = topic.offerings || [];
    if (offerings.length > 0) {
      setClassForm({ slotId, topic, offerings, step: 'offering' });
    } else {
      // No offerings — go straight to calendar drag mode
      startDragMode(topic, null);
    }
  };

  // Start drag mode on calendar
  const startDragMode = async (topic, offering) => {
    setDragTopic(topic);
    setDragOffering(offering);
    setClassForm(null);
    setView('calendar');
    // Fetch popular times
    try {
      const popular = await getPopularTimes(topic.id);
      setPopularTimes(popular);
    } catch { setPopularTimes([]); }
  };

  // After drag completes on calendar
  const handleDragComplete = (dayOfWeek, startHour, endHour) => {
    if (!dragTopic) return;
    setConfirmForm({
      topicId: dragTopic.id,
      topicCode: dragTopic.topic_code,
      topicTitle: dragTopic.title,
      dayOfWeek,
      startTime: hourToTime(startHour),
      endTime: hourToTime(endHour),
      classType: 'lecture',
      location: dragOffering?.campus || '',
    });
  };

  // Confirm the dragged class
  const handleConfirmAdd = async () => {
    if (!confirmForm) return;
    try {
      await addToTimetable({
        topicId: confirmForm.topicId,
        dayOfWeek: confirmForm.dayOfWeek,
        startTime: confirmForm.startTime,
        endTime: confirmForm.endTime,
        classType: confirmForm.classType,
        location: confirmForm.location,
      });
      setConfirmForm(null);
      // Don't exit drag mode — user may want to add tutorial/workshop too
      await loadTimetable();
    } catch {}
  };

  // Finish adding classes for this topic
  const finishAdding = () => {
    setDragTopic(null);
    setDragOffering(null);
    setPopularTimes([]);
    setConfirmForm(null);
  };

  // Add another class for the same topic (from setup view)
  const addAnotherClass = (topic) => {
    startDragMode(topic, null);
  };

  const handleRemoveTopic = async (topicId) => {
    try {
      await removeTopic(topicId);
      setSlots((prev) => prev.map((s) => s.selectedTopic?.id === topicId ? { ...s, selectedTopic: null, query: '', results: [] } : s));
      await loadTimetable();
    } catch {}
  };

  // Open edit modal for an existing entry
  const openEditEntry = (entry) => {
    if (dragTopic) return; // don't open edit while in drag mode
    setEditEntry({
      id: entry.id,
      topicId: entry.topic?.id,
      topicCode: entry.topic?.topic_code,
      topicTitle: entry.topic?.title,
      roomId: entry.room_id,
      dayOfWeek: entry.day_of_week,
      startTime: entry.start_time?.slice(0, 5) || '',
      endTime: entry.end_time?.slice(0, 5) || '',
      classType: entry.class_type || 'lecture',
      location: entry.location || '',
    });
  };

  // Save edited entry (delete old + add new)
  const handleSaveEdit = async () => {
    if (!editEntry) return;
    try {
      await removeFromTimetable(editEntry.id);
      await addToTimetable({
        topicId: editEntry.topicId,
        dayOfWeek: editEntry.dayOfWeek,
        startTime: editEntry.startTime,
        endTime: editEntry.endTime,
        classType: editEntry.classType,
        location: editEntry.location,
      });
      setEditEntry(null);
      await loadTimetable();
    } catch {}
  };

  // Delete a single entry
  const handleDeleteEntry = async () => {
    if (!editEntry) return;
    try {
      await removeFromTimetable(editEntry.id);
      setEditEntry(null);
      await loadTimetable();
    } catch {}
  };

  const addSlot = () => {
    const nextId = Math.max(...slots.map((s) => s.id)) + 1;
    setSlots((prev) => [...prev, { id: nextId, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false }]);
  };

  const removeSlot = (slotId) => {
    if (slots.length <= 1) return;
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.selectedTopic) return;
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const openChat = async (roomId, topicCode, topicTitle) => {
    if (!roomId) return;
    setChatPopup({ roomId, topicCode: topicCode || '', topicTitle: topicTitle || '' });
    setShowMembers(false);
    setChatMembers([]);
    try {
      // Ensure membership + get members in one call
      const res = await fetch(apiUrl(`/api/timetable/room/${roomId}/ensure-member`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const members = await parseResponse(res);
      setChatMembers(members || []);
    } catch {}
  };

  const goToRoom = (roomId) => { if (roomId) navigate(`/rooms/${roomId}`); };

  // Load friend state when chat popup opens
  const loadFriends = useCallback(async () => {
    try {
      const data = await getFriendRequests();
      setFriendState({
        incoming: Array.isArray(data?.incoming) ? data.incoming : [],
        outgoing: Array.isArray(data?.outgoing) ? data.outgoing : [],
        friends: Array.isArray(data?.friends) ? data.friends : [],
      });
    } catch {
      setFriendState({ incoming: [], outgoing: [], friends: [] });
    }
  }, []);

  useEffect(() => {
    if (chatPopup) loadFriends();
  }, [chatPopup, loadFriends]);

  const getFriendStatus = (memberId) => {
    if (memberId === user?.id) return { kind: 'self' };
    const friend = friendState.friends.find((f) => f.other_user?.user_id === memberId);
    if (friend) return { kind: 'friend', request: friend };
    const incoming = friendState.incoming.find((f) => f.other_user?.user_id === memberId);
    if (incoming) return { kind: 'incoming', request: incoming };
    const outgoing = friendState.outgoing.find((f) => f.other_user?.user_id === memberId);
    if (outgoing) return { kind: 'outgoing', request: outgoing };
    return { kind: 'none' };
  };

  const showAddFriendDialog = (memberId, memberName) => {
    setFriendRequestDialog({ memberId, memberName });
    setFriendRequestMsg('');
  };

  const handleConfirmAddFriend = async () => {
    if (!friendRequestDialog) return;
    setFriendLoading(friendRequestDialog.memberId);
    try {
      await sendFriendRequest({
        target_user_id: friendRequestDialog.memberId,
        message: friendRequestMsg.trim() || undefined,
      });
      await loadFriends();
      setFriendRequestDialog(null);
      setFriendRequestMsg('');
    } catch {} finally { setFriendLoading(null); }
  };

  const handleRespondFriend = async (requestId, action) => {
    setFriendLoading(requestId);
    try {
      await respondToFriendRequest(requestId, action);
      await loadFriends();
    } catch {} finally { setFriendLoading(null); }
  };

  const openDM = (memberId) => {
    navigate('/messages');
  };

  const calendarEntries = timetable.filter((e) => e.day_of_week != null && e.start_time);
  const uniqueTopicIds = [...new Set(timetable.map((e) => e.topic?.id).filter(Boolean))];
  const topicColorMap = {};
  uniqueTopicIds.forEach((id, i) => { topicColorMap[id] = getColorForIndex(i); });
  // Also assign color for drag topic if not already in map
  if (dragTopic && !topicColorMap[dragTopic.id]) {
    topicColorMap[dragTopic.id] = getColorForIndex(uniqueTopicIds.length);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 safe-area-top">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">Timetable Buddy</h1>
            {uniqueTopicIds.length > 0 && (
              <Badge className="rounded-full bg-blue-100 text-blue-700 border-blue-200 text-[10px]">{uniqueTopicIds.length} topics</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {dragTopic && (
              <Button size="sm" onClick={finishAdding} className="h-8 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-3.5 w-3.5 mr-1" />
                Done
              </Button>
            )}
            <Button variant={view === 'setup' ? 'default' : 'outline'} size="sm" onClick={() => { setView('setup'); finishAdding(); }} className="h-8 text-xs rounded-full">
              <BookOpen className="h-3.5 w-3.5 mr-1" />Courses
            </Button>
            <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')} className="h-8 text-xs rounded-full" disabled={timetable.length === 0 && !dragTopic}>
              <Clock className="h-3.5 w-3.5 mr-1" />Timetable
            </Button>
          </div>
        </div>
      </div>

      {/* Drag mode banner */}
      {dragTopic && view === 'calendar' && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4" />
              <span className="font-medium">{dragTopic.topic_code}</span>
              <span className="opacity-80">— Drag on the calendar to add class times</span>
              {dragOffering && <Badge className="rounded-full text-[10px] bg-white/20 border-0">{dragOffering.semester} · {dragOffering.campus}</Badge>}
            </div>
            <Button size="sm" variant="ghost" onClick={finishAdding} className="h-7 text-xs text-white/80 hover:text-white hover:bg-white/10">
              Done adding
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4">
        {view === 'setup' ? (
          <SetupView
            slots={slots} timetable={timetable} topicColorMap={topicColorMap}
            onQueryChange={onQueryChange} selectTopic={selectTopic}
            handleRemoveTopic={handleRemoveTopic} addAnotherClass={addAnotherClass}
            addSlot={addSlot} removeSlot={removeSlot} openChat={openChat}
            openEditEntry={openEditEntry}
          />
        ) : (
          <CalendarView
            entries={calendarEntries} topicColorMap={topicColorMap} openChat={openChat}
            timetable={timetable} dragTopic={dragTopic} popularTimes={popularTimes}
            onDragComplete={handleDragComplete} openEditEntry={openEditEntry}
            topicUnread={topicUnread}
          />
        )}
      </div>

      {/* Offering selection modal */}
      {classForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-900 mb-1">Select Your Class</h3>
              <p className="text-sm text-slate-500 mb-4">{classForm.topic.topic_code} — {classForm.topic.title}</p>
              <div className="space-y-2">
                {classForm.offerings.map((offering, i) => (
                  <button key={i} onClick={() => startDragMode(classForm.topic, offering)}
                    className="w-full text-left p-3 rounded-xl border-2 border-slate-200 transition-all hover:border-blue-400 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full text-[10px] bg-blue-100 text-blue-700 border-blue-200">{offering.semester || 'TBC'}</Badge>
                      <span className="text-sm font-medium text-slate-800">{offering.campus || 'TBC'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{offering.mode || 'In person'}</div>
                  </button>
                ))}
                <button onClick={() => startDragMode(classForm.topic, null)} className="w-full text-center text-xs text-slate-400 hover:text-blue-500 py-2 mt-2">
                  None of these? Add manually on calendar
                </button>
                <Button variant="outline" onClick={() => setClassForm(null)} className="w-full h-10 rounded-xl mt-2">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit entry modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditEntry(null)}>
          <Card className="w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900">Edit Class</h3>
                <Button variant="ghost" size="sm" onClick={() => { setEditEntry(null); openChat(editEntry.roomId, editEntry.topicCode, editEntry.topicTitle); }} className="h-7 text-xs text-blue-600" disabled={!editEntry.roomId}>
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />Chat
                </Button>
              </div>
              <p className="text-sm text-slate-500 mb-4">{editEntry.topicCode} — {editEntry.topicTitle}</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Day</label>
                  <div className="flex gap-1">
                    {DAYS.map((day, i) => (
                      <Button key={day} variant={editEntry.dayOfWeek === i ? 'default' : 'outline'} size="sm"
                        onClick={() => setEditEntry((e) => ({ ...e, dayOfWeek: i }))} className="h-8 text-xs rounded-full flex-1">
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Start</label>
                    <Input type="time" value={editEntry.startTime}
                      onChange={(e) => setEditEntry((prev) => ({ ...prev, startTime: e.target.value }))} className="h-9 rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">End</label>
                    <Input type="time" value={editEntry.endTime}
                      onChange={(e) => setEditEntry((prev) => ({ ...prev, endTime: e.target.value }))} className="h-9 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                  <div className="flex gap-1 flex-wrap">
                    {['lecture', 'tutorial', 'practical', 'workshop', 'seminar'].map((type) => (
                      <Button key={type} variant={editEntry.classType === type ? 'default' : 'outline'} size="sm"
                        onClick={() => setEditEntry((e) => ({ ...e, classType: type }))} className="h-8 text-xs rounded-full capitalize">
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Location</label>
                  <Input placeholder="e.g. Room 101" value={editEntry.location}
                    onChange={(e) => setEditEntry((prev) => ({ ...prev, location: e.target.value }))} className="h-9 rounded-lg" />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={handleDeleteEntry} className="h-10 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setEditEntry(null)} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button onClick={handleSaveEdit} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm after drag */}
      {confirmForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-900 mb-1">Confirm Class</h3>
              <p className="text-sm text-slate-500 mb-3">{confirmForm.topicCode} — {DAYS[confirmForm.dayOfWeek]} {confirmForm.startTime}–{confirmForm.endTime}</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                  <div className="flex gap-1 flex-wrap">
                    {['lecture', 'tutorial', 'practical', 'workshop', 'seminar'].map((type) => (
                      <Button key={type} variant={confirmForm.classType === type ? 'default' : 'outline'} size="sm"
                        onClick={() => setConfirmForm((f) => ({ ...f, classType: type }))} className="h-8 text-xs rounded-full capitalize">
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Location (optional)</label>
                  <Input placeholder="e.g. Room 101" value={confirmForm.location}
                    onChange={(e) => setConfirmForm((f) => ({ ...f, location: e.target.value }))} className="h-9 rounded-lg" />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setConfirmForm(null)} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button onClick={handleConfirmAdd} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat popup */}
      {chatPopup && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setChatPopup(null)}>
          <div className={`w-full ${showMembers ? 'sm:max-w-3xl' : 'sm:max-w-2xl'} h-[90vh] sm:h-[82vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all`} onClick={(e) => e.stopPropagation()}>
            {/* Popup header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-sm truncate">{chatPopup.topicCode}{chatPopup.topicTitle ? ` — ${chatPopup.topicTitle}` : ''}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => setShowMembers((v) => !v)} className={`p-1.5 rounded-full transition-colors ${showMembers ? 'bg-white/30' : 'hover:bg-white/20'}`} title="Toggle members">
                  <Users className="h-4 w-4" />
                </button>
                <button onClick={() => setChatPopup(null)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Chat + Members */}
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 min-h-0">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>}>
                  <ChatPanel roomId={chatPopup.roomId} embedded />
                </Suspense>
              </div>
              {showMembers && (
                <div className="w-56 border-l border-slate-200 bg-slate-50 flex flex-col shrink-0">
                  <div className="px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    Members ({chatMembers.length})
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {chatMembers.map((m) => {
                      const fs = getFriendStatus(m.id);
                      return (
                        <div key={m.id} className="px-2 py-2 rounded-lg hover:bg-white transition-colors">
                          <div className="flex items-center gap-2">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-600 shrink-0">
                                {(m.full_name || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-slate-800 truncate">{m.full_name || 'User'}</div>
                              {m.major && <div className="text-[10px] text-slate-400 truncate">{m.major}</div>}
                            </div>
                          </div>
                          {fs.kind !== 'self' && (
                            <div className="mt-1.5 ml-9">
                              {fs.kind === 'friend' && (
                                <button onClick={() => openDM(m.id)}
                                  className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                  <Mail className="h-3 w-3" />DM
                                </button>
                              )}
                              {fs.kind === 'none' && (
                                <button onClick={() => showAddFriendDialog(m.id, m.full_name)}
                                  className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-800 transition-colors">
                                  <UserPlus className="h-3 w-3" />
                                  Add Friend
                                </button>
                              )}
                              {fs.kind === 'outgoing' && (
                                <span className="text-[10px] text-amber-600 font-medium">Requested</span>
                              )}
                              {fs.kind === 'incoming' && (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => handleRespondFriend(fs.request.id, 'accept')} disabled={friendLoading === fs.request.id}
                                    className="text-[10px] font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50">
                                    {friendLoading === fs.request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Accept'}
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button onClick={() => handleRespondFriend(fs.request.id, 'decline')}
                                    className="text-[10px] font-medium text-slate-400 hover:text-red-500">
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {chatMembers.length === 0 && (
                      <div className="text-center py-4 text-xs text-slate-400">No members yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Friend request confirmation dialog */}
      {friendRequestDialog && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setFriendRequestDialog(null)}>
          <Card className="w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Send Friend Request</h3>
                  <p className="text-xs text-slate-500">to {friendRequestDialog.memberName || 'this student'}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Message (optional)</label>
                <Input
                  placeholder="Hi! Let's study together..."
                  value={friendRequestMsg}
                  onChange={(e) => setFriendRequestMsg(e.target.value)}
                  className="h-10 rounded-xl"
                  maxLength={160}
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{friendRequestMsg.length}/160</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setFriendRequestDialog(null)} className="flex-1 h-10 rounded-xl">Cancel</Button>
                <Button
                  onClick={handleConfirmAddFriend}
                  disabled={friendLoading === friendRequestDialog.memberId}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  {friendLoading === friendRequestDialog.memberId ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-1" />
                  )}
                  Send Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ========== Setup View ========== */
function SetupView({ slots, timetable, topicColorMap, onQueryChange, selectTopic, handleRemoveTopic, addAnotherClass, addSlot, removeSlot, openChat, openEditEntry }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Add your courses below, then drag on the calendar to set class times.</p>
      {slots.map((slot, idx) => {
        const color = slot.selectedTopic ? topicColorMap[slot.selectedTopic.id] || getColorForIndex(idx) : null;
        const topicEntries = slot.selectedTopic ? timetable.filter((e) => e.topic?.id === slot.selectedTopic.id) : [];
        return (
          <Card key={slot.id} className={`shadow-sm transition-all ${color ? `${color.border} border-l-4` : 'border-slate-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${color ? color.accent : 'bg-slate-300'}`}>{idx + 1}</div>
                {slot.selectedTopic ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{slot.selectedTopic.topic_code}</span>
                      <span className="text-sm text-slate-500 truncate">{slot.selectedTopic.title}</span>
                    </div>
                    {slot.selectedTopic.school && <p className="text-[11px] text-slate-400 truncate">{slot.selectedTopic.school}</p>}
                  </div>
                ) : <span className="text-sm text-slate-400">Course {idx + 1}</span>}
                <div className="flex gap-1 ml-auto">
                  {slot.selectedTopic && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openChat(topicEntries[0]?.room_id, slot.selectedTopic.topic_code, slot.selectedTopic.title)} className="h-7 text-xs text-blue-600" disabled={!topicEntries[0]?.room_id}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />Chat
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => addAnotherClass(slot.selectedTopic)} className="h-7 text-xs text-emerald-600">
                        <Plus className="h-3.5 w-3.5 mr-1" />Add class
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveTopic(slot.selectedTopic.id)} className="h-7 text-xs text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {!slot.selectedTopic && slots.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeSlot(slot.id)} className="h-7 text-xs text-slate-400"><X className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>

              {!slot.selectedTopic && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Enter topic code (e.g. COMP2711)" value={slot.query}
                    onChange={(e) => onQueryChange(slot.id, e.target.value)} className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200" />
                  {slot.searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />}

                  {slot.searched && slot.results.length === 0 && slot.query.length >= 2 && !slot.searching && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center">
                      <p className="text-sm text-slate-500">No results for "{slot.query}"</p>
                      <p className="text-xs text-slate-400 mt-1">Check the topic code and try again</p>
                    </div>
                  )}

                  {slot.results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {slot.results.map((topic) => (
                        <button key={topic.id} onClick={() => selectTopic(slot.id, topic)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors">
                          <div className="flex items-center gap-2">
                            <Badge className="rounded bg-slate-100 text-slate-700 border-slate-200 text-xs font-mono">{topic.topic_code}</Badge>
                            <span className="text-sm font-medium text-slate-800 truncate">{topic.title}</span>
                          </div>
                          <div className="flex gap-2 mt-1 text-[11px] text-slate-400">
                            {topic.credit_points && <span>{topic.credit_points}</span>}
                            {topic.level && <span>{topic.level}</span>}
                            {topic.campuses?.length > 0 && <span>{topic.campuses.join(', ')}</span>}
                            {topic.semesters?.length > 0 && <span>{topic.semesters.join(', ')}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {slot.selectedTopic && topicEntries.length > 0 && (
                <div className="space-y-2 mt-2">
                  {topicEntries.map((entry) => (
                    <button key={entry.id} onClick={() => openEditEntry(entry)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${color?.bg || 'bg-slate-50'} hover:ring-2 hover:ring-blue-300 transition-all text-left`}>
                      <Clock className={`h-3.5 w-3.5 ${color?.text || 'text-slate-500'}`} />
                      <span className="text-sm font-medium">{DAYS[entry.day_of_week]}</span>
                      <span className="text-sm text-slate-600">{entry.start_time?.slice(0,5)} — {entry.end_time?.slice(0,5)}</span>
                      {entry.class_type && <Badge className="rounded-full text-[10px] bg-white/60 border-0 capitalize">{entry.class_type}</Badge>}
                      {entry.location && <span className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{entry.location}</span>}
                      <Pencil className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      <Button variant="outline" onClick={addSlot} className="w-full h-11 rounded-xl border-dashed border-2 border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300">
        <Plus className="h-4 w-4 mr-2" />Add another course
      </Button>
    </div>
  );
}

/* ========== Calendar View with Drag ========== */
function CalendarView({ entries, topicColorMap, openChat, timetable, dragTopic, popularTimes, onDragComplete, openEditEntry, topicUnread = {} }) {
  const gridRef = useRef(null);
  const [dragging, setDragging] = useState(null); // {dayOfWeek, startHour, currentHour}

  // Unique topics for legend
  const uniqueTopics = [];
  const seen = new Set();
  for (const e of timetable) {
    if (e.topic && !seen.has(e.topic.id)) { seen.add(e.topic.id); uniqueTopics.push({ ...e.topic, roomId: e.room_id }); }
  }

  // Convert mouse/touch position to day + hour
  const posToCell = useCallback((clientX, clientY) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const timeColWidth = 60;
    const dayWidth = (rect.width - timeColWidth) / 5;
    const dayOfWeek = Math.floor((x - timeColWidth) / dayWidth);
    const hour = 8 + y / HOUR_HEIGHT;

    if (dayOfWeek < 0 || dayOfWeek > 4) return null;
    return { dayOfWeek, hour: snapHour(Math.max(8, Math.min(20, hour))) };
  }, []);

  const handlePointerDown = (e) => {
    if (!dragTopic) return;
    const cell = posToCell(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    setDragging({ dayOfWeek: cell.dayOfWeek, startHour: cell.hour, currentHour: cell.hour + 1 });
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const cell = posToCell(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    setDragging((prev) => ({ ...prev, currentHour: Math.max(prev.startHour + 0.5, cell.hour) }));
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    const startH = Math.min(dragging.startHour, dragging.currentHour);
    const endH = Math.max(dragging.startHour, dragging.currentHour);
    if (endH - startH >= 0.25) {
      onDragComplete(dragging.dayOfWeek, startH, endH);
    }
    setDragging(null);
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      {uniqueTopics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uniqueTopics.map((topic) => {
            const color = topicColorMap[topic.id];
            const unread = topicUnread[topic.roomId] || 0;
            return (
              <button key={topic.id} onClick={() => openChat(topic.roomId, topic.topic_code, topic.title)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${color?.bg} ${color?.text} ${color?.border} border hover:shadow-md transition-shadow`}>
                <MessageSquare className="h-3 w-3" />{topic.topic_code}
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar grid */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-slate-100">
              <div className="p-2" />
              {DAYS.map((day) => (
                <div key={day} className="p-2 text-center text-xs font-semibold text-slate-500 border-l border-slate-100">{day}</div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative select-none" ref={gridRef}
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp} style={{ touchAction: dragTopic ? 'none' : 'auto', cursor: dragTopic ? 'crosshair' : 'default' }}>

              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] h-14 border-b border-slate-50">
                  <div className="p-1 text-[11px] text-slate-400 text-right pr-2 pt-0">{formatHour(hour)}</div>
                  {DAYS.map((_, di) => (
                    <div key={di} className={`border-l border-slate-50 ${dragTopic ? 'hover:bg-blue-50/30' : ''}`} />
                  ))}
                </div>
              ))}

              {/* Popular time suggestions (faded blocks) */}
              {dragTopic && popularTimes.map((pt, i) => {
                const startH = timeToHour(pt.start_time);
                const endH = timeToHour(pt.end_time);
                if (startH == null || endH == null || pt.day_of_week == null) return null;
                const top = (startH - 8) * HOUR_HEIGHT;
                const height = (endH - startH) * HOUR_HEIGHT;
                const left = `calc(60px + ${pt.day_of_week} * ((100% - 60px) / 5) + 2px)`;
                const width = `calc((100% - 60px) / 5 - 4px)`;
                return (
                  <div key={`pop-${i}`} className="absolute rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 flex items-center justify-center pointer-events-none"
                    style={{ top: `${top}px`, height: `${Math.max(height, 28)}px`, left, width }}>
                    <span className="text-[10px] text-blue-400 font-medium">
                      <Users className="h-3 w-3 inline mr-0.5" />{pt.count} {pt.count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                );
              })}

              {/* Drag preview */}
              {dragging && dragTopic && (() => {
                const startH = Math.min(dragging.startHour, dragging.currentHour);
                const endH = Math.max(dragging.startHour, dragging.currentHour);
                const top = (startH - 8) * HOUR_HEIGHT;
                const height = (endH - startH) * HOUR_HEIGHT;
                const left = `calc(60px + ${dragging.dayOfWeek} * ((100% - 60px) / 5) + 2px)`;
                const width = `calc((100% - 60px) / 5 - 4px)`;
                const color = topicColorMap[dragTopic.id];
                return (
                  <div className={`absolute rounded-lg border-2 ${color?.border || 'border-blue-400'} ${color?.bg || 'bg-blue-100'} opacity-70 pointer-events-none flex items-center justify-center`}
                    style={{ top: `${top}px`, height: `${Math.max(height, 14)}px`, left, width }}>
                    <span className={`text-[11px] font-bold ${color?.text || 'text-blue-700'}`}>
                      {dragTopic.topic_code} · {hourToTime(startH)}–{hourToTime(endH)}
                    </span>
                  </div>
                );
              })()}

              {/* Existing entries */}
              {entries.map((entry) => {
                const startH = timeToHour(entry.start_time);
                const endH = timeToHour(entry.end_time);
                if (startH == null || endH == null) return null;
                const top = (startH - 8) * HOUR_HEIGHT;
                const height = (endH - startH) * HOUR_HEIGHT;
                const left = `calc(60px + ${entry.day_of_week} * ((100% - 60px) / 5) + 2px)`;
                const width = `calc((100% - 60px) / 5 - 4px)`;
                const color = topicColorMap[entry.topic?.id];
                const blockUnread = topicUnread[entry.room_id] || 0;
                return (
                  <button key={entry.id} onClick={() => openChat(entry.room_id, entry.topic?.topic_code, entry.topic?.title)}
                    className={`absolute rounded-lg p-1.5 overflow-hidden cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition-all border ${color?.bg || 'bg-blue-100'} ${color?.border || 'border-blue-300'} ${color?.text || 'text-blue-800'}`}
                    style={{ top: `${top}px`, height: `${Math.max(height, 28)}px`, left, width }}>
                    <div className="text-[11px] font-bold leading-tight truncate">{entry.topic?.topic_code}</div>
                    {height >= 42 && <div className="text-[10px] opacity-70 truncate capitalize">{entry.class_type}</div>}
                    {height >= 56 && entry.location && <div className="text-[9px] opacity-60 truncate">{entry.location}</div>}
                    {blockUnread > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white shadow">
                        {blockUnread > 99 ? '99+' : blockUnread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
