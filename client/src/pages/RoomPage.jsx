import React, { useState, useEffect, useCallback } from 'react';
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
import { getRoom, getMembers } from '@/services/rooms';
import { getEvents } from '@/services/events';
import { getFiles } from '@/services/files';
import { getTasks } from '@/services/tasks';
import { copyToClipboard } from '@/lib/native';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Copy, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportButton from '@/components/ReportButton';
import EditRoomDialog from '@/components/room/EditRoomDialog';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

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

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([fetchRoom(), fetchMembers(), fetchEvents(), fetchFiles(), fetchTasks()]);
      } catch {
        setError('Failed to load some data. Please refresh.');
      }
      setLoading(false);
    };
    init();
  }, [fetchRoom, fetchMembers, fetchEvents, fetchFiles, fetchTasks]);

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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-8 text-white shadow-xl mb-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{room?.name}</h1>
              {room?.course_code && <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">{room.course_code}</Badge>}
            </div>
            {room?.description && <p className="mt-2 text-white/70">{room.description}</p>}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList className="flex-wrap bg-white rounded-xl p-1.5 shadow-sm border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Schedule</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Tasks</TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Chat</TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-semibold">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="border-t-4 border-t-indigo-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Room Info</CardTitle>
                  {room && <EditRoomDialog room={room} onUpdated={fetchRoom} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {room?.invite_code && (
                  <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Invite Code:</span>
                      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">{room.invite_code}</code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyInviteCode}>
                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">{members.length} members</div>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader>
                <CardTitle className="text-lg">Members ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <MemberList members={members} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50 px-5 py-4">
              <h2 className="text-lg font-bold text-indigo-900">Schedule</h2>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-md" onClick={() => { if (!selectedDate) setSelectedDate(new Date()); setEventFormOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
              <ScheduleCalendar
                events={events}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onDateClick={(date) => { setSelectedDate(date); setEventFormOpen(true); }}
              />
              <EventList events={events} roomId={roomId} onEventsChange={handleEventsChange} />
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
              <FileList files={files} roomId={roomId} onFilesChange={setFiles} filterCategory="lecture" />
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
              <FileList files={files} roomId={roomId} onFilesChange={setFiles} filterCategory="submission" />
            </div>
          </TabsContent>

        </Tabs>
      </div>
      <ReportButton section={activeTab} roomId={roomId} floating />
    </MainLayout>
  );
}
