import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#001a3a] via-[#002F60] to-[#003d7a]" />

      {/* Gold accent shapes */}
      <div
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #FFD300, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #FFD300, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #ffffff, transparent 60%)' }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo area */}
        <div className="mb-8 text-center">
          {/* Flinders University logo */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/0/0e/Flinders-logo-stand-alone.svg"
              alt="Flinders University"
              className="h-10 w-10"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Flinders Collab
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Team collaboration for Flinders University students
          </p>
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-[#FFD300]/60" />
        </div>

        {/* Auth card */}
        <Card className="border-0 shadow-2xl shadow-black/20 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-white/40">
          Flinders University &middot; Adelaide, South Australia
        </p>
      </div>
    </div>
  );
}
