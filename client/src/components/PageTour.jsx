import React, { useState, useEffect, useCallback } from 'react';

/**
 * Lightweight per-page tip.
 *
 * Props:
 *   tourId  — unique key (localStorage: `page-tour-${tourId}`)
 *   steps   — first step only is shown as a lightweight tip.
 *   delay   — ms before tour starts (default 600)
 */
export default function PageTour({ tourId, steps = [], delay = 600 }) {
  const storageKey = `page-tour-${tourId}`;
  const triggerKey = 'page-tour-trigger';
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState(null);
  const current = steps[0];

  useEffect(() => {
    if (!current) return;
    const triggeredBySidebar = typeof window !== 'undefined' && window.sessionStorage.getItem(triggerKey) === tourId;
    if (!triggeredBySidebar && localStorage.getItem(storageKey)) return;

    const timer = setTimeout(() => {
      if (triggeredBySidebar) {
        window.sessionStorage.removeItem(triggerKey);
      }
      setActive(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [storageKey, current, delay, tourId]);

  const measureTarget = useCallback(() => {
    if (!active || !current?.target) return;

    const el = document.querySelector(current.target);
    if (!el) {
      localStorage.setItem(storageKey, Date.now().toString());
      setActive(false);
      return;
    }

    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [active, current, storageKey]);

  useEffect(() => {
    measureTarget();
    const onResize = () => measureTarget();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [measureTarget]);

  const finish = () => {
    localStorage.setItem(storageKey, Date.now().toString());
    setActive(false);
  };

  if (!active || !rect || !current) return null;
  const pad = 6;
  const spotX = rect.left - pad;
  const spotY = rect.top - pad;
  const spotW = rect.width + pad * 2;
  const spotH = rect.height + pad * 2;

  // Tooltip positioning
  let tooltipStyle = {};
  const pos = current.position || 'bottom';
  if (pos === 'bottom') {
    tooltipStyle = {
      top: rect.top + rect.height + 14,
      left: Math.max(12, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 292)),
    };
  } else if (pos === 'top') {
    tooltipStyle = {
      bottom: window.innerHeight - rect.top + 14,
      left: Math.max(12, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 292)),
    };
  } else if (pos === 'right') {
    tooltipStyle = {
      top: Math.max(12, rect.top + rect.height / 2 - 40),
      left: Math.min(rect.left + rect.width + 14, window.innerWidth - 292),
    };
  } else {
    // left
    tooltipStyle = {
      top: Math.max(12, rect.top + rect.height / 2 - 40),
      right: window.innerWidth - rect.left + 14,
    };
  }

  return (
    <div className="fixed inset-0 z-[99998]" style={{ pointerEvents: 'none' }}>
      <div
        className="absolute rounded-xl ring-2 ring-blue-400/70 ring-offset-2 ring-offset-transparent transition-all duration-300"
        style={{ top: spotY, left: spotX, width: spotW, height: spotH }}
      />

      <div
        className="absolute w-[280px] rounded-xl border border-blue-100 bg-white px-4 py-3.5 shadow-xl transition-all duration-300"
        style={{ ...tooltipStyle, pointerEvents: 'auto' }}
      >
        <p className="text-[14px] font-bold text-slate-900">{current.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{current.desc}</p>

        <div className="mt-3 flex justify-end">
          <button
            onClick={finish}
            className="rounded-full bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
