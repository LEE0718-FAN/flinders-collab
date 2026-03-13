import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Crown, Trash2, LogOut, Loader2 } from 'lucide-react';
import { deleteRoom, leaveRoom } from '@/services/rooms';

export default function RoomCard({ room, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const isOwner = room.my_role === 'owner';

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await deleteRoom(room.id);
      onDeleted?.();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await leaveRoom(room.id);
      onDeleted?.();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-md group relative">
      <Link to={`/rooms/${room.id}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-snug">{room.name}</CardTitle>
            <div className="flex shrink-0 items-center gap-1">
              {room.course_name && <Badge variant="secondary">{room.course_name}</Badge>}
              {isOwner && (
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{room.my_role || 'member'}</span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isOwner
                      ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50'
                      : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-50'
                  }`}
                  onClick={(e) => e.preventDefault()}
                >
                  {isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isOwner ? 'Delete Room' : 'Leave Room'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isOwner ? (
                      <>Are you sure you want to delete <strong>{room.name}</strong>? This will permanently remove all messages, files, events, and tasks in this room.</>
                    ) : (
                      <>Are you sure you want to leave <strong>{room.name}</strong>? You can rejoin later with an invite code.</>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={isOwner ? handleDelete : handleLeave}
                    className={isOwner ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isOwner ? 'Deleting...' : 'Leaving...'}</>
                    ) : (
                      isOwner ? 'Delete Room' : 'Leave Room'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
