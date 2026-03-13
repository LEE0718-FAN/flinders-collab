import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MessageBubble({ message, isOwn }) {
  const name = message.users?.full_name || message.sender_name || message.user_name || 'User';
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const time = message.created_at ? format(new Date(message.created_at), 'h:mm a') : '';

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className={cn('max-w-[70%]', isOwn && 'text-right')}>
        <div className="flex items-baseline gap-2">
          {!isOwn && <span className="text-xs font-medium">{name}</span>}
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        <div className={cn('mt-1 inline-block rounded-lg px-3 py-2 text-sm', isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
