import React, { useState } from 'react';
import { DayButton, DayPicker } from 'react-day-picker';
import { addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

const categoryColors = {
  meeting: '#3b82f6',
  presentation: '#a855f7',
  deadline: '#ef4444',
  study: '#10b981',
  lecture: '#4f46e5',
  social: '#f59e0b',
  other: '#94a3b8',
};

export default function ScheduleCalendar({ events = [], selectedDate, onSelectDate, onDateClick }) {
  const [month, setMonth] = useState(new Date());

  const eventDateKeys = new Set(
    events
      .map((event) => event.date || event.start_time)
      .filter(Boolean)
      .map((value) => format(new Date(value), 'yyyy-MM-dd'))
  );
  const eventMarkersByDate = events.reduce((map, event) => {
    const rawDate = event.date || event.start_time;
    if (!rawDate) return map;

    const dateKey = format(new Date(rawDate), 'yyyy-MM-dd');
    const color = categoryColors[event.category] || categoryColors.other;
    const existing = map.get(dateKey) || [];

    if (!existing.includes(color)) {
      existing.push(color);
    }

    map.set(dateKey, existing.slice(0, 3));
    return map;
  }, new Map());

  const hasEvent = (date) => eventDateKeys.has(format(date, 'yyyy-MM-dd'));

  const EventDayButton = (props) => {
    const { modifiers, day, className, children, ...buttonProps } = props;
    const dateKey = format(day.date, 'yyyy-MM-dd');
    const markerColors = eventMarkersByDate.get(dateKey) || [];

    return (
      <DayButton
        {...buttonProps}
        day={day}
        modifiers={modifiers}
        className={cn(className, 'relative flex h-9 w-9 items-center justify-center')}
      >
        <span className="relative inline-flex items-center justify-center">
          <span>{children}</span>
          {markerColors.length > 0 && (
            <span className="absolute left-1/2 top-[1.5rem] flex -translate-x-1/2 items-center gap-0.5" aria-hidden="true">
              {markerColors.map((color) => (
                <span
                  key={color}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          )}
        </span>
      </DayButton>
    );
  };

  const modifiers = {
    hasEvent,
  };

  const modifiersStyles = {
    hasEvent: {
      fontWeight: 700,
      backgroundColor: 'rgba(59, 130, 246, 0.10)',
      color: '#0f172a',
      borderRadius: '0.65rem',
      boxShadow: 'inset 0 -2px 0 rgba(59, 130, 246, 0.18)',
    },
  };

  const handleSelect = (date) => {
    onSelectDate?.(date);
    onDateClick?.(date);
  };

  return (
    <div className="rounded-md border p-3">
      {/* Custom month navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid - hide built-in nav */}
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={handleSelect}
        month={month}
        onMonthChange={setMonth}
        hideNavigation
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        components={{
          DayButton: EventDayButton,
        }}
        footer={eventDateKeys.size > 0 ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {Object.entries(categoryColors).slice(0, 3).map(([key, color]) => (
                <span key={key} className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </span>
            Event dates use the same colors as the schedule cards
          </div>
        ) : null}
        showOutsideDays
        classNames={{
          months: 'flex flex-col',
          month: 'space-y-2',
          month_caption: 'hidden',
          month_grid: 'w-full border-collapse space-y-1',
          weekdays: 'flex',
          weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
          week: 'flex w-full mt-2',
          day: 'h-9 w-9 text-center text-sm p-0 relative',
          day_button: cn(
            buttonVariants({ variant: 'ghost' }),
            'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
          ),
          selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md',
          today: 'bg-accent text-accent-foreground rounded-md',
          outside: 'text-muted-foreground opacity-50',
          disabled: 'text-muted-foreground opacity-50',
          hidden: 'invisible',
        }}
      />
    </div>
  );
}
