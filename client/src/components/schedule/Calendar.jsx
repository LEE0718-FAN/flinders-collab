import React, { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const categoryColors = {
  meeting: '#3b82f6',
  submission: '#ec4899',
  quiz: '#06b6d4',
  exam: '#f43f5e',
  presentation: '#a855f7',
  deadline: '#ef4444',
  study: '#10b981',
  lecture: '#4f46e5',
  social: '#f59e0b',
  other: '#94a3b8',
};

export default function ScheduleCalendar({ events = [], selectedDate, onSelectDate, onDateClick, onAddEvent, onDismissPrompt, roomId }) {
  const [month, setMonth] = useState(new Date());
  const [addPrompt, setAddPrompt] = useState(null); // date to show "add event?" prompt

  // Reset to current month when room changes
  useEffect(() => {
    setMonth(new Date());
    setAddPrompt(null);
  }, [roomId]);

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
        className={cn(className, 'flex h-10 w-10 sm:h-9 sm:w-9 flex-col items-center justify-center gap-0.5 overflow-visible rounded-xl transition-all duration-150 hover:bg-blue-50')}
      >
        <span className="leading-none">{children}</span>
        {markerColors.length > 0 && (
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {markerColors.map((color) => (
              <span
                key={color}
                className="h-1.5 w-1.5 rounded-full"
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
    // Show add event prompt
    setAddPrompt(date);
  };

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-blue-500/5 overflow-visible">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-white hover:bg-white/20 transition-colors duration-150"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-bold tracking-wide text-white">{format(month, 'MMMM yyyy')}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-white hover:bg-white/20 transition-colors duration-150"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar body */}
      <div className="bg-white rounded-b-2xl p-4">
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
          weekday: 'w-10 sm:w-9 rounded-md text-[0.75rem] font-bold uppercase tracking-wider text-blue-600/60',
          week: 'mt-2 flex w-full',
          day: 'relative h-10 w-10 sm:h-9 sm:w-9 p-0 text-center text-sm',
          day_button: cn(
            buttonVariants({ variant: 'ghost' }),
            'h-10 w-10 sm:h-9 sm:w-9 p-0 font-normal rounded-xl transition-all duration-150 aria-selected:opacity-100'
          ),
          selected: 'rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white font-bold',
          today: 'rounded-xl bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-200',
          outside: 'text-slate-300 opacity-50',
          disabled: 'text-muted-foreground opacity-50',
          hidden: 'invisible',
        }}
      />
      </div>

      {/* Add event prompt - appears below calendar */}
      {addPrompt && (
        <div className="border-t border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-b-2xl px-4 py-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                {format(addPrompt, 'MMM d, EEEE')}
              </p>
              <p className="text-xs text-slate-500">Add a new event?</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-xs gap-1"
                onClick={() => {
                  onAddEvent?.(addPrompt);
                  setAddPrompt(null);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={() => { setAddPrompt(null); onDismissPrompt?.(); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
