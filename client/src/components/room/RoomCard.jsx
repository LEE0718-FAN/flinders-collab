import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Crown, Trash2, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { deleteRoom, leaveRoom } from '@/services/rooms';

const roomPalettes = [
  {
    accent: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    border: '#fecdd3',
    glow: 'rgba(244, 63, 94, 0.12)',
    surface: 'linear-gradient(135deg, rgba(255, 241, 246, 0.9) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(255, 241, 242, 0.4) 100%)',
    courseBg: '#ffe4e6',
    courseText: '#9f1239',
    roleBorder: '#fecdd3',
    roleBg: 'rgba(255,255,255,0.9)',
    roleText: '#be123c',
    meta: '#9f1239',
    divider: '#ffe4e6',
    iconBg: 'rgba(244, 63, 94, 0.08)',
  },
  {
    accent: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    border: '#bfdbfe',
    glow: 'rgba(59, 130, 246, 0.12)',
    surface: 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(238, 242, 255, 0.4) 100%)',
    courseBg: '#dbeafe',
    courseText: '#1e40af',
    roleBorder: '#bfdbfe',
    roleBg: 'rgba(255,255,255,0.9)',
    roleText: '#1d4ed8',
    meta: '#1e40af',
    divider: '#dbeafe',
    iconBg: 'rgba(59, 130, 246, 0.08)',
  },
  {
    accent: 'linear-gradient(135deg, #10b981, #059669)',
    border: '#bbf7d0',
    glow: 'rgba(16, 185, 129, 0.12)',
    surface: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(236, 253, 245, 0.4) 100%)',
    courseBg: '#d1fae5',
    courseText: '#065f46',
    roleBorder: '#a7f3d0',
    roleBg: 'rgba(255,255,255,0.9)',
    roleText: '#047857',
    meta: '#065f46',
    divider: '#d1fae5',
    iconBg: 'rgba(16, 185, 129, 0.08)',
  },
  {
    accent: 'linear-gradient(135deg, #f59e0b, #d97706)',
    border: '#fde68a',
    glow: 'rgba(245, 158, 11, 0.12)',
    surface: 'linear-gradient(135deg, rgba(255, 251, 235, 0.9) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(254, 249, 195, 0.3) 100%)',
    courseBg: '#fef3c7',
    courseText: '#92400e',
    roleBorder: '#fde68a',
    roleBg: 'rgba(255,255,255,0.9)',
    roleText: '#b45309',
    meta: '#92400e',
    divider: '#fef3c7',
    iconBg: 'rgba(245, 158, 11, 0.08)',
  },
  {
    accent: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    border: '#ddd6fe',
    glow: 'rgba(139, 92, 246, 0.12)',
    surface: 'linear-gradient(135deg, rgba(245, 243, 255, 0.9) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(243, 232, 255, 0.4) 100%)',
    courseBg: '#ede9fe',
    courseText: '#5b21b6',
    roleBorder: '#c4b5fd',
    roleBg: 'rgba(255,255,255,0.9)',
    roleText: '#6d28d9',
    meta: '#5b21b6',
    divider: '#ede9fe',
    iconBg: 'rgba(139, 92, 246, 0.08)',
  },
  {
    accent: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    border: '#ccfbf1',
    glow: 'rgba(20, 184, 166, 0.12)',
    surface: 'linear-gradient(135deg, rgba(240, 253, 250, 0.9) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(204, 251, 241, 0.3) 100%)',
    courseBg: '#ccfbf1',
    courseText: '#115e59',
    roleBorder: '#99f6e4',
    roleBg: 'rgba(255,255,255,0.9)',
    roleText: '#0f766e',
    meta: '#115e59',
    divider: '#ccfbf1',
    iconBg: 'rgba(20, 184, 166, 0.08)',
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
        className="group relative flex flex-col h-full overflow-hidden rounded-2xl border text-card-foreground cursor-grab active:cursor-grabbing transition-all duration-300 ease-out hover:-translate-y-1"
        style={{
          background: palette.surface,
          borderColor: palette.border,
          boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -8px ${palette.glow}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.06), 0 20px 48px -12px ${palette.glow.replace('0.12', '0.25')}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -8px ${palette.glow}`;
        }}
        onClick={() => {
          if (!suppressNavigation) {
            navigate(`/rooms/${room.id}`);
          }
        }}
      >
        {/* Gradient accent bar */}
        <div className="h-1 rounded-t-2xl" style={{ background: palette.accent }} />

        {/* Top section */}
        <div className="flex-1 p-5 pt-5 pb-0">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 min-h-[26px]">
            {room.course_name && (
              <Badge
                variant="secondary"
                className="rounded-full text-[11px] font-semibold px-2.5 py-0.5 border-0 shadow-sm"
                style={{ backgroundColor: palette.courseBg, color: palette.courseText }}
              >
                {room.course_name}
              </Badge>
            )}
            {isOwner && (
              <Badge
                variant="outline"
                className="gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5 border shadow-sm"
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

          {/* Title */}
          <h3 className="text-[17px] font-bold leading-snug mt-2.5 truncate text-foreground/90">
            {room.name}
          </h3>

          {/* Description */}
          <p className="text-[13px] text-muted-foreground/60 mt-1 truncate h-5">
            {room.description || '\u00A0'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-3">
          <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${palette.divider}` }}>
            <div className="flex items-center gap-1.5 text-[13px]" style={{ color: palette.meta }}>
              <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: palette.iconBg }}>
                <Users className="h-3.5 w-3.5" style={{ color: palette.meta }} />
              </div>
              <span className="font-medium">
                {room.member_count || 0}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 gap-1 text-[11px] font-medium rounded-full px-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                  isOwner
                    ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                    : 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
              >
                {isOwner ? (
                  <><Trash2 className="h-3 w-3" />Delete</>
                ) : (
                  <><LogOut className="h-3 w-3" />Leave</>
                )}
              </Button>
              <div className="h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" style={{ backgroundColor: palette.iconBg }}>
                <ArrowRight className="h-3 w-3" style={{ color: palette.meta }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
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
            <AlertDialogCancel disabled={loading} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleAction();
              }}
              className={`rounded-xl ${isOwner ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
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
