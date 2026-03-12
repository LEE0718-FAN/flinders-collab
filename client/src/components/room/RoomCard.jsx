import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Crown } from 'lucide-react';

export default function RoomCard({ room }) {
  return (
    <Link to={`/rooms/${room.id}`}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-snug">{room.name}</CardTitle>
            <div className="flex shrink-0 items-center gap-1">
              {room.course_name && <Badge variant="secondary">{room.course_name}</Badge>}
              {room.my_role === 'owner' && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Crown className="h-3 w-3" />
                  Owner
                </Badge>
              )}
            </div>
          </div>
          {room.description && (
            <CardDescription className="line-clamp-2">{room.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{room.my_role || 'member'}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
