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
    accent: '#f9a8d4',
    border: '#fbcfe8',
    glow: 'rgba(251, 207, 232, 0.45)',
    surface: 'linear-gradient(135deg, rgba(255, 241, 246, 1) 0%, rgba(255, 255, 255, 0.98) 68%)',
    courseBg: '#fbcfe8',
    courseText: '#831843',
    roleBorder: '#fbcfe8',
    roleBg: 'rgba(255,255,255,0.82)',
    roleText: '#9d174d',
    meta: '#831843',
    divider: '#fce7f3',
  },
  {
    accent: '#7dd3fc',
    border: '#bae6fd',
    glow: 'rgba(186, 230, 253, 0.5)',
    surface: 'linear-gradient(135deg, rgba(240, 249, 255, 1) 0%, rgba(255, 255, 255, 0.98) 68%)',
    courseBg: '#bae6fd',
    courseText: '#0c4a6e',
    roleBorder: '#bae6fd',
    roleBg: 'rgba(255,255,255,0.82)',
    roleText: '#075985',
    meta: '#0f3b53',
    divider: '#e0f2fe',
  },
  {
    accent: '#86efac',
    border: '#bbf7d0',
    glow: 'rgba(187, 247, 208, 0.5)',
    surface: 'linear-gradient(135deg, rgba(240, 253, 244, 1) 0%, rgba(255, 255, 255, 0.98) 68%)',
    courseBg: '#bbf7d0',
    courseText: '#14532d',
    roleBorder: '#bbf7d0',
    roleBg: 'rgba(255,255,255,0.82)',
    roleText: '#166534',
    meta: '#1f5136',
    divider: '#dcfce7',
  },
  {
    accent: '#fcd34d',
    border: '#fde68a',
    glow: 'rgba(253, 230, 138, 0.5)',
    surface: 'linear-gradient(135deg, rgba(255, 251, 235, 1) 0%, rgba(255, 255, 255, 0.98) 68%)',
    courseBg: '#fde68a',
    courseText: '#78350f',
    roleBorder: '#fde68a',
    roleBg: 'rgba(255,255,255,0.82)',
    roleText: '#92400e',
    meta: '#6b4715',
    divider: '#fef3c7',
  },
  {
    accent: '#c4b5fd',
    border: '#ddd6fe',
    glow: 'rgba(221, 214, 254, 0.55)',
    surface: 'linear-gradient(135deg, rgba(245, 243, 255, 1) 0%, rgba(255, 255, 255, 0.98) 68%)',
    courseBg: '#ddd6fe',
    courseText: '#4c1d95',
    roleBorder: '#ddd6fe',
    roleBg: 'rgba(255,255,255,0.82)',
    roleText: '#5b21b6',
    meta: '#4b2f77',
    divider: '#ede9fe',
  },
  {
    accent: '#99f6e4',
    border: '#ccfbf1',
    glow: 'rgba(204, 251, 241, 0.55)',
    surface: 'linear-gradient(135deg, rgba(240, 253, 250, 1) 0%, rgba(255, 255, 255, 0.98) 68%)',
    courseBg: '#ccfbf1',
    courseText: '#134e4a',
    roleBorder: '#ccfbf1',
    roleBg: 'rgba(255,255,255,0.82)',
    roleText: '#0f766e',
    meta: '#195853',
    divider: '#ccfbf1',
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
        className="relative flex flex-col h-full overflow-hidden rounded-lg border text-card-foreground shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing"
        style={{
          background: palette.surface,
          borderColor: palette.border,
          boxShadow: `0 12px 32px -24px ${palette.glow}`,
        }}
        onClick={() => {
          if (!suppressNavigation) {
            navigate(`/rooms/${room.id}`);
          }
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: palette.accent }} />

        {/* Top section: badges + title + description */}
        <div className="flex-1 p-5 pt-6 pb-0">
          {/* Badges row — always 28px tall */}
          <div className="flex items-center gap-1.5 h-7">
            {room.course_name && (
              <Badge
                variant="secondary"
                className="text-xs border-transparent"
                style={{ backgroundColor: palette.courseBg, color: palette.courseText }}
              >
                {room.course_name}
              </Badge>
            )}
            {isOwner && (
              <Badge
                variant="outline"
                className="gap-1 text-xs"
                style={{
                  borderColor: palette.roleBorder,
                  backgroundColor: palette.roleBg,
                  color: palette.roleText,
                }}
              >
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
          <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: palette.divider }}>
            <div className="flex items-center gap-3 text-sm" style={{ color: palette.meta }}>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {room.member_count || 0} {room.member_count === 1 ? 'Member' : 'Members'}
              </span>
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
