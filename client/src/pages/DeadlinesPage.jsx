import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { getUpcomingEvents } from '@/services/events';
import { getRoomPalette } from '@/components/room/RoomCard';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, CalendarDays, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OnboardingTour from '@/components/OnboardingTour';

const CATEGORY_INFO = {
  meeting:      { icon: '👥', label: 'Meeting' },
  submission:   { icon: '📮', label: 'Submission' },
  quiz:         { icon: '✏️', label: 'Quiz' },
  exam:         { icon: '📝', label: 'Exam' },
  presentation: { icon: '📊', label: 'Presentation' },
  deadline:     { icon: '⏰', label: 'Deadline' },
  study:        { icon: '📚', label: 'Study Session' },
  lecture:      { icon: '🎓', label: 'Lecture' },
  social:       { icon: '🎉', label: 'Social' },
  other:        { icon: '📌', label: 'Other' },
};
const APP_SOFT_REFRESH_EVENT = 'app-soft-refresh';

function normalizeCategory(category) {
  const normalized = String(category || '').trim().toLowerCase();

  if (!normalized) return 'other';
  if (CATEGORY_INFO[normalized]) return normalized;
  if (normalized === 'due' || normalized === 'due date') return 'deadline';
  if (normalized === 'presentation' || normalized === 'presentations') return 'presentation';
  if (normalized === 'submission' || normalized === 'submissions') return 'submission';
  if (normalized === 'exam' || normalized === 'exams' || normalized === 'test') return 'exam';
  if (normalized === 'meeting' || normalized === 'meetings') return 'meeting';
  if (normalized === 'lecture' || normalized === 'class') return 'lecture';
  if (normalized === 'study' || normalized === 'study session') return 'study';
  if (normalized === 'social' || normalized === 'event') return 'social';

  return 'other';
}

export default function DeadlinesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const fetchAll = useCallback(async () => {
    try {
      const data = await getUpcomingEvents();
      const future = (Array.isArray(data?.events) ? data.events : []).map((event) => ({
        ...event,
        category: normalizeCategory(event.category),
      }));
      setEvents(future);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    window.addEventListener(APP_SOFT_REFRESH_EVENT, fetchAll);
    return () => window.removeEventListener(APP_SOFT_REFRESH_EVENT, fetchAll);
  }, [fetchAll]);

  const categories = ['all', ...new Set(events.map((e) => normalizeCategory(e.category)))];
  const filtered = filter === 'all'
    ? events
    : events.filter((e) => normalizeCategory(e.category) === filter);

  return (
    <>
      <OnboardingTour
        tourId="deadlines"
        steps={[
          {
            target: null,
            title: 'Your Deadlines',
            description: 'All your deadlines from every room, in one place. Never miss a thing!',
            icon: '\u{1F4C5}',
          },
        ]}
      />
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
          <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {categories.map((cat) => {
              const info = CATEGORY_INFO[cat] || { icon: '📌', label: cat };
              return (
                <Button
                  key={cat}
                  variant={filter === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`h-auto min-h-[2.25rem] shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs gap-1.5 ${filter === cat ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 shadow-md' : ''}`}
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
          <div className="rounded-2xl border-2 border-dashed border-orange-200 p-8 text-center sm:p-16">
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
              const normalizedCategory = normalizeCategory(event.category);
              const catInfo = CATEGORY_INFO[normalizedCategory] || CATEGORY_INFO.other;

              let badgeText = `D-${diffDays}`;
              let badgeBg = 'bg-emerald-100 text-emerald-700';
              if (diffDays <= 0) { badgeText = 'TODAY'; badgeBg = 'bg-red-100 text-red-700'; }
              else if (diffDays === 1) { badgeText = 'D-1'; badgeBg = 'bg-red-100 text-red-700'; }
              else if (diffDays <= 3) { badgeBg = 'bg-orange-100 text-orange-700'; }
              else if (diffDays <= 7) { badgeBg = 'bg-yellow-100 text-yellow-700'; }

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                  style={{ borderLeftWidth: '4px', borderLeftColor: palette.accent }}
                  onClick={() => navigate(`/rooms/${event.room_id}`)}
                >
                  <span
                    className="shrink-0 text-sm font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: palette.pillBg, color: palette.pillText }}
                  >
                    {event.room_name}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate">{event.title}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      <span className="text-muted-foreground/60">{catInfo.label}</span>
                      <span className="mx-1.5 text-muted-foreground/30">·</span>
                      {format(startDate, 'EEE, MMM d · h:mm a')}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${badgeBg}`}>
                      {badgeText}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(startDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
