import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MemberList from '@/components/room/MemberList';
import ScheduleCalendar from '@/components/schedule/Calendar';
import EventForm from '@/components/schedule/EventForm';
import EventList from '@/components/schedule/EventList';
import ChatPanel from '@/components/chat/ChatPanel';
import FileList from '@/components/files/FileList';
import FileUpload from '@/components/files/FileUpload';
import LocationMap from '@/components/location/LocationMap';
import LocationToggle from '@/components/location/LocationToggle';
import { getRoom, getMembers } from '@/services/rooms';
import { getEvents } from '@/services/events';
import { getFiles } from '@/services/files';
import { getLocationStatus } from '@/services/location';
import { Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RoomPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [files, setFiles] = useState([]);
  const [locationMembers, setLocationMembers] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const fetchRoom = async () => {
    try {
      const data = await getRoom(roomId);
      setRoom(data.room || data);
    } catch {
      // silently fail
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await getMembers(roomId);
      setMembers(data.members || data || []);
    } catch {
      // silently fail
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await getEvents(roomId);
      setEvents(data.events || data || []);
    } catch {
      // silently fail
    }
  };

  const fetchFiles = async () => {
    try {
      const data = await getFiles(roomId);
      setFiles(data.files || data || []);
    } catch {
      // silently fail
    }
  };

  const fetchLocation = async (eventId) => {
    try {
      const data = await getLocationStatus(eventId);
      setLocationMembers(data || []);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchRoom(), fetchMembers(), fetchEvents(), fetchFiles()]);
      setLoading(false);
    };
    init();
  }, [roomId]);

  const copyInviteCode = () => {
    if (room?.invite_code) {
      navigator.clipboard.writeText(room.invite_code);
    }
  };

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
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{room?.name}</h1>
            {room?.course_code && <Badge variant="secondary">{room.course_code}</Badge>}
          </div>
          {room?.description && <p className="mt-1 text-muted-foreground">{room.description}</p>}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Room Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {room?.invite_code && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Invite Code:</span>
                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono">{room.invite_code}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyInviteCode}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">{members.length} members</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Members</CardTitle>
              </CardHeader>
              <CardContent>
                <MemberList members={members.slice(0, 5)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Schedule</h2>
              <EventForm roomId={roomId} onCreated={fetchEvents} />
            </div>
            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
              <ScheduleCalendar events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              <EventList events={events} roomId={roomId} onUpdated={fetchEvents} />
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <Card>
              <CardContent className="p-0">
                <ChatPanel roomId={roomId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <FileUpload roomId={roomId} onUploaded={fetchFiles} />
            <FileList files={files} roomId={roomId} onUpdated={fetchFiles} />
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Members</CardTitle>
                <CardDescription>{members.length} members in this room</CardDescription>
              </CardHeader>
              <CardContent>
                <MemberList members={members} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
