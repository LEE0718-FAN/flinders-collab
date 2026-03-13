import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function MemberList({ members = [] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {members.map((member) => {
        const name = member.full_name || member.name || member.university_email || member.email || 'Unknown';
        const email = member.university_email || member.email;
        const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

        return (
          <div key={member.id || member.membership_id} className="rounded-xl bg-muted/30 p-3 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-semibold text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{name}</p>
              {email && <p className="text-xs text-muted-foreground/60 truncate">{email}</p>}
            </div>
            {member.role && (
              <Badge variant="secondary" className="shrink-0 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                {member.role}
              </Badge>
            )}
          </div>
        );
      })}
      {members.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 col-span-2">No members found</p>
      )}
    </div>
  );
}
