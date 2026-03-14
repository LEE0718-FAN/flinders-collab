import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { getRooms } from '@/services/rooms';
import { getEvents } from '@/services/events';
import { getRoomPalette } from '@/components/room/RoomCard';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, CalendarDays, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CATEGORY_INFO = {
  meeting: { icon: '👥', label: 'Meeting' },
  presentation: { icon: '📊', label: 'Presentation' },
  deadline: { icon: '⏰', label: 'Deadline' },
  study: { icon: '📚', label: 'Study Session' },
  lecture: { icon: '🎓', label: 'Lecture' },
  other: { icon: '📌', label: 'Other' },
};

export default function DeadlinesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const roomsData = await getRooms();
        const rooms = roomsData.rooms || roomsData || [];
        const allEvents = [];
        const results = await Promise.allSettled(
          rooms.map(async (room) => {
            const data = await getEvents(room.id);
            const evts = Array.isArray(data) ? data : data.events || [];
            return evts.map(e => ({ ...e, room_name: room.name, room_id: room.id }));
          })
        );
        results.forEach(r => { if (r.status === 'fulfilled') allEvents.push(...r.value); });

        const now = new Date();
        const future = allEvents
          .filter(e => new Date(e.start_time) > now)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        setEvents(future);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const categories = ['all', ...new Set(events.map(e => e.category || 'other'))];
  const filtered = filter === 'all' ? events : events.filter(e => (e.category || 'other') === filter);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 px-8 py-8 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Upcoming Deadlines</h1>
            <p className="mt-2 text-white/70">All your upcoming events across every room</p>
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const info = CATEGORY_INFO[cat] || { icon: '📌', label: cat };
              return (
                <Button
                  key={cat}
                  variant={filter === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs rounded-full gap-1.5 ${filter === cat ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 shadow-md' : ''}`}
                  onClick={() => setFilter(cat)}
                >
                  {cat === 'all' ? '🔍' : info.icon}
                  {cat === 'all' ? 'All' : info.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Events list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-orange-200 p-16 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-orange-300 mb-4" />
            <h3 className="text-lg font-semibold">No upcoming deadlines</h3>
            <p className="mt-2 text-sm text-muted-foreground">You're all caught up! No events scheduled.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((event) => {
              const startDate = new Date(event.start_time);
              const now = new Date();
              const diffMs = startDate - now;
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              const palette = getRoomPalette({ id: event.room_id, name: event.room_name });
              const catInfo = CATEGORY_INFO[event.category] || CATEGORY_INFO.other;

              let badgeText = `D-${diffDays}`;
              let badgeBg = 'bg-emerald-100 text-emerald-700';
              if (diffDays <= 0) { badgeText = 'TODAY'; badgeBg = 'bg-red-100 text-red-700'; }
              else if (diffDays === 1) { badgeText = 'D-1'; badgeBg = 'bg-red-100 text-red-700'; }
              else if (diffDays <= 3) { badgeBg = 'bg-orange-100 text-orange-700'; }
              else if (diffDays <= 7) { badgeBg = 'bg-yellow-100 text-yellow-700'; }

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                  style={{ borderLeftWidth: '4px', borderLeftColor: palette.accent }}
                  onClick={() => navigate(`/rooms/${event.room_id}`)}
                >
                  <div
                    className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: palette.pillBg }}
                  >
                    {catInfo.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: palette.pillBg, color: palette.pillText }}
                      >
                        {event.room_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">{catInfo.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {format(startDate, 'EEE, MMM d · h:mm a')}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${badgeBg}`}>
                      {badgeText}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(startDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
