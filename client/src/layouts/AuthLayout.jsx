import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-teal-50" />

      {/* Decorative background shapes */}
      <div
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, hsl(221 83% 53%), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, hsl(174 58% 44%), transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            Flinders Collab
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Team collaboration for Flinders University students
          </p>
        </div>

        {/* Auth card */}
        <Card className="border-0 shadow-xl shadow-black/[0.04]">
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Flinders University &middot; Collaboration Platform
        </p>
      </div>
    </div>
  );
}
