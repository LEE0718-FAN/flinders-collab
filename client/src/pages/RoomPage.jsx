import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

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
import { Loader2, Copy, Check, Plus, MessageSquare, FileUp, CalendarPlus, CheckSquare, Activity, Link2, Users, Megaphone, X } from 'lucide-react';
// useRef already imported above
import { Button } from '@/components/ui/button';
import ReportButton from '@/components/ReportButton';
import OnboardingTour from '@/components/OnboardingTour';
import EditRoomDialog from '@/components/room/EditRoomDialog';
import QuickLinks from '@/components/room/QuickLinks';
import { getAnnouncements, createAnnouncement, deleteAnnouncement as deleteAnnouncementApi, markAllRead } from '@/services/announcements';
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
  const [announcements, setAnnouncements] = useState([]);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const highlightRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const eventListColumnRef = useRef(null);

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

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await getAnnouncements(roomId);
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch { /* non-critical */ }
  }, [roomId]);

  useEffect(() => {
    setLoading(true);
    const init = async () => {
      try {
        await Promise.all([fetchRoom(), fetchMembers(), fetchEvents(), fetchFiles(), fetchTasks(), fetchActivity(), fetchAnnouncements()]);
      } catch {
        setError('Failed to load some data. Please refresh.');
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Listen for external event creation (e.g. tutorial) to refetch events
  useEffect(() => {
    const handler = () => fetchEvents();
    window.addEventListener('events-updated', handler);
    return () => window.removeEventListener('events-updated', handler);
  }, [fetchEvents]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`quick-links:${roomId}`) || '[]');
      setQuickLinks(saved);
    } catch {
      // ignore
    }
  }, [roomId]);

  useEffect(() => {
    if (!loading && announcements.some(a => !a.is_read)) {
      markAllRead(roomId).catch(() => {});
      // Dispatch event so sidebar updates
      window.dispatchEvent(new CustomEvent('announcements-read', { detail: { roomId } }));
    }
  }, [loading, roomId, announcements]);

  const handleCreateAnnouncement = async () => {
    if (!announcementInput.trim()) return;
    try {
      const ann = await createAnnouncement(roomId, announcementInput.trim());
      setAnnouncements(prev => [ann, ...prev]);
      setAnnouncementInput('');
      setShowAnnouncementForm(false);
    } catch { /* silent */ }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await deleteAnnouncementApi(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch { /* silent */ }
  };

  // Scroll-follow: detect which event date group is at top of viewport
  const [scrollFollowDate, setScrollFollowDate] = useState(null);

  useEffect(() => {
    if (activeTab !== 'schedule') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible date group
        let topEntry = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) {
          const dateKey = topEntry.target.id.replace('event-date-', '');
          if (dateKey) setScrollFollowDate(dateKey);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    // Small delay to let DOM render
    const timer = setTimeout(() => {
      const dateElements = document.querySelectorAll('[id^="event-date-"]');
      dateElements.forEach((el) => observer.observe(el));
    }, 300);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [activeTab, events]);

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
      <>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <OnboardingTour
        tourId="room"
        steps={[
          {
            target: '[data-tour="tab-schedule"]',
            title: 'Schedule',
            description: 'Your team calendar — add meetings, deadlines, exams.',
            position: 'bottom',
            icon: '\u{1F4C6}',
            action: { click: true },
          },
          {
            target: '[data-tour="tab-tasks"]',
            title: 'Tasks',
            description: 'Track to-dos, assign work, check things off.',
            position: 'bottom',
            icon: '\u2705',
            action: { click: true },
          },
          {
            target: '[data-tour="tab-chat"]',
            title: 'Chat',
            description: 'Real-time messaging with your team.',
            position: 'bottom',
            icon: '\u{1F4AC}',
            action: { click: true },
          },
          {
            target: '[data-tour="tab-files"]',
            title: 'Files',
            description: 'Share docs, slides, anything your team needs.',
            position: 'bottom',
            icon: '\u{1F4C1}',
            action: { click: true },
          },
        ]}
      />
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

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="space-y-2">
            {announcements.map((ann) => {
              const authorName = ann.users?.full_name || 'Admin';
              const currentMember = members.find(m => String(m.user_id) === String(user?.id));
              const canDelete = ann.author_id === user?.id || currentMember?.role === 'owner' || currentMember?.role === 'admin';
              return (
                <div key={ann.id} className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-4 py-3 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Megaphone className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-700">{authorName}</span>
                      <span className="text-[10px] text-amber-500">{ann.created_at ? formatDistanceToNow(new Date(ann.created_at), { addSuffix: true }) : ''}</span>
                    </div>
                    <p className="text-sm text-amber-900 mt-0.5 whitespace-pre-wrap">{ann.content}</p>
                  </div>
                  {canDelete && (
                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="shrink-0 text-amber-400 hover:text-red-500 transition-colors mt-1">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create announcement (admin/owner only) */}
        {(() => {
          const currentMember = members.find(m => String(m.user_id) === String(user?.id));
          const isAdminOrOwner = currentMember?.role === 'owner' || currentMember?.role === 'admin';
          if (!isAdminOrOwner) return null;
          return showAnnouncementForm ? (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Write an announcement..."
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAnnouncement(); }}
                maxLength={2000}
              />
              <Button size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={handleCreateAnnouncement}>Post</Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowAnnouncementForm(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => setShowAnnouncementForm(true)}>
              <Megaphone className="h-3.5 w-3.5 mr-1.5" />
              New Announcement
            </Button>
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
            <TabsTrigger value="schedule" data-tour="tab-schedule" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Schedule</TabsTrigger>
            <TabsTrigger value="tasks" data-tour="tab-tasks" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Tasks</TabsTrigger>
            <TabsTrigger value="chat" data-tour="tab-chat" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Chat</TabsTrigger>
            <TabsTrigger value="files" data-tour="tab-files" className="min-h-[44px] sm:min-h-0 px-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Files</TabsTrigger>
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
            <div className="flex flex-col md:flex-row gap-4" style={{ overflow: 'visible' }}>
              {/* Calendar sidebar — sticky on desktop */}
              <div className="w-full shrink-0 md:w-[280px]">
                <div className="md:sticky md:top-4 z-10">
                  <ScheduleCalendar
                    roomId={roomId}
                    events={events}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    scrollFollowDate={scrollFollowDate}
                    onDismissPrompt={() => {
                      clearHighlight();
                    }}
                    onDateClick={(date) => {
                      setSelectedDate(date);
                      clearHighlight();
                      const dateKey = format(date, 'yyyy-MM-dd');
                      setTimeout(() => {
                        const el = document.getElementById(`event-date-${dateKey}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                <ChatPanel roomId={roomId} onChatFileUploaded={handleFileUploaded} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            {(() => {
              const categories = [
                { key: 'lecture', label: 'Lecture Materials', icon: '📖', canUpload: true },
                { key: 'submission', label: 'Team Submissions', icon: '📝', canUpload: true },
                { key: 'chat', label: 'Chat Files', icon: '💬', canUpload: false },
              ];

              const handleDrop = async (e, targetCategory) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/30');
                const fileId = e.dataTransfer.getData('text/file-id');
                const sourceCategory = e.dataTransfer.getData('text/source-category');
                if (!fileId || sourceCategory === targetCategory) return;
                try {
                  const { updateFile: updateFileFn } = await import('@/services/files');
                  await updateFileFn(fileId, { category: targetCategory });
                  setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, category: targetCategory } : f));
                } catch { /* ignore */ }
              };

              const handleDragOver = (e) => {
                e.preventDefault();
                e.currentTarget.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50/30');
              };

              const handleDragLeave = (e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/30');
              };

              return categories.map((cat, idx) => (
                <React.Fragment key={cat.key}>
                  {idx > 0 && <div className="h-px bg-border" />}
                  <div
                    className="space-y-3 rounded-xl p-3 transition-all"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, cat.key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <h2 className="text-lg font-semibold">{cat.label}</h2>
                        <Badge variant="secondary" className="text-xs">{files.filter(f => f.category === cat.key).length}</Badge>
                      </div>
                      {cat.canUpload && (
                        <FileUpload roomId={roomId} onUploaded={handleFileUploaded} category={cat.key} events={events} />
                      )}
                    </div>
                    <FileList files={files} roomId={roomId} onFilesChange={setFiles} filterCategory={cat.key} members={members} draggable />
                  </div>
                </React.Fragment>
              ));
            })()}
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
    </>
  );
}
