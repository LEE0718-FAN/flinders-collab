import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      {/* Ultra-rich deep background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 0%, rgba(99, 102, 241, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 80% 100% at 80% 100%, rgba(59, 130, 246, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 60% 60% at 60% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 0% 80%, rgba(30, 58, 138, 0.4) 0%, transparent 50%),
            linear-gradient(135deg, #020617 0%, #0f172a 25%, #1e1b4b 50%, #0f172a 75%, #020617 100%)
          `,
        }}
      />

      {/* Animated aurora effect */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 90% 40% at 50% 0%, rgba(99, 102, 241, 0.4) 0%, transparent 60%),
            radial-gradient(ellipse 70% 30% at 30% 10%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating orbs with different speeds */}
      <div
        className="absolute rounded-full blur-[100px] animate-float"
        style={{
          top: '-5%', left: '10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%)',
          animationDuration: '8s',
          animationDelay: '0s',
        }}
      />
      <div
        className="absolute rounded-full blur-[80px] animate-float"
        style={{
          bottom: '0%', right: '5%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35), transparent 70%)',
          animationDuration: '10s',
          animationDelay: '2s',
        }}
      />
      <div
        className="absolute rounded-full blur-[120px] animate-float"
        style={{
          top: '30%', right: '20%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25), transparent 70%)',
          animationDuration: '7s',
          animationDelay: '4s',
        }}
      />
      <div
        className="absolute rounded-full blur-[60px] animate-float"
        style={{
          bottom: '20%', left: '0%',
          width: '350px', height: '350px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2), transparent 70%)',
          animationDuration: '9s',
          animationDelay: '1s',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Noise texture */}
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        {/* Logo area */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-20 items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-white/10 blur-xl" />
              <img
                src="/images/flinders-logo.png"
                alt="Flinders University"
                className="relative h-14 object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Flinders <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Collab</span>
          </h1>
          <p className="mt-3 text-[15px] text-white/40 font-light">
            Team collaboration for Flinders University students
          </p>
          <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Auth card with glass effect */}
        <div className="relative group">
          {/* Glow behind card */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-purple-600/20 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

          {/* Gradient border */}
          <div className="relative rounded-2xl p-px bg-gradient-to-b from-white/20 via-white/5 to-transparent">
            <Card className="border-0 rounded-2xl bg-white/[0.92] backdrop-blur-2xl shadow-2xl shadow-black/20">
              <CardContent className="p-8 sm:p-10">{children}</CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[13px] text-white/20 tracking-wide font-light">
          Flinders University &middot; Adelaide, South Australia
        </p>
      </div>

      {/* Developer credit */}
      <div className="relative z-10 mt-12 mb-4 flex flex-col items-center gap-3">
        <div className="h-px w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative group/dev">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 blur-md opacity-0 group-hover/dev:opacity-100 transition-opacity duration-300" />
            <img
              src="/images/seungyun.png"
              alt="Seung Yun Lee"
              className="relative h-9 w-9 rounded-full object-cover ring-2 ring-white/10 shadow-lg"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f172a]" />
          </div>
          <div>
            <p className="text-[11px] text-white/30 leading-tight font-light">
              Designed & Built by
            </p>
            <p className="text-[13px] font-semibold text-white/50 tracking-wide">
              Seung Yun Lee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
