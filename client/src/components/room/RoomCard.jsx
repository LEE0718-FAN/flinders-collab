import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Crown, Trash2, LogOut, Loader2 } from 'lucide-react';
import { deleteRoom, leaveRoom } from '@/services/rooms';

const roomPalettes = [
  {
    card: 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white',
    accent: 'bg-rose-300',
    courseBadge: 'bg-rose-200 text-rose-900 hover:bg-rose-200',
    roleBadge: 'border-rose-200 bg-white/80 text-rose-900',
    meta: 'text-rose-950/70',
    divider: 'border-rose-100',
  },
  {
    card: 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white',
    accent: 'bg-sky-300',
    courseBadge: 'bg-sky-200 text-sky-900 hover:bg-sky-200',
    roleBadge: 'border-sky-200 bg-white/80 text-sky-900',
    meta: 'text-sky-950/70',
    divider: 'border-sky-100',
  },
  {
    card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white',
    accent: 'bg-emerald-300',
    courseBadge: 'bg-emerald-200 text-emerald-900 hover:bg-emerald-200',
    roleBadge: 'border-emerald-200 bg-white/80 text-emerald-900',
    meta: 'text-emerald-950/70',
    divider: 'border-emerald-100',
  },
  {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white',
    accent: 'bg-amber-300',
    courseBadge: 'bg-amber-200 text-amber-900 hover:bg-amber-200',
    roleBadge: 'border-amber-200 bg-white/80 text-amber-900',
    meta: 'text-amber-950/70',
    divider: 'border-amber-100',
  },
  {
    card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white',
    accent: 'bg-violet-300',
    courseBadge: 'bg-violet-200 text-violet-900 hover:bg-violet-200',
    roleBadge: 'border-violet-200 bg-white/80 text-violet-900',
    meta: 'text-violet-950/70',
    divider: 'border-violet-100',
  },
  {
    card: 'border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white',
    accent: 'bg-teal-300',
    courseBadge: 'bg-teal-200 text-teal-900 hover:bg-teal-200',
    roleBadge: 'border-teal-200 bg-white/80 text-teal-900',
    meta: 'text-teal-950/70',
    divider: 'border-teal-100',
  },
];

function getRoomPalette(room) {
  const seed = `${room.id || ''}-${room.name || ''}`;
  const hash = [...seed].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) % roomPalettes.length, 0);
  return roomPalettes[Math.abs(hash) % roomPalettes.length];
}

export default function RoomCard({ room, onDeleted, draggableProps, suppressNavigation = false }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isOwner = room.my_role === 'owner';
  const palette = getRoomPalette(room);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isOwner) {
        await deleteRoom(room.id);
      } else {
        await leaveRoom(room.id);
      }
      setConfirmOpen(false);
      onDeleted?.();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full">
      <div
        {...draggableProps}
        className={`relative flex flex-col h-full overflow-hidden rounded-lg border text-card-foreground shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing ${palette.card}`}
        onClick={() => {
          if (!suppressNavigation) {
            navigate(`/rooms/${room.id}`);
          }
        }}
      >
        <div className={`absolute inset-x-0 top-0 h-1.5 ${palette.accent}`} />

        {/* Top section: badges + title + description */}
        <div className="flex-1 p-5 pt-6 pb-0">
          {/* Badges row — always 28px tall */}
          <div className="flex items-center gap-1.5 h-7">
            {room.course_name && (
              <Badge variant="secondary" className={`text-xs border-transparent ${palette.courseBadge}`}>{room.course_name}</Badge>
            )}
            {isOwner && (
              <Badge variant="outline" className={`gap-1 text-xs ${palette.roleBadge}`}>
                <Crown className="h-3 w-3" />
                Owner
              </Badge>
            )}
          </div>

          {/* Title — single line, truncated */}
          <h3 className="text-lg font-semibold leading-snug mt-1.5 truncate">
            {room.name}
          </h3>

          {/* Description — always one line tall */}
          <p className="text-sm text-muted-foreground mt-1 truncate h-5">
            {room.description || '\u00A0'}
          </p>
        </div>

        {/* Footer — pinned to bottom */}
        <div className="p-5 pt-3">
          <div className={`flex items-center justify-between border-t pt-3 ${palette.divider}`}>
            <div className={`flex items-center gap-3 text-sm ${palette.meta}`}>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {room.member_count || 0} {room.member_count === 1 ? 'Member' : 'Members'}
              </span>
              <span className="capitalize">{room.my_role || 'member'}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className={`h-7 gap-1.5 text-xs ${
                isOwner
                  ? 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700'
                  : 'text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpen(true);
              }}
            >
              {isOwner ? (
                <><Trash2 className="h-3.5 w-3.5" />Delete</>
              ) : (
                <><LogOut className="h-3.5 w-3.5" />Leave</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isOwner ? 'Delete Room' : 'Leave Room'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isOwner ? (
                <>Are you sure you want to delete <strong>{room.name}</strong>? This will permanently remove all messages, files, events, and tasks. This action cannot be undone.</>
              ) : (
                <>Are you sure you want to leave <strong>{room.name}</strong>? You will lose access to all messages and files. You can rejoin later with an invite code.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleAction();
              }}
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
    </div>
  );
}
