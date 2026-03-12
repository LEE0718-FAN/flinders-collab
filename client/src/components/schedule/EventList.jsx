import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Clock, Trash2, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { deleteEvent } from '@/services/events';

export default function EventList({ events = [], roomId, onUpdated }) {
  const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const handleDelete = async (eventId) => {
    try {
      await deleteEvent(roomId, eventId);
      onUpdated?.();
    } catch {
      // silently fail
    }
  };

  if (sorted.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No upcoming events</p>;
  }

  return (
    <div className="space-y-3">
      {sorted.map((event) => {
        const dt = new Date(event.start_time);
        return (
          <Card key={event.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{event.title}</p>
                  {event.category && event.category !== 'other' && (
                    <Badge variant="secondary" className="text-xs capitalize">{event.category}</Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(dt, 'MMM d, yyyy h:mm a')}
                  </span>
                  {event.location_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location_name}
                    </span>
                  )}
                </div>
                {event.description && <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>}
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(event.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
