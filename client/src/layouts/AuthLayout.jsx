import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DesktopSidePanel } from '@/components/InstallBanner';

const DISMISS_KEY = 'install-popup-dismissed';

export default function AuthLayout({ children }) {
  const [showSidePanel, setShowSidePanel] = useState(false);

  useEffect(() => {
    // Only show on desktop, not if permanently dismissed
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isMobile = /iPad|iPhone|iPod|Android|Mobi|Tablet/i.test(ua);
      if (isMobile) return;
    }
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (standalone) return;

    const permanent = localStorage.getItem(DISMISS_KEY);
    const session = sessionStorage.getItem(DISMISS_KEY);
    if (!permanent && !session) {
      setShowSidePanel(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowSidePanel(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  const handleNeverShow = () => {
    setShowSidePanel(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden px-4 py-5 sm:px-6 sm:py-8"
      style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0118] via-[#1a0a3e] to-[#0d1b3e]" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Floating animated orbs */}
      <div className="absolute left-1/4 top-1/4 hidden h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-[100px] animate-float sm:block" />
      <div className="absolute bottom-1/4 right-1/4 hidden h-[300px] w-[300px] rounded-full bg-violet-500/15 blur-[100px] animate-float sm:block" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 right-1/3 hidden h-[250px] w-[250px] rounded-full bg-blue-500/15 blur-[80px] animate-float sm:block" style={{ animationDelay: '4s' }} />
      <div className="absolute bottom-1/3 left-1/3 hidden h-[200px] w-[200px] rounded-full bg-purple-500/10 blur-[80px] animate-float sm:block" style={{ animationDelay: '6s' }} />

      {/* Main content — login card + optional side panel */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-2 sm:py-4">
        {/* Login column */}
        <div className="grid w-full max-w-7xl items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,420px)] lg:gap-8 xl:gap-10">
          <div className="w-full max-w-[560px] justify-self-center animate-slide-up lg:justify-self-end">
            {/* Logo area */}
            <div className="mb-4 text-center sm:mb-6">
              <div className="mx-auto mb-3 flex h-16 items-center justify-center">
                <img
                  src="/images/flinders-logo.png"
                  alt="Flinders University"
                  className="h-14 object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Flinders <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Collab</span>
              </h1>
              <p className="mt-2 text-sm text-white/40">
                Team collaboration for Flinders University students
              </p>
              <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
            </div>

            {/* Subtle glow behind card */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[320px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[90px] sm:block" />

            {/* Auth card */}
            <Card className="relative rounded-[28px] border border-white/10 bg-white/[0.96] shadow-2xl shadow-black/40 backdrop-blur-xl">
              <CardContent className="p-5 sm:p-8 lg:p-10">{children}</CardContent>
            </Card>

            {/* Footer - university info */}
            <p className="mt-4 text-center text-xs text-white/25 sm:mt-6">
              Flinders University &middot; Adelaide, South Australia
            </p>
          </div>

          {/* Desktop side panel */}
          {showSidePanel && (
            <div className="hidden lg:flex lg:justify-self-start lg:self-center">
              <DesktopSidePanel onDismiss={handleDismiss} onNeverShow={handleNeverShow} />
            </div>
          )}
        </div>
      </div>

      {/* Developer credit - bottom of page */}
      <div className="relative z-10 mt-4 flex flex-col items-center gap-2.5 pb-1 pt-2 sm:mt-6">
        <div className="h-px w-16 bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="/images/seungyun.png"
              alt="Seung Yun Lee"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20 shadow-lg"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#FFD300] ring-2 ring-[#002F60]" />
          </div>
          <div className="text-center">
            <p className="text-[11px] text-white/40 leading-tight">
              Designed & Built by
            </p>
            <p className="text-xs font-semibold text-white/70 tracking-wide">
              Seung Yun Lee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
