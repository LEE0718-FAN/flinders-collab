import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Crown, Trash2, LogOut, Loader2 } from 'lucide-react';
import { deleteRoom, leaveRoom } from '@/services/rooms';

export default function RoomCard({ room, onDeleted }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isOwner = room.my_role === 'owner';

  const handleCardClick = () => {
    navigate(`/rooms/${room.id}`);
  };

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isOwner) {
        await deleteRoom(room.id);
      } else {
        await leaveRoom(room.id);
      }
      onDeleted?.();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Card
        className="transition-shadow hover:shadow-md group relative cursor-pointer"
        onClick={handleCardClick}
      >
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-all ${
                    isOwner
                      ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50'
                      : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmOpen(true);
                  }}
                >
                  {isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isOwner ? 'Delete this room' : 'Leave this room'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isOwner ? 'Delete Room' : 'Leave Room'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isOwner ? (
                <>Are you sure you want to delete <strong>{room.name}</strong>? This will permanently remove all messages, files, events, and tasks in this room. This action cannot be undone.</>
              ) : (
                <>Are you sure you want to leave <strong>{room.name}</strong>? You will lose access to all messages and files. You can rejoin later with an invite code.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={isOwner ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isOwner ? 'Deleting...' : 'Leaving...'}</>
              ) : (
                isOwner ? 'Yes, Delete Room' : 'Yes, Leave Room'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
