import React, { useState, useEffect } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, Newspaper, BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { getFlindersEvents, getFlindersNews } from '@/services/flinders';
import { format, parseISO } from 'date-fns';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr || '';
  }
}

function EventCard({ event }) {
  const title = stripHtml(event.title);
  const excerpt = stripHtml(event.excerpt);

  return (
    <a
      href={event.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      {event.image && (
        <div className="h-40 w-full overflow-hidden bg-slate-100">
          <img
            src={event.image}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-4">
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 mb-3" />
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
          <p className="mt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed">{excerpt}</p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-600 group-hover:text-amber-700">
          View event <ExternalLink className="h-3 w-3" />
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

export default function FlindersLifePage() {
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    getFlindersEvents()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));

    getFlindersNews()
      .then((data) => setNews(Array.isArray(data) ? data : []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

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
          {eventsLoading ? (
            <LoadingState />
          ) : events.length === 0 ? (
            <EmptyState icon={Calendar} message="No events available right now. Check back later!" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
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
            <div className="mx-auto max-w-lg text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Book a Study Room</h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Reserve study rooms and collaborative spaces at Flinders University libraries
                through LibCal. Rooms are available across all campus libraries and can be booked
                up to 14 days in advance.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <a
                  href="https://flinders.libcal.com/spaces"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-base font-semibold shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all">
                    <BookOpen className="h-5 w-5" />
                    Book Now
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </Button>
                </a>
                <p className="text-xs text-slate-400">Opens Flinders LibCal in a new tab</p>
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-slate-50 p-4">
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
