import React from 'react';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { isSameDay } from 'date-fns';

export default function ScheduleCalendar({ events = [], selectedDate, onSelectDate }) {
  const eventDates = events.map((e) => new Date(e.date || e.start_time));

  const modifiers = {
    hasEvent: (date) => eventDates.some((d) => isSameDay(d, date)),
  };

  const modifiersStyles = {
    hasEvent: {
      fontWeight: 'bold',
      textDecoration: 'underline',
      textDecorationColor: 'hsl(174, 60%, 40%)',
    },
  };

  return (
    <CalendarUI
      mode="single"
      selected={selectedDate}
      onSelect={onSelectDate}
      modifiers={modifiers}
      modifiersStyles={modifiersStyles}
      className="rounded-md border"
    />
  );
}
