import React from 'react';
import { MessageSquare } from 'lucide-react';

import { FlinapPanel } from '@/pages/FlindersLifePage';
import { useAuth } from '@/hooks/useAuth';

export default function FlindersSocialPage() {
  const { user } = useAuth();

  return (
    <div className="px-2 py-3 sm:px-0">
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 px-5 py-6 shadow-lg sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.45) 0%, transparent 60%)' }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Flinders Social</h1>
            <p className="mt-0.5 text-xs text-white/80">Campus-only live sharing, snap map and status updates</p>
          </div>
        </div>
      </div>

      <FlinapPanel currentUserId={user?.id || null} />
    </div>
  );
}
