import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MemberList from '@/components/room/MemberList';
import TaskList from '@/components/room/TaskList';
import TaskForm from '@/components/room/TaskForm';
import ScheduleCalendar from '@/components/schedule/Calendar';
import EventForm from '@/components/schedule/EventForm';
import EventList from '@/components/schedule/EventList';
import ChatPanel from '@/components/chat/ChatPanel';
import FileList from '@/components/files/FileList';
import FileUpload from '@/components/files/FileUpload';
import { getRoom, getMembers, getRoomActivity } from '@/services/rooms';
import { getEvents } from '@/services/events';
import { getFiles } from '@/services/files';
import { getTasks } from '@/services/tasks';
import { copyToClipboard } from '@/lib/native';
import { getRoomPalette } from '@/components/room/RoomCard';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Copy, Check, Plus, MessageSquare, FileUp, CalendarPlus, CheckSquare, Activity, Link2, Users } from 'lucide-react';
import { useRef as useReactRef } from 'react';
import { Button } from '@/components/ui/button';
import ReportButton from '@/components/ReportButton';
import EditRoomDialog from '@/components/room/EditRoomDialog';
import QuickLinks from '@/components/room/QuickLinks';
import { formatDistanceToNow, format } from 'date-fns';

function sortEvents(items) {
  return [...items].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

function upsertById(items, nextItem, { prepend = true, sorter } = {}) {
  if (!nextItem?.id) return items;
  const remaining = items.filter((item) => item.id !== nextItem.id);
  const next = prepend ? [nextItem, ...remaining] : [...remaining, nextItem];
  return sorter ? sorter(next) : next;
}

export default function RoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [files, setFiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const [activities, setActivities] = useState([]);
  const [quickLinks, setQuickLinks] = useState([]);
  const [error, setError] = useState('');
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [calendarTrackHeight, setCalendarTrackHeight] = useState(null);
  const [calendarMode, setCalendarMode] = useState('follow');
  const highlightRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const scheduleLayoutRef = useRef(null);
  const calendarColumnRef = useRef(null);
  const calendarStickyRef = useRef(null);
  const eventListColumnRef = useRef(null);
  const selectedDateKeyRef = useRef(null);
  const suppressScrollResetUntilRef = useRef(0);

  const clearHighlight = useCallback(() => {
    if (highlightRef.current) {
      highlightRef.current.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-4', 'bg-blue-50/50');
      highlightRef.current = null;
    }
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await getRoom(roomId);
      setRoom(data.room || data);
    } catch {
      // non-critical
    }
  }, [roomId]);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await getMembers(roomId);
      setMembers(data.members || data || []);
    } catch {
      // non-critical
    }
  }, [roomId]);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents(roomId);
      setEvents(Array.isArray(data) ? data : data.events || []);
    } catch {
      // non-critical
    }
  }, [roomId]);

  const fetchFiles = useCallback(async () => {
    try {
      const data = await getFiles(roomId);
      setFiles(Array.isArray(data) ? data : data.files || []);
    } catch {
      // non-critical
    }
  }, [roomId]);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getTasks(roomId);
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch {
      // non-critical
    }
  }, [roomId]);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await getRoomActivity(roomId);
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      // non-critical
    }
  }, [roomId]);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([fetchRoom(), fetchMembers(), fetchEvents(), fetchFiles(), fetchTasks(), fetchActivity()]);
      } catch {
        setError('Failed to load some data. Please refresh.');
      }
      setLoading(false);
    };
    init();
  }, [fetchRoom, fetchMembers, fetchEvents, fetchFiles, fetchTasks, fetchActivity]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`quick-links:${roomId}`) || '[]');
      setQuickLinks(saved);
    } catch {
      // ignore
    }
  }, [roomId]);

  const updateCalendarOffset = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) {
      setCalendarOffset(0);
      setCalendarTrackHeight(null);
      return;
    }

    const scrollContainer = document.querySelector('[data-main-scroll-container="true"]');
    const layoutNode = scheduleLayoutRef.current;
    const calendarColumnNode = calendarColumnRef.current;
    const calendarNode = calendarStickyRef.current;
    const eventListNode = eventListColumnRef.current;
    if (!scrollContainer || !layoutNode || !calendarNode || !calendarColumnNode || !eventListNode) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const eventListRect = eventListNode.getBoundingClientRect();
    const trackHeight = Math.max(calendarNode.offsetHeight, eventListNode.offsetHeight);
    const availableTravel = Math.max(0, trackHeight - calendarNode.offsetHeight);
    const selectedDateKey = selectedDateKeyRef.current;
    const selectedDateNode = selectedDateKey ? document.getElementById(`event-date-${selectedDateKey}`) : null;
    const desiredOffset = calendarMode === 'pinned' && selectedDateNode
      ? selectedDateNode.offsetTop + (selectedDateNode.offsetHeight / 2) - (calendarNode.offsetHeight / 2)
      : Math.max(0, containerRect.top - eventListRect.top);
    const nextOffset = Math.min(Math.max(0, desiredOffset), availableTravel);

    setCalendarTrackHeight(trackHeight);
    setCalendarOffset(nextOffset);
  }, [calendarMode]);

  const resetCalendarPosition = useCallback(() => {
    selectedDateKeyRef.current = null;
    setCalendarMode('follow');
    setCalendarOffset(0);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || activeTab !== 'schedule') return undefined;

    const scrollContainer = document.querySelector('[data-main-scroll-container="true"]');
    if (!scrollContainer) return undefined;

    let frameId = null;
    const scheduleUpdate = () => {
      if (calendarMode === 'pinned' && Date.now() > suppressScrollResetUntilRef.current) {
        selectedDateKeyRef.current = null;
        setCalendarMode('follow');
      }
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        updateCalendarOffset();
      });
    };

    scheduleUpdate();
    scrollContainer.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate);
      if (scheduleLayoutRef.current) observer.observe(scheduleLayoutRef.current);
      if (calendarStickyRef.current) observer.observe(calendarStickyRef.current);
      if (eventListColumnRef.current) observer.observe(eventListColumnRef.current);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      scrollContainer.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      observer?.disconnect();
    };
  }, [activeTab, calendarMode, updateCalendarOffset]);

  useEffect(() => {
    if (activeTab !== 'schedule') return undefined;

    const timer = window.setTimeout(() => {
      updateCalendarOffset();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [activeTab, events.length, updateCalendarOffset]);

  useEffect(() => {
    if (calendarMode === 'pinned') {
      selectedDateKeyRef.current = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
    }

    if (activeTab !== 'schedule') return undefined;

    const timer = window.setTimeout(() => {
      updateCalendarOffset();
    }, 40);

    return () => window.clearTimeout(timer);
  }, [activeTab, calendarMode, selectedDate, updateCalendarOffset]);

  const handleCopyInviteCode = async () => {
    if (room?.invite_code) {
      try {
        await copyToClipboard(room.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard not available
      }
    }
  };

  const handleEventCreated = useCallback((event, tempId) => {
    setEvents((prev) => {
      const withoutTemp = tempId ? prev.filter((item) => item.id !== tempId) : prev;
      return upsertById(withoutTemp, event, { sorter: sortEvents });
    });
  }, []);

  const handleEventCreateStart = useCallback((tempEvent) => {
    setEvents((prev) => upsertById(prev, tempEvent, { sorter: sortEvents }));
  }, []);

  const handleEventCreateError = useCallback((tempId) => {
    setEvents((prev) => prev.filter((item) => item.id !== tempId));
  }, []);

  const handleEventsChange = useCallback((updater) => {
    setEvents((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return sortEvents(next);
    });
  }, []);

  const handleFileUploaded = useCallback((file) => {
    setFiles((prev) => upsertById(prev, file, {
      prepend: true,
      sorter: (items) => [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    }));
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {(() => {
          const palette = room ? getRoomPalette(room) : { headerGradient: 'linear-gradient(135deg, #0ea5e9, #7dd3fc)', accent: '#7dd3fc' };
          return (
            <div className="relative overflow-hidden rounded-2xl px-4 sm:px-6 md:px-8 py-5 sm:py-6 text-white shadow-xl mb-6" style={{ background: palette.headerGradient }}>
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{room?.name}</h1>
                    {room?.course_name && (
                      <Badge className="bg-white/20 text-white border-0 rounded-full text-xs">{room.course_name}</Badge>
                    )}
                  </div>
                  {room?.description && <p className="mt-1 text-white/70 text-sm">{room.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {room?.invite_code && (
                    <button onClick={handleCopyInviteCode} className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-2 sm:py-1.5 text-xs font-medium hover:bg-white/30 transition-colors min-h-[44px] sm:min-h-0">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <code className="font-mono">{copied ? 'Copied!' : room.invite_code}</code>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs defaultValue="members" onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap bg-white rounded-xl p-1.5 shadow-sm border gap-1">
            <TabsTrigger value="members" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Members</TabsTrigger>
            <TabsTrigger value="schedule" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Schedule</TabsTrigger>
            <TabsTrigger value="tasks" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Tasks</TabsTrigger>
            <TabsTrigger value="chat" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Chat</TabsTrigger>
            <TabsTrigger value="files" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Files</TabsTrigger>
            <TabsTrigger value="links" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">
              <Link2 className="h-4 w-4 mr-1" />Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Members ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <MemberList members={members} />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 10).map((activity) => {
                      const iconMap = {
                        message: <MessageSquare className="h-4 w-4 text-blue-500" />,
                        file: <FileUp className="h-4 w-4 text-emerald-500" />,
                        event: <CalendarPlus className="h-4 w-4 text-orange-500" />,
                        task: <CheckSquare className="h-4 w-4 text-violet-500" />,
                      };
                      return (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60">
                            {iconMap[activity.type] || <Activity className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{activity.user_name}</span>{' '}
                              <span className="text-muted-foreground">{activity.description}</span>
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }) : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50 px-5 py-4">
              <h2 className="text-lg font-bold text-indigo-900">Schedule</h2>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-md" onClick={() => { if (!selectedDate) setSelectedDate(new Date()); setEventFormOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </div>
            <div ref={scheduleLayoutRef} className="flex flex-col md:flex-row gap-4" style={{ overflow: 'visible' }}>
              {/* Calendar sidebar — outer div stretches to event list height, inner div sticks */}
              <div
                ref={calendarColumnRef}
                className="w-full shrink-0 md:relative md:w-[280px]"
                style={calendarTrackHeight ? { height: `${calendarTrackHeight}px` } : undefined}
              >
                <div
                  ref={calendarStickyRef}
                  className="z-10 transition-transform duration-300 ease-out md:absolute md:left-0 md:right-0 md:top-0"
                  style={{
                    transform: `translateY(${calendarOffset}px)`,
                  }}
                >
                  <ScheduleCalendar
                    roomId={roomId}
                    events={events}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onDismissPrompt={() => {
                      clearHighlight();
                      resetCalendarPosition();
                    }}
                    onDateClick={(date) => {
                      setSelectedDate(date);
                      selectedDateKeyRef.current = format(date, 'yyyy-MM-dd');
                      setCalendarMode('pinned');
                      suppressScrollResetUntilRef.current = Date.now() + 800;
                      clearHighlight();
                      const dateKey = format(date, 'yyyy-MM-dd');
                      setTimeout(() => {
                        const el = document.getElementById(`event-date-${dateKey}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setTimeout(() => updateCalendarOffset(), 260);
                          el.classList.add('ring-2', 'ring-blue-400', 'ring-offset-4', 'bg-blue-50/50');
                          highlightRef.current = el;
                          highlightTimerRef.current = setTimeout(() => {
                            el.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-4', 'bg-blue-50/50');
                            highlightRef.current = null;
                          }, 4000);
                        }
                      }, 150);
                    }}
                    onAddEvent={(date) => {
                      clearHighlight();
                      setSelectedDate(date);
                      resetCalendarPosition();
                      setEventFormOpen(true);
                    }}
                  />
                </div>
              </div>
              <div ref={eventListColumnRef} className="flex-1 min-w-0">
                <EventList events={events} roomId={roomId} onEventsChange={handleEventsChange} />
              </div>
            </div>

            <EventForm
              roomId={roomId}
              selectedDate={selectedDate}
              open={eventFormOpen}
              onOpenChange={setEventFormOpen}
              onCreateStart={handleEventCreateStart}
              onCreated={handleEventCreated}
              onCreateError={handleEventCreateError}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <TaskList
              tasks={tasks}
              members={members}
              roomId={roomId}
              currentUserId={user?.id}
              onTasksChange={setTasks}
              onUpdated={fetchTasks}
            />
          </TabsContent>

          <TabsContent value="chat">
            <Card>
              <CardContent className="p-0">
                <ChatPanel roomId={roomId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            {/* Lecture Materials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📖</span>
                  <h2 className="text-lg font-semibold">Lecture Materials</h2>
                  <Badge variant="secondary" className="text-xs">{files.filter(f => f.category === 'lecture').length}</Badge>
                </div>
                <FileUpload roomId={roomId} onUploaded={handleFileUploaded} category="lecture" events={events} />
              </div>
              <FileList files={files} roomId={roomId} onFilesChange={setFiles} filterCategory="lecture" members={members} />
            </div>

            <div className="h-px bg-border" />

            {/* Team Submissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <h2 className="text-lg font-semibold">Team Submissions</h2>
                  <Badge variant="secondary" className="text-xs">{files.filter(f => f.category === 'submission').length}</Badge>
                </div>
                <FileUpload roomId={roomId} onUploaded={handleFileUploaded} category="submission" events={events} />
              </div>
              <FileList files={files} roomId={roomId} onFilesChange={setFiles} filterCategory="submission" members={members} />
            </div>
          </TabsContent>

          <TabsContent value="links">
            <Card>
              <CardContent className="p-5">
                <QuickLinks roomId={roomId} links={quickLinks} onLinksChange={setQuickLinks} />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
      <ReportButton section={activeTab} roomId={roomId} floating />
    </MainLayout>
  );
}
