import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { deleteEvent } from '@/services/events';
import { getLocationStatus } from '@/services/location';
import LocationToggle from '@/components/location/LocationToggle';
import LocationMap from '@/components/location/LocationMap';
import { useAuth } from '@/hooks/useAuth';

const STATUS_LABEL = {
  on_the_way: 'On the way',
  arrived: 'Arrived',
  late: 'Late',
};

const categoryConfig = {
  meeting: { label: 'Meeting', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  lecture: { label: 'Lecture', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  deadline: { label: 'Deadline', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  study: { label: 'Study Session', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  social: { label: 'Social', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

export default function EventList({ events = [], roomId, onUpdated }) {
  const { user } = useAuth();
  const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const [expandedEventId, setExpandedEventId] = useState(null);
  const [locationData, setLocationData] = useState({});
  const [sharingEvents, setSharingEvents] = useState({});
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (eventId) => {
    setDeleteError('');
    try {
      await deleteEvent(roomId, eventId);
      onUpdated?.();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete event.');
    }
  };

  const fetchLocationForEvent = useCallback(async (eventId) => {
    try {
      const data = await getLocationStatus(eventId);
      const members = (Array.isArray(data) ? data : []).map((s) => ({
        id: s.id,
        user_id: s.user_id,
        name: s.users?.full_name || 'User',
        avatar_url: s.users?.avatar_url,
        latitude: s.latitude,
        longitude: s.longitude,
        status: s.status,
        updated_at: s.updated_at,
      }));
      setLocationData((prev) => ({ ...prev, [eventId]: members }));

      const mySession = members.find((m) => m.user_id === user?.id);
      setSharingEvents((prev) => ({
        ...prev,
        [eventId]: !!mySession && mySession.status !== 'stopped',
      }));
    } catch {
      setLocationData((prev) => ({ ...prev, [eventId]: [] }));
    }
  }, [user?.id]);

  const toggleMap = useCallback(
    (eventId) => {
      if (expandedEventId === eventId) {
        setExpandedEventId(null);
      } else {
        setExpandedEventId(eventId);
        fetchLocationForEvent(eventId);
      }
    },
    [expandedEventId, fetchLocationForEvent],
  );

  const handleSharingToggle = useCallback(
    (eventId) => (sharing) => {
      setSharingEvents((prev) => ({ ...prev, [eventId]: sharing }));
      setTimeout(() => fetchLocationForEvent(eventId), 500);
    },
    [fetchLocationForEvent],
  );

  if (sorted.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No upcoming events</p>;
  }

  return (
    <div className="space-y-3">
      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      {sorted.map((event) => {
        const dt = new Date(event.start_time);
        const locationName = event.location_name || event.location;
        const hasLocationSharing = !!event.enable_location_sharing;
        const isExpanded = expandedEventId === event.id;
        const members = locationData[event.id] || [];
        const iAmSharing = !!sharingEvents[event.id];
        const cat = categoryConfig[event.category] || categoryConfig.other;

        return (
          <Card key={event.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{event.title}</p>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 leading-4 border-0 ${cat.className}`}>
                      {cat.label}
                    </Badge>
                    {hasLocationSharing && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="mr-1 h-3 w-3" />
                        Location
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(dt, 'MMM d, yyyy h:mm a')}
                    </span>
                    {locationName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {locationName}
                      </span>
                    )}
                  </div>
                  {event.description && <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>}

                  {hasLocationSharing && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <LocationToggle
                        roomId={roomId}
                        eventId={event.id}
                        isSharing={iAmSharing}
                        onToggle={handleSharingToggle(event.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMap(event.id)}
                        className="text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" />
                            Hide Map
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" />
                            View Map{members.length > 0 ? ` (${members.length})` : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(event.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              {hasLocationSharing && isExpanded && (
                <div className="mt-4">
                  <LocationMap members={members.filter((m) => m.latitude != null && m.longitude != null)} />
                  {members.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {members.map((m) => (
                        <Badge key={m.id} variant="secondary" className="text-xs">
                          {m.name}
                          {m.status && STATUS_LABEL[m.status] && (
                            <span className="ml-1 opacity-70">— {STATUS_LABEL[m.status]}</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
