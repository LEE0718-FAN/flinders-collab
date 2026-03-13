import React, { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  const eventDateKeys = new Set(eventMarkersByDate.keys());
  const hasEvent = (date) => eventDateKeys.has(format(date, 'yyyy-MM-dd'));

  const EventDayButton = (props) => {
    const { modifiers, day, className, children, ...buttonProps } = props;
    const dateKey = format(day.date, 'yyyy-MM-dd');
    const markerColors = eventMarkersByDate.get(dateKey) || [];
    const buttonRef = useRef(null);

    useEffect(() => {
      if (modifiers.focused) {
        buttonRef.current?.focus();
      }
    }, [modifiers.focused]);

    return (
      <button
        {...buttonProps}
        ref={buttonRef}
        type="button"
        className={cn(className, 'flex h-9 w-9 flex-col items-center justify-center gap-0.5 overflow-visible rounded-xl transition-all duration-150 hover:bg-muted/60')}
      >
        <span className="leading-none">{children}</span>
        {markerColors.length > 0 && (
          <span className="flex items-center gap-[3px]" aria-hidden="true">
            {markerColors.map((color) => (
              <span
                key={color}
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </span>
        )}
      </button>
    );
  };

  const modifiers = {
    hasEvent,
  };

  const modifiersStyles = {
    hasEvent: {},
  };

  const handleSelect = (date) => {
    onSelectDate?.(date);
    onDateClick?.(date);
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted/70 transition-colors duration-150"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold tracking-wide">{format(month, 'MMMM yyyy')}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted/70 transition-colors duration-150"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

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
        showOutsideDays
        classNames={{
          months: 'flex flex-col',
          month: 'space-y-2',
          month_caption: 'hidden',
          month_grid: 'w-full border-collapse space-y-1',
          weekdays: 'flex',
          weekday: 'w-9 rounded-md text-[0.75rem] font-medium uppercase tracking-wider text-muted-foreground/70',
          week: 'mt-2 flex w-full',
          day: 'relative h-9 w-9 p-0 text-center text-sm',
          day_button: cn(
            buttonVariants({ variant: 'ghost' }),
            'h-9 w-9 p-0 font-normal rounded-xl transition-all duration-150 aria-selected:opacity-100'
          ),
          selected: 'rounded-xl bg-primary text-white shadow-sm hover:bg-primary hover:text-white focus:bg-primary focus:text-white',
          today: 'rounded-xl ring-1.5 ring-primary/30 text-primary font-semibold',
          outside: 'text-muted-foreground/40 opacity-50',
          disabled: 'text-muted-foreground opacity-50',
          hidden: 'invisible',
        }}
      />
    </div>
  );
}
