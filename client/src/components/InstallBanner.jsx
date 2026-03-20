import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share, PlusSquare, MoreVertical, Download, Smartphone, Bell } from 'lucide-react';

const DISMISS_KEY = 'install-popup-dismissed';

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

export function DesktopSidePanel({ onDismiss, onNeverShow }) {
  const url = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="w-[260px] shrink-0 animate-slide-up">
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-xl p-5 shadow-2xl shadow-black/20">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Smartphone className="h-4 w-4 text-indigo-300" />
            <p className="text-sm font-semibold text-white/90">Get the app</p>
          </div>
          <p className="text-[10px] text-white/40">Scan to install on your phone</p>
        </div>

        <div className="mx-auto rounded-xl bg-white p-2.5 w-fit mb-4">
          <QRCodeSVG
            value={url}
            size={110}
            bgColor="white"
            fgColor="#1e1b4b"
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="space-y-2 mb-4">
          <div className="rounded-lg bg-white/[0.06] p-2.5">
            <p className="text-[10px] font-semibold text-white/60 mb-1 flex items-center gap-1">
              <span>🍎</span> iPhone / iPad
            </p>
            <div className="space-y-0.5 text-[10px] text-white/45 leading-relaxed">
              <p>Safari &rarr; <Share className="inline h-2.5 w-2.5 text-blue-300" /> Share &rarr; Add to Home Screen</p>
            </div>
          </div>

          <div className="rounded-lg bg-white/[0.06] p-2.5">
            <p className="text-[10px] font-semibold text-white/60 mb-1 flex items-center gap-1">
              <span>🤖</span> Android
            </p>
            <div className="space-y-0.5 text-[10px] text-white/45 leading-relaxed">
              <p>Chrome &rarr; <MoreVertical className="inline h-2.5 w-2.5 text-white/50" /> Menu &rarr; Install app</p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-2.5">
            <p className="text-[10px] font-semibold text-amber-300/70 mb-0.5 flex items-center gap-1">
              <Bell className="h-2.5 w-2.5" /> Notifications
            </p>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Tap &quot;Allow&quot; after login for push notifications
            </p>
          </div>
        </div>

        <button
          onClick={onNeverShow}
          className="w-full text-[10px] text-white/25 hover:text-white/50 transition text-center"
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}

export default function InstallBanner() {
  const [device, setDevice] = useState('desktop');
  const [showMobile, setShowMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const d = getDevice();
    setDevice(d);

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    if (d !== 'desktop') {
      const sessionDismissed = sessionStorage.getItem('install-banner-dismissed');
      if (!sessionDismissed) setShowMobile(true);
    }
  }, []);

  if (isStandalone) return null;

  const handleMobileDismiss = () => {
    setShowMobile(false);
    sessionStorage.setItem('install-banner-dismissed', '1');
  };

  return (
    <>
      {showMobile && device !== 'desktop' && (
        <MobileBanner device={device} onDismiss={handleMobileDismiss} />
      )}
    </>
  );
}
