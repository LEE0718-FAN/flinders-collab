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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground animate-pulse" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{room?.name}</h1>
            {room?.course_code && <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">{room.course_code}</Badge>}
          </div>
          {room?.description && <p className="text-base text-muted-foreground/80 mt-2">{room.description}</p>}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList className="flex-wrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Room Info</CardTitle>
                  {room && <EditRoomDialog room={room} onUpdated={fetchRoom} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {room?.invite_code && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Invite Code:</span>
                    <div className="bg-muted/50 rounded-lg px-4 py-2.5 font-mono text-sm flex items-center gap-2">
                      <code>{room.invite_code}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-background/80" onClick={handleCopyInviteCode}>
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full text-xs font-medium">{members.length} members</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Members ({members.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <MemberList members={members} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Schedule</h2>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm hover:from-blue-700 hover:to-indigo-700" onClick={() => { if (!selectedDate) setSelectedDate(new Date()); setEventFormOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[300px_1fr]">
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

          <TabsContent value="tasks" className="space-y-5">
            <h2 className="text-xl font-bold tracking-tight">Tasks</h2>
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
            <Card className="rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <ChatPanel roomId={roomId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-8">
            {/* Lecture Materials */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📖</span>
                  <h2 className="text-lg font-bold tracking-tight">Lecture Materials</h2>
                  <Badge variant="secondary" className="rounded-full text-xs">{files.filter(f => f.category === 'lecture').length}</Badge>
                </div>
                <FileUpload roomId={roomId} onUploaded={handleFileUploaded} category="lecture" events={events} />
              </div>
              <FileList files={files} roomId={roomId} onFilesChange={setFiles} filterCategory="lecture" />
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Team Submissions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📝</span>
                  <h2 className="text-lg font-bold tracking-tight">Team Submissions</h2>
                  <Badge variant="secondary" className="rounded-full text-xs">{files.filter(f => f.category === 'submission').length}</Badge>
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
