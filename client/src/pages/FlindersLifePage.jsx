import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, BookOpen, ExternalLink, Loader2, ChevronDown, ChevronUp, MapPin, Star, Clock, ChevronLeft, ChevronRight, Users, Navigation, Shield, RefreshCw, EyeOff } from 'lucide-react';
import { getRecommendedEvents, getCampusPresence, updateCampusPresence, clearCampusPresence } from '@/services/flinders';
import { hydratePreferences, updatePreferences } from '@/lib/preferences';
import OnboardingTour from '@/components/OnboardingTour';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

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
const APP_SOFT_REFRESH_EVENT = 'app-soft-refresh';

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

const FLINAP_CAMPUSES = [
  { key: 'city', label: 'City Campus', shortLabel: 'City', accent: 'from-indigo-500 to-blue-600', light: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { key: 'bedford', label: 'Bedford Park', shortLabel: 'Bedford', accent: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { key: 'tonsley', label: 'Tonsley', shortLabel: 'Tonsley', accent: 'from-amber-500 to-orange-600', light: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'off_campus', label: 'Off Campus', shortLabel: 'Off Campus', accent: 'from-slate-500 to-slate-700', light: 'bg-slate-50 border-slate-200 text-slate-700' },
];

const FLINAP_GEOFENCES = {
  city: { lat: -34.9212, lng: 138.5967, radiusKm: 1.2 },
  bedford: { lat: -35.0212, lng: 138.5711, radiusKm: 1.8 },
  tonsley: { lat: -35.0069, lng: 138.5717, radiusKm: 1.0 },
};

const FLINAP_ACTIVITY_OPTIONS = [
  { key: 'study', label: 'Study', chip: 'bg-blue-50 border-blue-200 text-blue-700' },
  { key: 'meal', label: 'Meal', chip: 'bg-orange-50 border-orange-200 text-orange-700' },
  { key: 'coffee', label: 'Coffee', chip: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'team_up', label: 'Team Up', chip: 'bg-violet-50 border-violet-200 text-violet-700' },
  { key: 'quiet', label: 'Quiet', chip: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

function getCampusMeta(campusKey) {
  return FLINAP_CAMPUSES.find((campus) => campus.key === campusKey) || FLINAP_CAMPUSES[0];
}

function formatPresenceTime(value) {
  if (!value) return 'just now';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getActivityMeta(activityKey) {
  return FLINAP_ACTIVITY_OPTIONS.find((item) => item.key === activityKey) || FLINAP_ACTIVITY_OPTIONS[0];
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectCampusFromCoords(latitude, longitude) {
  const matches = Object.entries(FLINAP_GEOFENCES)
    .map(([campus, fence]) => ({
      campus,
      distanceKm: haversineKm(latitude, longitude, fence.lat, fence.lng),
      radiusKm: fence.radiusKm,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const match = matches.find((entry) => entry.distanceKm <= entry.radiusKm);
  return match?.campus || 'off_campus';
}

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
          <h3 className="line-clamp-2 break-words text-[13px] font-bold leading-snug text-slate-800 transition-colors group-hover:text-amber-700 sm:text-[14px]">
            {title}
          </h3>
        </a>
        <div className="mt-1.5 space-y-1">
          {timeDisplay && (
            <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
              <Clock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
              <span className="break-words leading-snug">{timeDisplay}</span>
            </div>
          )}
          {location && (
            <div className="flex min-w-0 items-start gap-1.5 text-[11px] text-slate-500">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 break-words leading-snug hover:text-blue-600 hover:underline"
                >
                  {location}
                </a>
              ) : (
                <span className="line-clamp-2 break-words leading-snug">{location}</span>
              )}
            </div>
          )}
          {cost && (
            <div className={`flex items-start gap-1.5 text-[11px] font-medium ${cost.toLowerCase().includes('free') ? 'text-emerald-600' : 'text-amber-600'}`}>
              <span className="mt-0.5 shrink-0">{cost.toLowerCase().includes('free') ? '✓' : '$'}</span>
              <span className="break-words leading-snug">{cost}</span>
            </div>
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

function FlinapPanel({ currentUserId }) {
  const [presenceData, setPresenceData] = useState({
    campuses: { city: [], bedford: [], tonsley: [], off_campus: [] },
    my_presence: null,
    stale_after_hours: 6,
  });
  const [selectedCampus, setSelectedCampus] = useState('city');
  const [selectedActivity, setSelectedActivity] = useState('study');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const fetchPresence = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getCampusPresence();
      setPresenceData({
        campuses: data?.campuses || { city: [], bedford: [], tonsley: [], off_campus: [] },
        my_presence: data?.my_presence || null,
        stale_after_hours: data?.stale_after_hours || 6,
      });
      if (data?.my_presence?.campus) {
        setSelectedCampus(data.my_presence.campus);
      }
      if (data?.my_presence?.activity_status) {
        setSelectedActivity(data.my_presence.activity_status);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Flinap');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresence();
  }, [fetchPresence]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchPresence({ silent: true });
    }, 45000);
    return () => window.clearInterval(intervalId);
  }, [fetchPresence]);

  const handleShareCampus = async (campus, source = 'manual') => {
    setSyncing(true);
    setError('');
    setStatusMessage('');
    try {
      const nextPresence = await updateCampusPresence({ campus, source, activity_status: selectedActivity });
      setPresenceData((prev) => ({
        ...prev,
        my_presence: nextPresence,
      }));
      setSelectedCampus(campus);
      setStatusMessage(`${getCampusMeta(campus).label} · ${getActivityMeta(selectedActivity).label} is now shared on Flinap.`);
      fetchPresence({ silent: true });
    } catch (err) {
      setError(err.message || 'Failed to share your campus');
    } finally {
      setSyncing(false);
    }
  };

  const handleHidePresence = async () => {
    setSyncing(true);
    setError('');
    setStatusMessage('');
    try {
      await clearCampusPresence();
      setPresenceData((prev) => ({
        ...prev,
        my_presence: null,
      }));
      setStatusMessage('Your Flinap presence is now hidden.');
      fetchPresence({ silent: true });
    } catch (err) {
      setError(err.message || 'Failed to hide your campus');
    } finally {
      setSyncing(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    setLocating(true);
    setError('');
    setStatusMessage('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const campus = detectCampusFromCoords(position.coords.latitude, position.coords.longitude);
        setSelectedCampus(campus);
        await handleShareCampus(campus, 'gps');
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
        setError(geoError.message || 'Could not read your current location.');
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const totalVisible = Object.values(presenceData.campuses || {}).reduce((sum, list) => sum + list.length, 0);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Flinap</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                Only the campus label is shared. Exact coordinates stay in your browser and never get saved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchPresence()}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FLINAP_CAMPUSES.map((campus) => {
              const count = presenceData.campuses?.[campus.key]?.length || 0;
              return (
                <div key={campus.key} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${campus.light}`}>
                  {campus.shortLabel} {count}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FLINAP_CAMPUSES.map((campus) => {
            const members = presenceData.campuses?.[campus.key] || [];
            return (
              <div key={campus.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className={`bg-gradient-to-r ${campus.accent} px-4 py-3`}>
                  <div className="flex items-center justify-between gap-3 text-white">
                    <div>
                      <p className="text-sm font-bold">{campus.label}</p>
                      <p className="text-[11px] text-white/75">{members.length} studying here</p>
                    </div>
                    <MapPin className="h-4 w-4 text-white/80" />
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {members.length > 0 ? members.map((member) => (
                    <div key={member.user_id} className={`rounded-xl border px-3 py-2 ${member.is_me ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {member.full_name}
                          {member.is_me ? ' (You)' : ''}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400">{formatPresenceTime(member.updated_at)}</span>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getActivityMeta(member.activity_status).chip}`}>
                          {getActivityMeta(member.activity_status).label}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                      Nobody visible here yet
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Share My Campus</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Let others know which campus you are at without exposing your exact location.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">My Status</p>
          {presenceData.my_presence ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-bold text-slate-900">{getCampusMeta(presenceData.my_presence.campus).label}</p>
              <p className="text-[12px] text-slate-500">
                Shared {formatPresenceTime(presenceData.my_presence.updated_at)} via {presenceData.my_presence.source === 'gps' ? 'current location' : 'manual selection'}
              </p>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getActivityMeta(presenceData.my_presence.activity_status).chip}`}>
                {getActivityMeta(presenceData.my_presence.activity_status).label}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">You are currently hidden from Flinap.</p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Choose Campus</p>
          <div className="grid gap-2">
            {FLINAP_CAMPUSES.map((campus) => (
              <button
                key={campus.key}
                type="button"
                onClick={() => setSelectedCampus(campus.key)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  selectedCampus === campus.key ? `${campus.light} ring-1 ring-current/20` : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-semibold">{campus.label}</p>
                <p className="text-[11px] opacity-70">
                  {campus.key === 'off_campus' ? 'Shown as away from campus' : `Visible in the ${campus.shortLabel} list`}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">What Are You Up For?</p>
          <div className="flex flex-wrap gap-2">
            {FLINAP_ACTIVITY_OPTIONS.map((activity) => (
              <button
                key={activity.key}
                type="button"
                onClick={() => setSelectedActivity(activity.key)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                  selectedActivity === activity.key ? activity.chip : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {activity.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <Button
            type="button"
            onClick={() => handleShareCampus(selectedCampus, 'manual')}
            disabled={syncing || locating}
            className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          >
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Share {getCampusMeta(selectedCampus).shortLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleUseMyLocation}
            disabled={locating || syncing}
            className="h-11 rounded-xl"
          >
            {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
            Use My Location
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleHidePresence}
            disabled={syncing || locating || !presenceData.my_presence}
            className="h-11 rounded-xl"
          >
            <EyeOff className="mr-2 h-4 w-4" />
            Hide Me
          </Button>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Privacy</p>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-800">
            Flinap only shows a campus-level label to other students. Exact coordinates are converted in the browser first and are not stored on the server.
          </p>
          <p className="mt-2 text-[11px] text-amber-700">Visible now: {totalVisible} students</p>
        </div>
      </aside>
    </div>
  );
}

export default function FlindersLifePage() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!preferencesReady) return undefined;
    const handleSoftRefresh = () => {
      fetchEvents(selectedInterests);
    };
    window.addEventListener(APP_SOFT_REFRESH_EVENT, handleSoftRefresh);
    return () => window.removeEventListener(APP_SOFT_REFRESH_EVENT, handleSoftRefresh);
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
  const eventMatchesInterests = useCallback((event, interests) => {
    if (!interests.length) return true;
    const categories = Array.isArray(event.categories) ? event.categories : [];
    return interests.some((interest) => categories.includes(interest));
  }, []);
  const filteredAllEvents = useMemo(
    () => sortByDate(eventData.all.filter((event) => eventMatchesInterests(event, selectedInterests))),
    [eventData.all, eventMatchesInterests, selectedInterests]
  );
  const filteredFavoriteEvents = useMemo(
    () => favoriteEvents.filter((event) => eventMatchesInterests(event, selectedInterests)),
    [eventMatchesInterests, favoriteEvents, selectedInterests]
  );

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
        <div className="-mx-1 mb-4 overflow-x-auto px-1">
          <TabsList className="w-max min-w-full justify-start gap-1 sm:w-full sm:justify-center">
            <TabsTrigger value="events" className="shrink-0 gap-1.5 px-3 text-xs sm:text-sm" data-tutorial="flinders-tab-events"><Calendar className="h-4 w-4" />Events</TabsTrigger>
            <TabsTrigger value="flinap" className="shrink-0 gap-1.5 px-3 text-xs sm:text-sm"><Users className="h-4 w-4" />Flinap</TabsTrigger>
            <TabsTrigger value="academic-calendar" className="shrink-0 gap-1.5 px-3 text-xs sm:text-sm" data-tutorial="flinders-tab-academic-calendar"><Calendar className="h-4 w-4" />Academic Calendar</TabsTrigger>
            <TabsTrigger value="study-rooms" className="shrink-0 gap-1.5 px-3 text-xs sm:text-sm" data-tutorial="flinders-tab-study-rooms"><BookOpen className="h-4 w-4" />Study Rooms</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Events ── */}
        <TabsContent value="events" data-tutorial="flinders-panel-events">
          {eventsLoading ? <LoadingState tutorialId="flinders-events-loading" /> : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" data-tutorial="flinders-events-content">
              <div className="space-y-4">
              {showFavorites && (
                <div data-tutorial="flinders-events-favorites">
                  <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />Favorites
                  </h2>
                  {filteredFavoriteEvents.length > 0 ? (
                    <div className="space-y-1.5">
                      {sortByDate(filteredFavoriteEvents).map((e) => <EventRow key={e.id} event={e} isFavorite onToggleFavorite={toggleFavorite} />)}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">Your favorited events will appear here</p>}
                </div>
              )}

              {eventData.all.length > 0 && (
                <div data-tutorial="flinders-events-all">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">All Events</h2>
                      <p className="text-[11px] text-slate-500">
                        {selectedInterests.length > 0
                          ? `${filteredAllEvents.length} filtered events`
                          : `${eventData.all.length} upcoming events`}
                      </p>
                    </div>
                    <button
                      onClick={() => setAllEventsExpanded((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-amber-200 hover:text-amber-700"
                    >
                      {allEventsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {allEventsExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  {allEventsExpanded && (
                    <div className="space-y-1.5">
                      {filteredAllEvents.map((e) => <EventRow key={e.id} event={e} isFavorite={favorites.includes(String(e.id))} onToggleFavorite={toggleFavorite} />)}
                    </div>
                  )}
                </div>
              )}

              {eventData.all.length > 0 && selectedInterests.length > 0 && filteredAllEvents.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">No events match the current filters.</p>
                </div>
              )}

              {eventData.all.length === 0 && <EmptyState icon={Calendar} message="No upcoming events. Check back later!" />}
              </div>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4" data-tutorial="flinders-events-interest-picker">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Filter Events</h2>
                    <p className="mt-1 text-[11px] text-slate-500">Start with all events, then narrow by category.</p>
                  </div>
                  {favorites.length > 0 && (
                    <button
                      onClick={() => setShowFavorites((v) => !v)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-all ${
                        showFavorites ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      <Star className={`h-3 w-3 ${showFavorites ? 'fill-amber-400 text-amber-500' : ''}`} />
                      {showFavorites ? 'Favorites On' : 'Favorites'}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 lg:flex-col lg:items-stretch">
                  {INTEREST_CATEGORIES.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-all lg:flex lg:items-center lg:justify-between ${
                        selectedInterests.includes(interest)
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700'
                      }`}
                    >
                      <span>{interest}</span>
                      {selectedInterests.includes(interest) && <span className="hidden text-[10px] lg:inline">On</span>}
                    </button>
                  ))}
                </div>
                {selectedInterests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInterests([]);
                      updatePreferences({ flinders_interests: [] }).catch(() => {});
                      fetchEvents([]);
                    }}
                    className="mt-3 text-[11px] font-semibold text-slate-500 hover:text-amber-700"
                  >
                    Clear filters
                  </button>
                )}
                {selectedInterests.length > 0 && eventData.recommended.length > 0 && (
                  <div data-tutorial="flinders-events-recommended" className="mt-4 border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-bold text-slate-800">Recommended Picks</h3>
                    <div className="mt-2 space-y-1.5">
                      {sortByDate(eventData.recommended).slice(0, 4).map((e) => <EventRow key={e.id} event={e} isFavorite={favorites.includes(String(e.id))} onToggleFavorite={toggleFavorite} />)}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}
        </TabsContent>

        <TabsContent value="flinap">
          <FlinapPanel currentUserId={user?.id || null} />
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
