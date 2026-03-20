import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share, PlusSquare, MoreVertical, Download, Smartphone, Bell } from 'lucide-react';

function getDevice() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mobi|Tablet/i.test(ua)) return 'mobile';
  return 'desktop';
}

function MobileBanner({ device, onDismiss }) {
  return (
    <div className="relative w-full max-w-md mx-auto mb-4 animate-slide-up">
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-md px-4 py-3.5 text-white/80">
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="mt-0.5 shrink-0 rounded-xl bg-indigo-500/20 p-2">
            <Smartphone className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90 mb-1">Install Collab</p>
            {device === 'ios' ? (
              <div className="space-y-1.5 text-xs text-white/60 leading-relaxed">
                <p className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">1</span>
                  Tap <Share className="inline h-3.5 w-3.5 text-blue-300 mx-0.5" /> at the bottom
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">2</span>
                  Scroll down, tap <span className="inline-flex items-center gap-0.5 text-white/80 font-medium"><PlusSquare className="inline h-3.5 w-3.5" /> Add to Home Screen</span>
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs text-white/60 leading-relaxed">
                <p className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">1</span>
                  Tap <MoreVertical className="inline h-3.5 w-3.5 text-white/70 mx-0.5" /> in your browser menu
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">2</span>
                  Tap <span className="inline-flex items-center gap-0.5 text-white/80 font-medium"><Download className="inline h-3.5 w-3.5" /> Install app</span> or <span className="text-white/80 font-medium">Add to Home Screen</span>
                </p>
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-white/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Bell className="h-3.5 w-3.5 text-amber-300" />
                <p className="text-xs font-semibold text-white/80">Enable notifications</p>
              </div>
              {device === 'ios' ? (
                <p className="text-[11px] text-white/50 leading-relaxed">
                  After installing, open the app &rarr; Settings &rarr; Notifications &rarr; Allow for Collab
                </p>
              ) : (
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Tap "Allow" when prompted after login, or go to Settings &rarr; Apps &rarr; Browser &rarr; Notifications
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesktopInstallPanel() {
  const url = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-5 text-center w-[240px] shadow-2xl shadow-black/30 animate-slide-up">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Smartphone className="h-4 w-4 text-indigo-300" />
        <p className="text-sm font-semibold text-white/90">Get the app</p>
      </div>
      <div className="mx-auto rounded-xl bg-white p-3 w-fit mb-3">
        <QRCodeSVG
          value={url}
          size={120}
          bgColor="white"
          fgColor="#1e1b4b"
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="text-[11px] text-white/50 leading-relaxed mb-4">
        Scan with your phone camera to install Collab
      </p>

      <div className="text-left space-y-3">
        <div className="rounded-xl bg-white/[0.06] p-3">
          <p className="text-[11px] font-semibold text-white/70 mb-1.5 flex items-center gap-1">
            <span className="text-xs">🍎</span> iPhone / iPad
          </p>
          <div className="space-y-1 text-[10px] text-white/50 leading-relaxed">
            <p>1. Open in Safari</p>
            <p>2. Tap <Share className="inline h-3 w-3 text-blue-300 mx-0.5" /> Share</p>
            <p>3. Tap "Add to Home Screen"</p>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.06] p-3">
          <p className="text-[11px] font-semibold text-white/70 mb-1.5 flex items-center gap-1">
            <span className="text-xs">🤖</span> Android
          </p>
          <div className="space-y-1 text-[10px] text-white/50 leading-relaxed">
            <p>1. Open in Chrome</p>
            <p>2. Tap <MoreVertical className="inline h-3 w-3 text-white/60 mx-0.5" /> Menu</p>
            <p>3. Tap "Install app"</p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-500/10 p-3">
          <p className="text-[11px] font-semibold text-amber-300/80 mb-1 flex items-center gap-1">
            <Bell className="h-3 w-3" /> Notifications
          </p>
          <p className="text-[10px] text-white/50 leading-relaxed">
            Tap "Allow" when prompted after login to receive push notifications
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InstallBanner() {
  const [device, setDevice] = useState('desktop');
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setDevice(getDevice());
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsStandalone(standalone);

    const stored = sessionStorage.getItem('install-banner-dismissed');
    if (stored) setDismissed(true);
  }, []);

  if (isStandalone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('install-banner-dismissed', '1');
  };

  // Desktop QR is now rendered via DesktopInstallPanel in AuthLayout
  return (
    <>
      {device !== 'desktop' && !dismissed && (
        <MobileBanner device={device} onDismiss={handleDismiss} />
      )}
    </>
  );
}
