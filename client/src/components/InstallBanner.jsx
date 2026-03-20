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

function DesktopPopup({ onClose, onNeverShow }) {
  const url = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 p-6 shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Smartphone className="h-5 w-5 text-indigo-300" />
            <h2 className="text-lg font-bold text-white">Get the Collab App</h2>
          </div>
          <p className="text-xs text-white/50">Scan the QR code with your phone to install</p>
        </div>

        <div className="mx-auto rounded-xl bg-white p-3 w-fit mb-5">
          <QRCodeSVG
            value={url}
            size={140}
            bgColor="white"
            fgColor="#1e1b4b"
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="space-y-2.5 mb-5">
          <div className="rounded-xl bg-white/[0.06] p-3">
            <p className="text-[11px] font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
              <span>🍎</span> iPhone / iPad
            </p>
            <div className="space-y-0.5 text-[11px] text-white/50 leading-relaxed">
              <p>1. Open link in <strong className="text-white/70">Safari</strong></p>
              <p>2. Tap <Share className="inline h-3 w-3 text-blue-300 mx-0.5" /> Share button</p>
              <p>3. Tap <strong className="text-white/70">Add to Home Screen</strong></p>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.06] p-3">
            <p className="text-[11px] font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
              <span>🤖</span> Android
            </p>
            <div className="space-y-0.5 text-[11px] text-white/50 leading-relaxed">
              <p>1. Open link in <strong className="text-white/70">Chrome</strong></p>
              <p>2. Tap <MoreVertical className="inline h-3 w-3 text-white/60 mx-0.5" /> Menu</p>
              <p>3. Tap <strong className="text-white/70">Install app</strong></p>
            </div>
          </div>

          <div className="rounded-xl bg-amber-500/10 p-3">
            <p className="text-[11px] font-semibold text-amber-300/80 mb-1 flex items-center gap-1.5">
              <Bell className="h-3 w-3" /> Push Notifications
            </p>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Tap &quot;Allow&quot; when prompted after login to receive notifications
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onNeverShow}
            className="text-[11px] text-white/30 hover:text-white/60 transition underline underline-offset-2"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstallBanner() {
  const [device, setDevice] = useState('desktop');
  const [showMobile, setShowMobile] = useState(false);
  const [showDesktop, setShowDesktop] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const d = getDevice();
    setDevice(d);

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check persistent "don't show again"
    const permanentlyDismissed = localStorage.getItem(DISMISS_KEY);
    if (permanentlyDismissed) return;

    if (d === 'desktop') {
      // Check session dismiss (dismissed for this session only)
      const sessionDismissed = sessionStorage.getItem(DISMISS_KEY);
      if (!sessionDismissed) {
        setShowDesktop(true);
      }
    } else {
      const sessionDismissed = sessionStorage.getItem('install-banner-dismissed');
      if (!sessionDismissed) {
        setShowMobile(true);
      }
    }
  }, []);

  if (isStandalone) return null;

  const handleMobileDismiss = () => {
    setShowMobile(false);
    sessionStorage.setItem('install-banner-dismissed', '1');
  };

  const handleDesktopClose = () => {
    setShowDesktop(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  const handleNeverShow = () => {
    setShowDesktop(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <>
      {showMobile && device !== 'desktop' && (
        <MobileBanner device={device} onDismiss={handleMobileDismiss} />
      )}
      {showDesktop && device === 'desktop' && (
        <DesktopPopup onClose={handleDesktopClose} onNeverShow={handleNeverShow} />
      )}
    </>
  );
}
