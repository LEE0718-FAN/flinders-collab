import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, Newspaper, BookOpen, ExternalLink, Loader2, ChevronDown, ChevronUp, MapPin, ArrowRight, Star } from 'lucide-react';
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

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-slate-300 transition-all group">
      {/* Date badge */}
      <div className="shrink-0 text-center w-14">
        <div className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white px-2 py-1.5 shadow-sm">
          <p className="text-[10px] font-bold uppercase leading-none">{event.date ? format(parseISO(event.date), 'MMM') : ''}</p>
          <p className="text-lg font-black leading-tight">{event.date ? format(parseISO(event.date), 'd') : ''}</p>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-medium">{event.date ? format(parseISO(event.date), 'EEE') : ''}</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1 mb-1.5">
          {event.categories?.map((cat) => (
            <span
              key={cat}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['General']}`}
            >
              {cat}
            </span>
          ))}
        </div>
        <a href={event.link} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors leading-snug">
            {title}
          </h3>
        </a>
        {excerpt && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">{excerpt}</p>
        )}
        <a href={event.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700">
          View details <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(event.id); }}
        className={`shrink-0 mt-1 p-1.5 rounded-full transition-all ${
          isFavorite
            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
            : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
        }`}
      >
        <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
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
        <div className="h-40 w-full overflow-hidden bg-slate-100">
          <img
            src={article.image}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-4">
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mb-3" />
        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {title}
        </h3>
        {article.date && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDate(article.date)}
          </p>
        )}
        {excerpt && (
          <p className="mt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed">{excerpt}</p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-700">
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

  // Sort events by date (ascending — soonest first)
  const sortByDate = (events) => [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <MainLayout>
      {/* Hero section */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 px-6 py-8 shadow-lg sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.15) 0%, transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Flinders Life</h1>
            <p className="mt-1 text-sm text-white/80">Events, news, and study resources for Flinders students</p>
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
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Select your interests for personalized recommendations</p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_CATEGORIES.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
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
              className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                showFavorites
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-amber-200'
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${showFavorites ? 'fill-amber-400 text-amber-500' : ''}`} />
              Favorites ({favorites.length})
            </button>
          )}

          {eventsLoading ? (
            <LoadingState />
          ) : (
            <div className="space-y-6">
              {/* Favorites section */}
              {showFavorites && (
                <div>
                  <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    Favorites
                  </h2>
                  {favoriteEvents.length > 0 ? (
                    <div className="space-y-2">
                      {sortByDate(favoriteEvents).map((event) => (
                        <EventRow key={event.id} event={event} isFavorite onToggleFavorite={toggleFavorite} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Your favorited events will appear here</p>
                  )}
                </div>
              )}

              {/* Recommended for You */}
              {selectedInterests.length > 0 && eventData.recommended.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-slate-800 mb-3">Recommended for You</h2>
                  <div className="space-y-2">
                    {sortByDate(eventData.recommended).map((event) => (
                      <EventRow key={event.id} event={event} isFavorite={favorites.includes(event.id)} onToggleFavorite={toggleFavorite} />
                    ))}
                  </div>
                </div>
              )}

              {selectedInterests.length > 0 && eventData.recommended.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-500">No events match your selected interests right now.</p>
                </div>
              )}

              {/* Career & Employment */}
              {eventData.career.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-slate-800 mb-3">Career & Employment</h2>
                  <div className="space-y-2">
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
                    className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3 hover:text-amber-700 transition-colors"
                  >
                    All Events ({eventData.all.length})
                    {allEventsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {allEventsExpanded && (
                    <div className="space-y-2">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Study Rooms tab */}
        <TabsContent value="study-rooms">
          <div className="space-y-6">
            {/* City Campus — ResourceBooker */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">City Campus (Victoria Square)</h2>
                    <p className="text-xs text-white/70">Book study rooms via Flinders ResourceBooker</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50" style={{ height: '600px' }}>
                  <iframe
                    src="https://resourcebooker.flinders.edu.au/app/booking-types/e14fb159-2faf-411b-8125-70e08088b6f0"
                    title="City Campus Study Room Booking"
                    className="w-full h-full border-0"
                    allow="fullscreen"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Log in with your Flinders (FAN) credentials to book. If the booking system doesn't load,{' '}
                  <a
                    href="https://resourcebooker.flinders.edu.au/app/booking-types/e14fb159-2faf-411b-8125-70e08088b6f0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    open it in a new tab
                  </a>.
                </p>
              </div>
            </div>

            {/* Other Campuses — LibCal */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Bedford Park & Tonsley</h2>
                  <p className="text-xs text-slate-500">Book via Flinders LibCal</p>
                </div>
              </div>
              <a href="https://flinders.libcal.com/spaces" target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold shadow hover:from-emerald-600 hover:to-teal-700 transition-all text-sm py-3">
                  <BookOpen className="h-4 w-4" />
                  Book Study Room
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Button>
              </a>

              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">How to book:</h3>
                <ol className="space-y-1.5 text-sm text-slate-500">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">1</span>
                    Select a library location and date
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">2</span>
                    Choose an available time slot
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">3</span>
                    Log in with your Flinders (FAN) credentials
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">4</span>
                    Confirm your booking — you will receive an email confirmation
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
