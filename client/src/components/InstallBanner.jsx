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
    <div className="relative mx-auto mb-3 w-full max-w-md animate-slide-up sm:mb-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-3 text-white/80 backdrop-blur-md sm:px-4 sm:py-3.5">
        <button
          onClick={onDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white/70"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-2.5 pr-7 sm:gap-3 sm:pr-6">
          <div className="mt-0.5 shrink-0 rounded-xl bg-indigo-500/20 p-2">
            <Smartphone className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 pr-2 text-sm font-semibold text-white/90">Install Collab</p>
            {device === 'ios' ? (
              <div className="space-y-1.5 text-xs leading-relaxed text-white/60">
                <p className="flex items-start gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">1</span>
                  <span className="min-w-0 break-words">
                    Tap <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom text-blue-300" /> at the bottom
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">2</span>
                  <span className="min-w-0 break-words">
                    Scroll down, tap <span className="inline-flex max-w-full items-center gap-0.5 break-words font-medium text-white/80"><PlusSquare className="inline h-3.5 w-3.5 shrink-0" /> Add to Home Screen</span>
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs leading-relaxed text-white/60">
                <p className="flex items-start gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">1</span>
                  <span className="min-w-0 break-words">
                    Tap <MoreVertical className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom text-white/70" /> in your browser menu
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 shrink-0">2</span>
                  <span className="min-w-0 break-words">
                    Tap <span className="inline-flex max-w-full items-center gap-0.5 break-words font-medium text-white/80"><Download className="inline h-3.5 w-3.5 shrink-0" /> Install app</span> or <span className="font-medium text-white/80">Add to Home Screen</span>
                  </span>
                </p>
              </div>
            )}

            <div className="mt-3 border-t border-white/10 pt-2.5">
              <div className="mb-1.5 flex items-start gap-1.5">
                <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
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
    <div className="w-full max-w-[340px] shrink-0 animate-slide-up">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/70"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 pr-10 text-left">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/70">
            <Smartphone className="h-3.5 w-3.5 text-indigo-300" />
            Install on mobile
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-[1.45rem]">
            Add Collab to your phone
          </h2>
          <p className="mt-2 max-w-[24ch] text-[12px] leading-6 text-white/55">
            Scan the QR code, then add the app from Safari or Chrome.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  QR code
                </p>
                <p className="mt-1 text-[12px] leading-5 text-white/75">
                  Open this link on your phone.
                </p>
              </div>
              <div className="hidden h-10 w-10 rounded-full bg-white/10 sm:flex sm:items-center sm:justify-center">
                <Smartphone className="h-5 w-5 text-indigo-200" />
              </div>
            </div>

            <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 shadow-[0_14px_32px_-16px_rgba(0,0,0,0.45)]">
              <QRCodeSVG
                value={url}
                size={120}
                bgColor="white"
                fgColor="#1e1b4b"
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">🍎</span>
                <p className="text-sm font-semibold text-white/85">iPhone / iPad</p>
              </div>
              <div className="space-y-2 text-[11px] leading-5 text-white/55">
                <p className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white/80">1</span>
                  <span>Open in Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white/80">2</span>
                  <span>Add to Home Screen.</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">🤖</span>
                <p className="text-sm font-semibold text-white/85">Android</p>
              </div>
              <div className="space-y-2 text-[11px] leading-5 text-white/55">
                <p className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white/80">1</span>
                  <span>Open in Chrome.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white/80">2</span>
                  <span>Tap Install app.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </p>
            <p className="text-[11px] leading-5 text-white/55">
              Allow notifications after login.
            </p>
          </div>
        </div>

        <button
          onClick={onNeverShow}
          className="mt-5 w-full text-center text-[11px] text-white/25 transition hover:text-white/50"
        >
          Hide tips
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
