import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, BookOpen, ExternalLink, Loader2, ChevronDown, ChevronUp, MapPin, Star, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRecommendedEvents } from '@/services/flinders';
import { hydratePreferences, updatePreferences } from '@/lib/preferences';
import OnboardingTour from '@/components/OnboardingTour';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths, isWithinInterval } from 'date-fns';

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

const INTEREST_CATEGORIES = [
  'IT & Computing', 'Engineering', 'Health & Medicine', 'Business & Law',
  'Education', 'Arts & Creative', 'Science',
];

const CATEGORY_COLORS = {
  'IT & Computing': 'bg-blue-100 text-blue-700 border-blue-200',
  'Engineering': 'bg-orange-100 text-orange-700 border-orange-200',
  'Health & Medicine': 'bg-rose-100 text-rose-700 border-rose-200',
  'Business & Law': 'bg-purple-100 text-purple-700 border-purple-200',
  'Education': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Arts & Creative': 'bg-pink-100 text-pink-700 border-pink-200',
  'Science': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Career': 'bg-amber-100 text-amber-700 border-amber-200',
  'General': 'bg-slate-100 text-slate-600 border-slate-200',
};

// ── Flinders 2026 Academic Calendar ──
const ACADEMIC_DATES = [
  // Semester 1
  { date: '2026-02-23', label: 'Semester 1 Orientation Week', type: 'orientation' },
  { date: '2026-03-02', label: 'Semester 1 Teaching Begins', type: 'semester' },
  { date: '2026-03-09', label: 'Adelaide Cup', type: 'holiday' },
  { date: '2026-03-13', label: 'Last Day to Enrol (Sem 1)', type: 'deadline' },
  { date: '2026-04-03', label: 'Good Friday', type: 'holiday' },
  { date: '2026-04-04', label: 'Easter Saturday', type: 'holiday' },
  { date: '2026-04-06', label: 'Easter Monday', type: 'holiday' },
  { date: '2026-04-03', label: 'Census Date (Sem 1)', type: 'deadline' },
  { startDate: '2026-04-13', endDate: '2026-04-24', label: 'Mid-Semester 1 Break', type: 'break' },
  { date: '2026-04-25', label: 'ANZAC Day', type: 'holiday' },
  { date: '2026-05-15', label: 'Last Day to Withdraw (WN)', type: 'deadline' },
  { date: '2026-06-05', label: 'Semester 1 Teaching Ends', type: 'semester' },
  { date: '2026-06-08', label: "King's Birthday", type: 'holiday' },
  { date: '2026-06-15', label: 'SWOTVAC Begins', type: 'exam' },
  { date: '2026-06-19', label: 'Last Day to Withdraw (WF)', type: 'deadline' },
  { date: '2026-06-22', label: 'Exam Period Begins (Sem 1)', type: 'exam' },
  { date: '2026-07-04', label: 'Exam Period Ends (Sem 1)', type: 'exam' },
  { startDate: '2026-07-06', endDate: '2026-07-19', label: 'Mid-Year Break', type: 'break' },
  { date: '2026-07-20', label: 'Deferred Exams (Sem 1)', type: 'exam' },
  // Semester 2
  { date: '2026-07-20', label: 'Semester 2 Orientation Week', type: 'orientation' },
  { date: '2026-07-27', label: 'Semester 2 Teaching Begins', type: 'semester' },
  { date: '2026-08-07', label: 'Last Day to Enrol (Sem 2)', type: 'deadline' },
  { date: '2026-08-28', label: 'Census Date (Sem 2)', type: 'deadline' },
  { startDate: '2026-09-21', endDate: '2026-10-02', label: 'Mid-Semester 2 Break', type: 'break' },
  { date: '2026-10-05', label: 'Labour Day', type: 'holiday' },
  { date: '2026-10-09', label: 'Last Day to Withdraw (WN)', type: 'deadline' },
  { date: '2026-10-30', label: 'Semester 2 Teaching Ends', type: 'semester' },
  { date: '2026-11-02', label: 'SWOTVAC Begins', type: 'exam' },
  { date: '2026-11-06', label: 'Last Day to Withdraw (WF)', type: 'deadline' },
  { date: '2026-11-09', label: 'Exam Period Begins (Sem 2)', type: 'exam' },
  { date: '2026-11-20', label: 'Exam Period Ends (Sem 2)', type: 'exam' },
  { date: '2026-12-07', label: 'Deferred Exams (Sem 2)', type: 'exam' },
  { date: '2026-12-25', label: 'Christmas Day', type: 'holiday' },
  { date: '2026-12-28', label: 'Proclamation Day (Observed)', type: 'holiday' },
  // 2026 general
  { date: '2026-01-01', label: "New Year's Day", type: 'holiday' },
  { date: '2026-01-26', label: 'Australia Day', type: 'holiday' },
];

const DATE_TYPE_COLORS = {
  holiday: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  semester: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  deadline: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  exam: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  break: { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  orientation: { bg: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-50 border-teal-200', dot: 'bg-teal-500' },
};

function getAcademicEntryStart(entry) {
  return entry.startDate || entry.date;
}

function getAcademicEntryEnd(entry) {
  return entry.endDate || entry.startDate || entry.date;
}

function expandAcademicEntryDates(entry) {
  const start = getAcademicEntryStart(entry);
  const end = getAcademicEntryEnd(entry);
  return eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map((day) => format(day, 'yyyy-MM-dd'));
}

function formatAcademicEntryRange(entry) {
  const start = parseISO(getAcademicEntryStart(entry));
  const end = parseISO(getAcademicEntryEnd(entry));

  if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
    return format(start, 'EEEE, d MMMM yyyy');
  }

  return `${format(start, 'EEEE, d MMM')} - ${format(end, 'EEEE, d MMM yyyy')}`;
}

function EventRow({ event, isFavorite, onToggleFavorite }) {
  const title = stripHtml(event.title);
  const location = event.location ? stripHtml(event.location) : '';
  const timeDisplay = event.time_display || '';
  const dateStr = event.start_time || event.date;
  const cost = event.cost || '';

  const mapsUrl = location && location !== 'Online'
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null;

  let dateBadge = null;
  try {
    const d = parseISO(dateStr);
    dateBadge = { month: format(d, 'MMM'), day: format(d, 'd'), weekday: format(d, 'EEE') };
  } catch { /* skip */ }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 hover:shadow-md hover:border-slate-300 transition-all group">
      {dateBadge && (
        <div className="shrink-0 text-center w-11">
          <div className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white px-1.5 py-1 shadow-sm">
            <p className="text-[8px] font-bold uppercase leading-none">{dateBadge.month}</p>
            <p className="text-base font-black leading-tight">{dateBadge.day}</p>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{dateBadge.weekday}</p>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1 mb-1">
          {event.categories?.map((cat) => (
            <span key={cat} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold border ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['General']}`}>
              {cat}
            </span>
          ))}
        </div>
        <a href={event.link} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className="text-[13px] font-bold text-slate-800 group-hover:text-amber-700 transition-colors leading-snug line-clamp-1">{title}</h3>
        </a>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {timeDisplay && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3 text-slate-400" />{timeDisplay}
            </span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline truncate">{location}</a>
              ) : (
                <span className="truncate">{location}</span>
              )}
            </span>
          )}
          {cost && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cost.toLowerCase().includes('free') ? 'text-emerald-600' : 'text-amber-600'}`}>
              {cost.toLowerCase().includes('free') ? '✓' : '$'} {cost}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(event.id); }}
        className={`shrink-0 mt-0.5 p-1 rounded-full transition-all ${isFavorite ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`}
      >
        <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
      </button>
    </div>
  );
}

function AcademicCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, new Date().getMonth(), 1));

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const dateMap = useMemo(() => {
    const map = {};
    for (const entry of ACADEMIC_DATES) {
      for (const key of expandAcademicEntryDates(entry)) {
        if (!map[key]) map[key] = [];
        map[key].push(entry);
      }
    }
    return map;
  }, []);

  // Events for the current month displayed below the calendar
  const monthEvents = useMemo(() => {
    return ACADEMIC_DATES
      .filter((e) => {
        try {
          const start = parseISO(getAcademicEntryStart(e));
          const end = parseISO(getAcademicEntryEnd(e));
          return isSameMonth(start, currentMonth)
            || isSameMonth(end, currentMonth)
            || isWithinInterval(currentMonth, { start, end });
        } catch { return false; }
      })
      .sort((a, b) => getAcademicEntryStart(a).localeCompare(getAcademicEntryStart(b)));
  }, [currentMonth]);

  const startDow = getDay(days[0]); // 0=Sun

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-slate-100 transition">
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h2 className="text-base font-bold text-slate-800 min-w-[140px] text-center">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-slate-100 transition">
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {[
          { type: 'holiday', label: 'Holiday' },
          { type: 'semester', label: 'Semester' },
          { type: 'deadline', label: 'Deadline' },
          { type: 'exam', label: 'Exam' },
          { type: 'break', label: 'Break' },
          { type: 'orientation', label: 'Orientation' },
        ].map(({ type, label }) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${DATE_TYPE_COLORS[type].dot}`} />
            <span className="text-slate-500 font-medium">{label}</span>
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 border-b border-r border-slate-100" />
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const entries = dateMap[key] || [];
            const isHoliday = entries.some((e) => e.type === 'holiday');
            const hasEvent = entries.length > 0;
            const today2026 = isToday(day);

            return (
              <div
                key={key}
                className={`h-12 border-b border-r border-slate-100 p-0.5 relative ${
                  isHoliday ? 'bg-red-50' : today2026 ? 'bg-indigo-50' : ''
                }`}
                title={entries.map((e) => e.label).join('\n')}
              >
                <span className={`text-[11px] font-medium block text-center mt-0.5 ${
                  isHoliday ? 'text-red-600 font-bold' : today2026 ? 'text-white font-bold' : 'text-slate-700'
                }`}>
                  {today2026 ? (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">
                      {format(day, 'd')}
                    </span>
                  ) : format(day, 'd')}
                </span>
                {hasEvent && (
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {entries.slice(0, 3).map((e, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${DATE_TYPE_COLORS[e.type]?.dot || 'bg-slate-400'}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Events list for current month */}
      {monthEvents.length > 0 && (
        <div className="space-y-1.5">
          {monthEvents.map((entry, i) => {
            const colors = DATE_TYPE_COLORS[entry.type] || DATE_TYPE_COLORS.deadline;
            const startDate = parseISO(getAcademicEntryStart(entry));
            return (
              <div key={i} className={`flex items-center gap-3 rounded-lg border p-2.5 ${colors.light}`}>
                <div className="shrink-0 text-center w-10">
                  <p className={`text-lg font-black ${colors.text}`}>{format(startDate, 'd')}</p>
                  <p className="text-[9px] text-slate-500 font-medium">{format(startDate, 'EEE')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${colors.text}`}>{entry.label}</p>
                  <p className="text-[10px] text-slate-400">{formatAcademicEntryRange(entry)}</p>
                </div>
                <span className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
              </div>
            );
          })}
        </div>
      )}
      {monthEvents.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">No academic events this month</p>
      )}
    </div>
  );
}

function LoadingState({ tutorialId = null }) {
  return (
    <div
      className="flex items-center justify-center py-16"
      {...(tutorialId ? { 'data-tutorial': tutorialId } : {})}
    >
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function FlindersLifePage() {
  const [eventData, setEventData] = useState({ recommended: [], career: [], all: [] });
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [allEventsExpanded, setAllEventsExpanded] = useState(true);
  const [showFavorites, setShowFavorites] = useState(false);

  const fetchEvents = useCallback((interests) => {
    setEventsLoading(true);
    getRecommendedEvents(interests)
      .then((data) => setEventData({
        recommended: Array.isArray(data?.recommended) ? data.recommended : [],
        career: Array.isArray(data?.career) ? data.career : [],
        all: Array.isArray(data?.all) ? data.all : [],
      }))
      .catch(() => setEventData({ recommended: [], career: [], all: [] }))
      .finally(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    hydratePreferences()
      .then((data) => {
        setSelectedInterests(Array.isArray(data?.flinders_interests) ? data.flinders_interests : []);
        setFavorites(Array.isArray(data?.flinders_favorites) ? data.flinders_favorites : []);
      })
      .catch(() => {})
      .finally(() => setPreferencesReady(true));
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    fetchEvents(selectedInterests);
  }, [fetchEvents, preferencesReady, selectedInterests]);

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest];
      updatePreferences({ flinders_interests: next }).catch(() => {});
      fetchEvents(next);
      return next;
    });
  };

  const toggleFavorite = (eventId) => {
    const normalizedId = String(eventId);
    setFavorites((prev) => {
      const next = prev.includes(normalizedId) ? prev.filter((id) => id !== normalizedId) : [...prev, normalizedId];
      updatePreferences({ flinders_favorites: next }).catch(() => {});
      return next;
    });
  };

  const favoriteEvents = eventData.all.filter((e) => favorites.includes(String(e.id)));
  const sortByDate = (events) => [...events].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  return (
    <>
      <OnboardingTour
        tourId="flinders-life"
        steps={[
          {
            target: null,
            title: 'Flinders Life',
            description: 'Events, academic calendar, study rooms — pick your interests for recommendations!',
            icon: '\u{1F393}',
          },
        ]}
      />
      {/* Hero */}
      <div
        className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 px-5 py-6 shadow-lg sm:px-7 sm:py-8"
        data-tutorial="flinders-hero"
      >
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Flinders Life</h1>
            <p className="mt-0.5 text-xs text-white/80">Events, academic calendar & study resources</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="events" className="gap-1.5" data-tutorial="flinders-tab-events"><Calendar className="h-4 w-4" />Events</TabsTrigger>
          <TabsTrigger value="academic-calendar" className="gap-1.5" data-tutorial="flinders-tab-academic-calendar"><Calendar className="h-4 w-4" />Academic Calendar</TabsTrigger>
          <TabsTrigger value="study-rooms" className="gap-1.5" data-tutorial="flinders-tab-study-rooms"><BookOpen className="h-4 w-4" />Study Rooms</TabsTrigger>
        </TabsList>

        {/* ── Events ── */}
        <TabsContent value="events" data-tutorial="flinders-panel-events">
          <div className="mb-3" data-tutorial="flinders-events-interest-picker">
            <p className="text-[11px] font-medium text-slate-500 mb-1.5">Select interests for recommendations</p>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_CATEGORIES.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border ${
                    selectedInterests.includes(interest)
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                  }`}
                >{interest}</button>
              ))}
            </div>
          </div>

          {favorites.length > 0 && (
            <button
              onClick={() => setShowFavorites((v) => !v)}
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                showFavorites ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-200'
              }`}
            >
              <Star className={`h-3 w-3 ${showFavorites ? 'fill-amber-400 text-amber-500' : ''}`} />
              Favorites ({favorites.length})
            </button>
          )}

          {eventsLoading ? <LoadingState tutorialId="flinders-events-loading" /> : (
            <div className="space-y-4" data-tutorial="flinders-events-content">
              {showFavorites && (
                <div data-tutorial="flinders-events-favorites">
                  <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />Favorites
                  </h2>
                  {favoriteEvents.length > 0 ? (
                    <div className="space-y-1.5">
                      {sortByDate(favoriteEvents).map((e) => <EventRow key={e.id} event={e} isFavorite onToggleFavorite={toggleFavorite} />)}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">Your favorited events will appear here</p>}
                </div>
              )}

              {selectedInterests.length > 0 && eventData.recommended.length > 0 && (
                <div data-tutorial="flinders-events-recommended">
                  <h2 className="text-sm font-bold text-slate-800 mb-2">Recommended for You</h2>
                  <div className="space-y-1.5">
                    {sortByDate(eventData.recommended).map((e) => <EventRow key={e.id} event={e} isFavorite={favorites.includes(e.id)} onToggleFavorite={toggleFavorite} />)}
                  </div>
                </div>
              )}

              {selectedInterests.length > 0 && eventData.recommended.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">No events match your selected interests right now.</p>
                </div>
              )}

              {eventData.career.length > 0 && (
                <div data-tutorial="flinders-events-career">
                  <h2 className="text-sm font-bold text-slate-800 mb-2">Career & Employment</h2>
                  <div className="space-y-1.5">
                    {sortByDate(eventData.career).map((e) => <EventRow key={e.id} event={e} isFavorite={favorites.includes(e.id)} onToggleFavorite={toggleFavorite} />)}
                  </div>
                </div>
              )}

              {eventData.all.length > 0 && (
                <div data-tutorial="flinders-events-all">
                  <button
                    onClick={() => setAllEventsExpanded((v) => !v)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2 hover:text-amber-700 transition-colors"
                  >
                    All Events ({eventData.all.length})
                    {allEventsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {allEventsExpanded && (
                    <div className="space-y-1.5">
                      {sortByDate(eventData.all).map((e) => <EventRow key={e.id} event={e} isFavorite={favorites.includes(e.id)} onToggleFavorite={toggleFavorite} />)}
                    </div>
                  )}
                </div>
              )}

              {eventData.all.length === 0 && <EmptyState icon={Calendar} message="No upcoming events. Check back later!" />}
            </div>
          )}
        </TabsContent>

        {/* ── Academic Calendar ── */}
        <TabsContent value="academic-calendar" data-tutorial="flinders-panel-academic-calendar">
          <div data-tutorial="flinders-academic-calendar-content">
            <AcademicCalendar />
          </div>
        </TabsContent>

        {/* ── Study Rooms ── */}
        <TabsContent value="study-rooms" data-tutorial="flinders-panel-study-rooms">
          <div className="grid gap-6 sm:grid-cols-2" data-tutorial="flinders-study-rooms-content">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><MapPin className="h-5 w-5 text-white" /></div>
                  <div><h2 className="text-base font-bold text-white">City Campus</h2><p className="text-[11px] text-white/70">Victoria Square</p></div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-500">Book study rooms at City Campus via ResourceBooker.</p>
                <a href="https://resourcebooker.flinders.edu.au/app/booking-types/e14fb159-2faf-411b-8125-70e08088b6f0" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 font-semibold shadow text-sm py-3">
                    <BookOpen className="h-4 w-4" />Book Study Room<ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><BookOpen className="h-5 w-5 text-white" /></div>
                  <div><h2 className="text-base font-bold text-white">Bedford Park & Tonsley</h2><p className="text-[11px] text-white/70">Library study rooms</p></div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-500">Book study rooms via Flinders LibCal.</p>
                <a href="https://flinders.libcal.com/spaces" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold shadow text-sm py-3">
                    <BookOpen className="h-4 w-4" />Book Study Room<ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
