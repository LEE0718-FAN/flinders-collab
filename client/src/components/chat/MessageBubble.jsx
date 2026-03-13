import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MessageBubble({ message, isOwn }) {
  const name = message.users?.full_name || message.sender_name || message.user_name || 'User';
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const time = message.created_at ? format(new Date(message.created_at), 'h:mm a') : '';

  return (
    <div className={cn('flex items-end gap-3', isOwn && 'flex-row-reverse')}>
      <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white shadow-md">
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs font-bold">{initials}</AvatarFallback>
      </Avatar>
      <div className={cn('max-w-[75%]', isOwn && 'text-right')}>
        <div className={cn('flex items-baseline gap-2 mb-1', isOwn && 'justify-end')}>
          {!isOwn && <span className="text-xs font-bold text-slate-700">{name}</span>}
          <span className="text-[10px] text-slate-400 font-medium">{time}</span>
        </div>
        <div className={cn(
          'inline-block px-5 py-3 text-[14px] leading-relaxed',
          isOwn
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-md shadow-blue-500/20'
            : 'bg-white shadow-sm border border-slate-100 rounded-2xl rounded-bl-md text-slate-800'
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
