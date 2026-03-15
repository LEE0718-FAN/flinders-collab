import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, Newspaper, BookOpen, ExternalLink, Loader2, ChevronDown, ChevronUp, MapPin, ArrowRight } from 'lucide-react';
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
    return format(parseISO(dateStr), 'MMM d, yyyy');
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
  'IT & Computing': 'bg-blue-100 text-blue-700',
  'Engineering': 'bg-orange-100 text-orange-700',
  'Health & Medicine': 'bg-rose-100 text-rose-700',
  'Business & Law': 'bg-purple-100 text-purple-700',
  'Education': 'bg-emerald-100 text-emerald-700',
  'Arts & Creative': 'bg-pink-100 text-pink-700',
  'Science': 'bg-cyan-100 text-cyan-700',
  'Career': 'bg-amber-100 text-amber-700',
  'General': 'bg-slate-100 text-slate-600',
};

function RecommendedEventCard({ event }) {
  const title = stripHtml(event.title);
  const excerpt = stripHtml(event.excerpt);

  return (
    <a
      href={event.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {event.categories?.map((cat) => (
            <span
              key={cat}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['General']}`}
            >
              {cat}
            </span>
          ))}
        </div>
        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-amber-700 transition-colors">
          {title}
        </h3>
        {event.date && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDate(event.date)}
          </p>
        )}
        {excerpt && (
          <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">{excerpt}</p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-600 group-hover:text-amber-700">
          View <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </a>
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

function CampusCard({ name, subtitle, link, note }) {
  return (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500">
          <MapPin className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{name}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {note && (
        <p className="text-xs text-slate-400 mb-3">{note}</p>
      )}
      <a href={link} target="_blank" rel="noopener noreferrer">
        <Button className="w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold shadow hover:from-emerald-600 hover:to-teal-700 transition-all text-sm">
          <BookOpen className="h-4 w-4" />
          Book
          <ExternalLink className="h-3.5 w-3.5 ml-1" />
        </Button>
      </a>
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
  const [allEventsExpanded, setAllEventsExpanded] = useState(false);

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
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-500 mb-2">Your interests</p>
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

          {eventsLoading ? (
            <LoadingState />
          ) : (
            <div className="space-y-8">
              {/* Recommended for You */}
              {selectedInterests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    Select your interests above to get personalized event recommendations
                  </p>
                </div>
              ) : eventData.recommended.length > 0 ? (
                <div>
                  <h2 className="text-base font-bold text-slate-800 mb-3">Recommended for You</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {eventData.recommended.map((event) => (
                      <RecommendedEventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-base font-bold text-slate-800 mb-3">Recommended for You</h2>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm text-slate-500">No events match your selected interests right now. Check back later!</p>
                  </div>
                </div>
              )}

              {/* Career & Employment */}
              {eventData.career.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-slate-800 mb-3">Career & Employment</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {eventData.career.map((event) => (
                      <RecommendedEventCard key={event.id} event={event} />
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
                    {allEventsExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {allEventsExpanded && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {eventData.all.map((event) => (
                        <RecommendedEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {eventData.all.length === 0 && eventData.recommended.length === 0 && eventData.career.length === 0 && (
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Book a Study Room</h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
                Reserve study rooms and collaborative spaces at Flinders University libraries
                through LibCal. Rooms can be booked up to 14 days in advance.
              </p>
            </div>

            {/* Campus cards */}
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <CampusCard
                name="Bedford Park Campus"
                subtitle="Main campus library"
                link="https://flinders.libcal.com/spaces"
              />
              <CampusCard
                name="Victoria Square / City Campus"
                subtitle="City campus library"
                link="https://flinders.libcal.com/spaces"
                note="Select 'City Campus' from the location filter"
              />
              <CampusCard
                name="Tonsley Campus"
                subtitle="Tonsley campus library"
                link="https://flinders.libcal.com/spaces"
                note="Select 'Tonsley' from the location filter"
              />
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
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
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
