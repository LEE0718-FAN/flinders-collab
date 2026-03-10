import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export default function RoomCard({ room }) {
  return (
    <Link to={`/rooms/${room.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{room.name}</CardTitle>
            {room.course_code && <Badge variant="secondary">{room.course_code}</Badge>}
          </div>
          {room.description && <CardDescription>{room.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{room.member_count || 0} members</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
