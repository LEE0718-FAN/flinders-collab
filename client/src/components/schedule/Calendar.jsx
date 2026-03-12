import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { isSameDay, addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function ScheduleCalendar({ events = [], selectedDate, onSelectDate, onDateClick }) {
  const [month, setMonth] = useState(new Date());

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
