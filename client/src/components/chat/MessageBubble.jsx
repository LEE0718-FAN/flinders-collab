import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MessageBubble({ message, isOwn }) {
  const name = message.users?.full_name || message.sender_name || message.user_name || 'User';
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const time = message.created_at ? format(new Date(message.created_at), 'h:mm a') : '';

  return (
    <div className={cn('flex items-end gap-2.5', isOwn && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white shadow-sm">
        <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className={cn('max-w-[75%]', isOwn && 'text-right')}>
        <div className={cn('flex items-baseline gap-2', isOwn && 'justify-end')}>
          {!isOwn && <span className="text-xs font-semibold text-foreground/70">{name}</span>}
          <span className="text-[10px] text-muted-foreground/60">{time}</span>
        </div>
        <div className={cn(
          'mt-1 inline-block px-4 py-2.5 text-[14px] leading-relaxed',
          isOwn
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md'
            : 'bg-white border border-border/40 shadow-sm rounded-2xl rounded-bl-md'
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
