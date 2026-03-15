import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, Newspaper, BookOpen, ExternalLink, Loader2, ChevronDown, ChevronUp, MapPin, ArrowRight, Star, Clock, Ticket } from 'lucide-react';
import { getFlindersNews, getRecommendedEvents } from '@/services/flinders';
import { format, parseISO } from 'date-fns';

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

function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy (EEE)');
  } catch {
    return dateStr || '';
  }
}

function formatTime(dateStr) {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return '';
  }
}

const INTEREST_CATEGORIES = [
  'IT & Computing',
  'Engineering',
  'Health & Medicine',
  'Business & Law',
  'Education',
  'Arts & Creative',
  'Science',
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

function EventRow({ event, isFavorite, onToggleFavorite }) {
  const title = stripHtml(event.title);
  const excerpt = stripHtml(event.excerpt);
  const location = event.location ? stripHtml(event.location) : '';
  const cost = event.cost || '';

  const timeStr = (() => {
    if (!event.start_time && !event.date) return '';
    const src = event.start_time || event.date;
    try {
      const startFmt = format(parseISO(src), 'h:mm a');
      if (event.end_time) {
        const endFmt = format(parseISO(event.end_time), 'h:mm a');
        return `${startFmt} - ${endFmt}`;
      }
      return startFmt;
    } catch {
      return '';
    }
  })();

  const dateStr = event.start_time || event.date;

  const mapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 hover:shadow-md hover:border-slate-300 transition-all group">
      {/* Date badge */}
      <div className="shrink-0 text-center w-12">
        <div className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white px-1.5 py-1 shadow-sm">
          <p className="text-[9px] font-bold uppercase leading-none">{dateStr ? format(parseISO(dateStr), 'MMM') : ''}</p>
          <p className="text-base font-black leading-tight">{dateStr ? format(parseISO(dateStr), 'd') : ''}</p>
        </div>
        <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{dateStr ? format(parseISO(dateStr), 'EEE') : ''}</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1 mb-1">
          {event.categories?.map((cat) => (
            <span
              key={cat}
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold border ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['General']}`}
            >
              {cat}
            </span>
          ))}
          {cost && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold border ${
              cost.toLowerCase() === 'free' || cost.toLowerCase().includes('free')
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
            }`}>
              <Ticket className="h-2.5 w-2.5" />
              {cost}
            </span>
          )}
        </div>
        <a href={event.link} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className="text-[13px] font-bold text-slate-800 group-hover:text-amber-700 transition-colors leading-snug line-clamp-1">
            {title}
          </h3>
        </a>

        {/* Time & Location row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {timeStr && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3 text-slate-400" />
              {timeStr}
            </span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 min-w-0">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline truncate">
                  {location}
                </a>
              ) : (
                <span className="truncate">{location}</span>
              )}
            </span>
          )}
        </div>

        {excerpt && (
          <p className="mt-1 text-[11px] text-slate-400 line-clamp-1 leading-relaxed">{excerpt}</p>
        )}
      </div>

      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(event.id); }}
        className={`shrink-0 mt-0.5 p-1 rounded-full transition-all ${
          isFavorite
            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
            : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
        }`}
      >
        <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
      </button>
    </div>
  );
}

function NewsCard({ article }) {
  const title = stripHtml(article.title);
  const excerpt = stripHtml(article.excerpt);

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      {article.image && (
        <div className="h-36 w-full overflow-hidden bg-slate-100">
          <img
            src={article.image}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {title}
        </h3>
        {article.date && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDate(article.date)}
          </p>
        )}
        {excerpt && (
          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">{excerpt}</p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-700">
          Read more <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
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
  const [news, setNews] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState(() => {
    try {
      const saved = localStorage.getItem('flinders-interests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('flinders-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [allEventsExpanded, setAllEventsExpanded] = useState(false);
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
    fetchEvents(selectedInterests);

    getFlindersNews()
      .then((data) => setNews(Array.isArray(data) ? data : []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest];
      localStorage.setItem('flinders-interests', JSON.stringify(next));
      fetchEvents(next);
      return next;
    });
  };

  const toggleFavorite = (eventId) => {
    setFavorites((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      localStorage.setItem('flinders-favorites', JSON.stringify(next));
      return next;
    });
  };

  const favoriteEvents = eventData.all.filter((e) => favorites.includes(e.id));

  const sortByDate = (events) => [...events].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  return (
    <MainLayout>
      {/* Hero section */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 px-5 py-6 shadow-lg sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.15) 0%, transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Flinders Life</h1>
            <p className="mt-0.5 text-xs text-white/80">Events, news, and study resources</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="events" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5">
            <Newspaper className="h-4 w-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="study-rooms" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Study Rooms
          </TabsTrigger>
        </TabsList>

        {/* Events tab */}
        <TabsContent value="events">
          {/* Interest chips */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-slate-500 mb-1.5">Select interests for recommendations</p>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_CATEGORIES.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Favorites toggle */}
          {favorites.length > 0 && (
            <button
              onClick={() => setShowFavorites((v) => !v)}
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                showFavorites
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-amber-200'
              }`}
            >
              <Star className={`h-3 w-3 ${showFavorites ? 'fill-amber-400 text-amber-500' : ''}`} />
              Favorites ({favorites.length})
            </button>
          )}

          {eventsLoading ? (
            <LoadingState />
          ) : (
            <div className="space-y-4">
              {/* Favorites section */}
              {showFavorites && (
                <div>
                  <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    Favorites
                  </h2>
                  {favoriteEvents.length > 0 ? (
                    <div className="space-y-1.5">
                      {sortByDate(favoriteEvents).map((event) => (
                        <EventRow key={event.id} event={event} isFavorite onToggleFavorite={toggleFavorite} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Your favorited events will appear here</p>
                  )}
                </div>
              )}

              {/* Recommended for You */}
              {selectedInterests.length > 0 && eventData.recommended.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-800 mb-2">Recommended for You</h2>
                  <div className="space-y-1.5">
                    {sortByDate(eventData.recommended).map((event) => (
                      <EventRow key={event.id} event={event} isFavorite={favorites.includes(event.id)} onToggleFavorite={toggleFavorite} />
                    ))}
                  </div>
                </div>
              )}

              {selectedInterests.length > 0 && eventData.recommended.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">No events match your selected interests right now.</p>
                </div>
              )}

              {/* Career & Employment */}
              {eventData.career.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-800 mb-2">Career & Employment</h2>
                  <div className="space-y-1.5">
                    {sortByDate(eventData.career).map((event) => (
                      <EventRow key={event.id} event={event} isFavorite={favorites.includes(event.id)} onToggleFavorite={toggleFavorite} />
                    ))}
                  </div>
                </div>
              )}

              {/* All Events (collapsible) */}
              {eventData.all.length > 0 && (
                <div>
                  <button
                    onClick={() => setAllEventsExpanded((prev) => !prev)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2 hover:text-amber-700 transition-colors"
                  >
                    All Events ({eventData.all.length})
                    {allEventsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {allEventsExpanded && (
                    <div className="space-y-1.5">
                      {sortByDate(eventData.all).map((event) => (
                        <EventRow key={event.id} event={event} isFavorite={favorites.includes(event.id)} onToggleFavorite={toggleFavorite} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {eventData.all.length === 0 && (
                <EmptyState icon={Calendar} message="No events available right now. Check back later!" />
              )}
            </div>
          )}
        </TabsContent>

        {/* News tab */}
        <TabsContent value="news">
          {newsLoading ? (
            <LoadingState />
          ) : news.length === 0 ? (
            <EmptyState icon={Newspaper} message="No student news available right now." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Study Rooms tab */}
        <TabsContent value="study-rooms">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* City Campus */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">City Campus</h2>
                    <p className="text-[11px] text-white/70">Victoria Square</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-500">Book study rooms at City Campus via Flinders ResourceBooker.</p>
                <a href="https://resourcebooker.flinders.edu.au/app/booking-types/e14fb159-2faf-411b-8125-70e08088b6f0" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 font-semibold shadow hover:from-indigo-600 hover:to-blue-700 transition-all text-sm py-3">
                    <BookOpen className="h-4 w-4" />
                    Book Study Room
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </a>
                <div className="rounded-lg bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">How to book:</h3>
                  <ol className="space-y-1 text-[11px] text-slate-500">
                    <li className="flex gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700">1</span>
                      Click the button above to open ResourceBooker
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700">2</span>
                      Log in with your Flinders (FAN) credentials
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700">3</span>
                      Select a room, date, and time slot
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Bedford Park & Tonsley */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Bedford Park & Tonsley</h2>
                    <p className="text-[11px] text-white/70">Library study rooms</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-500">Book study rooms at Bedford Park or Tonsley via Flinders LibCal.</p>
                <a href="https://flinders.libcal.com/spaces" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold shadow hover:from-emerald-600 hover:to-teal-700 transition-all text-sm py-3">
                    <BookOpen className="h-4 w-4" />
                    Book Study Room
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </a>
                <div className="rounded-lg bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">How to book:</h3>
                  <ol className="space-y-1 text-[11px] text-slate-500">
                    <li className="flex gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[9px] font-bold text-teal-700">1</span>
                      Click the button above to open LibCal
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[9px] font-bold text-teal-700">2</span>
                      Select a library location and date
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[9px] font-bold text-teal-700">3</span>
                      Choose a time slot and log in with FAN
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
