import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { searchTopics, getMyTimetable, addToTimetable, removeTopic } from '@/services/timetable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Search, Plus, X, BookOpen, Clock, MapPin, Users,
  MessageSquare, ChevronLeft, ChevronRight, GraduationCap, Trash2,
} from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

// Color palette for courses
const COURSE_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', accent: 'bg-blue-500' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', accent: 'bg-emerald-500' },
  { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800', accent: 'bg-violet-500' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', accent: 'bg-amber-500' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', accent: 'bg-rose-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', accent: 'bg-cyan-500' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', accent: 'bg-orange-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', accent: 'bg-indigo-500' },
];

function getColorForIndex(i) {
  return COURSE_COLORS[i % COURSE_COLORS.length];
}

// Parse time string "HH:MM:SS" or "HH:MM" to hours decimal
function timeToHour(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

export default function TimetablePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('setup'); // 'setup' or 'calendar'

  // Course slots
  const [slots, setSlots] = useState([
    { id: 1, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
    { id: 2, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
    { id: 3, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
    { id: 4, query: '', results: [], selectedTopic: null, searching: false, adding: false, searched: false },
  ]);

  // Class time form (shown after selecting a topic)
  const [classForm, setClassForm] = useState(null); // { slotId, topicId, dayOfWeek, startTime, endTime, classType, location }

  const loadTimetable = useCallback(async () => {
    try {
      const data = await getMyTimetable();
      setTimetable(data);

      // Pre-fill slots with existing topics
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
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  // Search topics with debounce
  const handleSearch = useCallback(async (slotId, query) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, query, results: [], selectedTopic: null, searched: false } : s))
    );

    if (query.trim().length < 2) return;

    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, searching: true, searched: false } : s)));

    try {
      const results = await searchTopics(query);
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, results, searching: false, searched: true } : s))
      );
    } catch {
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, searching: false, searched: true } : s)));
    }
  }, []);

  // Debounced search
  const [searchTimers, setSearchTimers] = useState({});
  const onQueryChange = (slotId, value) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, query: value } : s)));
    if (searchTimers[slotId]) clearTimeout(searchTimers[slotId]);
    const timer = setTimeout(() => handleSearch(slotId, value), 400);
    setSearchTimers((prev) => ({ ...prev, [slotId]: timer }));
  };

  // Select a topic from search results
  const selectTopic = (slotId, topic) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, selectedTopic: topic, query: topic.topic_code, results: [] }
          : s
      )
    );
    // Show class time form
    setClassForm({
      slotId,
      topicId: topic.id,
      topicCode: topic.topic_code,
      topicTitle: topic.title,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '11:00',
      classType: 'lecture',
      location: '',
    });
  };

  // Add class to timetable
  const handleAddClass = async () => {
    if (!classForm) return;
    const slot = slots.find((s) => s.id === classForm.slotId);
    if (!slot) return;

    setSlots((prev) => prev.map((s) => (s.id === classForm.slotId ? { ...s, adding: true } : s)));

    try {
      await addToTimetable({
        topicId: classForm.topicId,
        dayOfWeek: classForm.dayOfWeek,
        startTime: classForm.startTime,
        endTime: classForm.endTime,
        classType: classForm.classType,
        location: classForm.location,
      });
      setClassForm(null);
      await loadTimetable();
      setView('calendar');
    } catch {
      // ignore
    } finally {
      setSlots((prev) => prev.map((s) => (s.id === classForm.slotId ? { ...s, adding: false } : s)));
    }
  };

  // Add another class for the same topic (e.g., tutorial after lecture)
  const addAnotherClass = (topic) => {
    setClassForm({
      slotId: slots.find((s) => s.selectedTopic?.id === topic.id)?.id || 1,
      topicId: topic.id,
      topicCode: topic.topic_code,
      topicTitle: topic.title,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '11:00',
      classType: 'tutorial',
      location: '',
    });
  };

  // Remove a topic entirely
  const handleRemoveTopic = async (topicId) => {
    try {
      await removeTopic(topicId);
      setSlots((prev) =>
        prev.map((s) =>
          s.selectedTopic?.id === topicId
            ? { ...s, selectedTopic: null, query: '', results: [] }
            : s
        )
      );
      await loadTimetable();
    } catch {
      // ignore
    }
  };

  // Add a new slot
  const addSlot = () => {
    const nextId = Math.max(...slots.map((s) => s.id)) + 1;
    setSlots((prev) => [...prev, { id: nextId, query: '', results: [], selectedTopic: null, searching: false, adding: false }]);
  };

  // Remove an empty slot
  const removeSlot = (slotId) => {
    if (slots.length <= 1) return;
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.selectedTopic) return; // don't remove filled slots
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  // Navigate to chat room
  const goToRoom = (roomId) => {
    if (roomId) navigate(`/rooms/${roomId}`);
  };

  // Build calendar data from timetable entries
  const calendarEntries = timetable.filter((e) => e.day_of_week != null && e.start_time);

  // Get unique topics with their colors
  const uniqueTopicIds = [...new Set(timetable.map((e) => e.topic?.id).filter(Boolean))];
  const topicColorMap = {};
  uniqueTopicIds.forEach((id, i) => {
    topicColorMap[id] = getColorForIndex(i);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 safe-area-top">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">My Timetable</h1>
            {timetable.length > 0 && (
              <Badge className="rounded-full bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                {uniqueTopicIds.length} topics
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === 'setup' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('setup')}
              className="h-8 text-xs rounded-full"
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              Courses
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
              className="h-8 text-xs rounded-full"
              disabled={timetable.length === 0}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              Calendar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {view === 'setup' ? (
          <SetupView
            slots={slots}
            timetable={timetable}
            topicColorMap={topicColorMap}
            classForm={classForm}
            setClassForm={setClassForm}
            onQueryChange={onQueryChange}
            selectTopic={selectTopic}
            handleAddClass={handleAddClass}
            handleRemoveTopic={handleRemoveTopic}
            addAnotherClass={addAnotherClass}
            addSlot={addSlot}
            removeSlot={removeSlot}
            goToRoom={goToRoom}
          />
        ) : (
          <CalendarView
            entries={calendarEntries}
            topicColorMap={topicColorMap}
            goToRoom={goToRoom}
            timetable={timetable}
          />
        )}
      </div>
    </div>
  );
}

function SetupView({
  slots, timetable, topicColorMap, classForm, setClassForm,
  onQueryChange, selectTopic, handleAddClass, handleRemoveTopic,
  addAnotherClass, addSlot, removeSlot, goToRoom,
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Add your courses below. Each course automatically creates a group chat with classmates.
      </p>

      {slots.map((slot, idx) => {
        const color = slot.selectedTopic ? topicColorMap[slot.selectedTopic.id] || getColorForIndex(idx) : null;
        const topicEntries = slot.selectedTopic
          ? timetable.filter((e) => e.topic?.id === slot.selectedTopic.id)
          : [];

        return (
          <Card key={slot.id} className={`shadow-sm transition-all ${color ? `${color.border} border-l-4` : 'border-slate-200'}`}>
            <CardContent className="p-4">
              {/* Slot header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${color ? color.accent : 'bg-slate-300'}`}>
                  {idx + 1}
                </div>
                {slot.selectedTopic ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{slot.selectedTopic.topic_code}</span>
                      <span className="text-sm text-slate-500 truncate">{slot.selectedTopic.title}</span>
                    </div>
                    {slot.selectedTopic.school && (
                      <p className="text-[11px] text-slate-400 truncate">{slot.selectedTopic.school}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Course {idx + 1}</span>
                )}
                <div className="flex gap-1 ml-auto">
                  {slot.selectedTopic && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => goToRoom(topicEntries[0]?.room_id)}
                        className="h-7 text-xs text-blue-600 hover:text-blue-700"
                        disabled={!topicEntries[0]?.room_id}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Chat
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTopic(slot.selectedTopic.id)}
                        className="h-7 text-xs text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {!slot.selectedTopic && slots.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeSlot(slot.id)} className="h-7 text-xs text-slate-400">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Search input (if no topic selected) */}
              {!slot.selectedTopic && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Enter topic code (e.g. COMP2711)"
                    value={slot.query}
                    onChange={(e) => onQueryChange(slot.id, e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200"
                  />
                  {slot.searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
                  )}

                  {/* No results message */}
                  {slot.searched && slot.results.length === 0 && slot.query.length >= 2 && !slot.searching && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center">
                      <p className="text-sm text-slate-500">No results for "{slot.query}"</p>
                      <p className="text-xs text-slate-400 mt-1">Check the topic code and try again</p>
                    </div>
                  )}

                  {/* Search results dropdown */}
                  {slot.results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {slot.results.map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => selectTopic(slot.id, topic)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Badge className="rounded bg-slate-100 text-slate-700 border-slate-200 text-xs font-mono">
                              {topic.topic_code}
                            </Badge>
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

              {/* Class entries for this topic */}
              {slot.selectedTopic && topicEntries.length > 0 && (
                <div className="space-y-2 mt-2">
                  {topicEntries.map((entry) => (
                    <div key={entry.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${color?.bg || 'bg-slate-50'}`}>
                      <Clock className={`h-3.5 w-3.5 ${color?.text || 'text-slate-500'}`} />
                      <span className="text-sm font-medium">{DAYS[entry.day_of_week]}</span>
                      <span className="text-sm text-slate-600">
                        {entry.start_time?.slice(0, 5)} — {entry.end_time?.slice(0, 5)}
                      </span>
                      {entry.class_type && (
                        <Badge className="rounded-full text-[10px] bg-white/60 border-0 capitalize">
                          {entry.class_type}
                        </Badge>
                      )}
                      {entry.location && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {entry.location}
                        </span>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addAnotherClass(slot.selectedTopic)}
                    className="h-7 text-xs text-blue-500"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add another class (tutorial, practical...)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add slot button */}
      <Button
        variant="outline"
        onClick={addSlot}
        className="w-full h-11 rounded-xl border-dashed border-2 border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add another course
      </Button>

      {/* Class time form modal */}
      {classForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-900 mb-1">Add Class Time</h3>
              <p className="text-sm text-slate-500 mb-4">
                {classForm.topicCode} — {classForm.topicTitle}
              </p>

              <div className="space-y-3">
                {/* Day */}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Day</label>
                  <div className="flex gap-1">
                    {DAYS.map((day, i) => (
                      <Button
                        key={day}
                        variant={classForm.dayOfWeek === i ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setClassForm((f) => ({ ...f, dayOfWeek: i }))}
                        className="flex-1 h-9 text-xs rounded-lg"
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Start</label>
                    <Input
                      type="time"
                      value={classForm.startTime}
                      onChange={(e) => setClassForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="h-9 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">End</label>
                    <Input
                      type="time"
                      value={classForm.endTime}
                      onChange={(e) => setClassForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="h-9 rounded-lg"
                    />
                  </div>
                </div>

                {/* Class type */}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                  <div className="flex gap-1 flex-wrap">
                    {['lecture', 'tutorial', 'practical', 'workshop', 'seminar'].map((type) => (
                      <Button
                        key={type}
                        variant={classForm.classType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setClassForm((f) => ({ ...f, classType: type }))}
                        className="h-8 text-xs rounded-full capitalize"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Location (optional)</label>
                  <Input
                    placeholder="e.g. Room 101, Engineering Building"
                    value={classForm.location}
                    onChange={(e) => setClassForm((f) => ({ ...f, location: e.target.value }))}
                    className="h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <Button
                  variant="outline"
                  onClick={() => setClassForm(null)}
                  className="flex-1 h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddClass}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  Add to Timetable
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CalendarView({ entries, topicColorMap, goToRoom, timetable }) {
  // Get unique topics for the legend
  const uniqueTopics = [];
  const seen = new Set();
  for (const e of timetable) {
    if (e.topic && !seen.has(e.topic.id)) {
      seen.add(e.topic.id);
      uniqueTopics.push({ ...e.topic, roomId: e.room_id });
    }
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {uniqueTopics.map((topic) => {
          const color = topicColorMap[topic.id];
          return (
            <button
              key={topic.id}
              onClick={() => goToRoom(topic.roomId)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${color?.bg} ${color?.text} ${color?.border} border hover:shadow-md transition-shadow`}
            >
              <MessageSquare className="h-3 w-3" />
              {topic.topic_code}
            </button>
          );
        })}
      </div>

      {/* Calendar grid */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-slate-100">
              <div className="p-2" />
              {DAYS.map((day) => (
                <div key={day} className="p-2 text-center text-xs font-semibold text-slate-500 border-l border-slate-100">
                  {day}
                </div>
              ))}
            </div>

            {/* Time slots */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] h-14 border-b border-slate-50">
                  <div className="p-1 text-[11px] text-slate-400 text-right pr-2 pt-0">
                    {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                  </div>
                  {DAYS.map((_, di) => (
                    <div key={di} className="border-l border-slate-50 relative" />
                  ))}
                </div>
              ))}

              {/* Render entries as positioned blocks */}
              {entries.map((entry) => {
                const startH = timeToHour(entry.start_time);
                const endH = timeToHour(entry.end_time);
                if (startH == null || endH == null) return null;

                const top = (startH - 8) * 56; // 56px = h-14
                const height = (endH - startH) * 56;
                const left = `calc(60px + ${entry.day_of_week} * ((100% - 60px) / 5) + 2px)`;
                const width = `calc((100% - 60px) / 5 - 4px)`;
                const color = topicColorMap[entry.topic?.id];

                return (
                  <button
                    key={entry.id}
                    onClick={() => goToRoom(entry.room_id)}
                    className={`absolute rounded-lg p-1.5 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border ${color?.bg || 'bg-blue-100'} ${color?.border || 'border-blue-300'} ${color?.text || 'text-blue-800'}`}
                    style={{ top: `${top}px`, height: `${Math.max(height, 28)}px`, left, width }}
                  >
                    <div className="text-[11px] font-bold leading-tight truncate">
                      {entry.topic?.topic_code}
                    </div>
                    {height >= 42 && (
                      <div className="text-[10px] opacity-70 truncate capitalize">
                        {entry.class_type}
                      </div>
                    )}
                    {height >= 56 && entry.location && (
                      <div className="text-[9px] opacity-60 truncate">
                        {entry.location}
                      </div>
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
