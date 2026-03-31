import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'guided-tour-done';

const STEPS = [
  {
    target: '[data-tour="create-room"]',
    title: 'Create a Room',
    desc: 'Start a new room for your course or project team.',
    position: 'bottom',
  },
  {
    target: '[data-tour="join-room"]',
    title: 'Join a Room',
    desc: 'Got an invite code? Join your team\u2019s room here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="nav-room-hub"]',
    title: 'Room Hub',
    desc: 'Your home base \u2014 all your rooms at a glance.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-deadlines"]',
    title: 'Deadlines',
    desc: 'Track upcoming meetings and due dates.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-social"]',
    title: 'Flinders Social',
    desc: 'Connect, share posts, and chat with other students.',
    position: 'right',
  },
  {
    target: '[data-tour="nav-life"]',
    title: 'Flinders Life',
    desc: 'Campus maps, resources, and university info.',
    position: 'right',
  },
];

export default function GuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Wait for WelcomeTutorial to finish + DOM to settle
    const timer = setTimeout(() => {
      const welcomeSeen = localStorage.getItem('welcome-tutorial-seen');
      if (!welcomeSeen) return; // WelcomeTutorial will show first
      setActive(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Re-check once WelcomeTutorial dismisses (storage event or poll)
  useEffect(() => {
    if (active || localStorage.getItem(STORAGE_KEY)) return;
    const interval = setInterval(() => {
      if (localStorage.getItem('welcome-tutorial-seen')) {
        clearInterval(interval);
        setTimeout(() => setActive(true), 600);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [active]);

  const measureTarget = useCallback(() => {
    if (!active) return;
    const current = STEPS[step];
    if (!current) return;

    const el = document.querySelector(current.target);
    if (!el) {
      // Skip missing elements (e.g., Flinders Life for general accounts)
      if (step < STEPS.length - 1) {
        setStep((s) => s + 1);
      } else {
        finish();
      }
      return;
    }

    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [active, step]);

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
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setActive(false);
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  if (!active || !rect) return null;

  const current = STEPS[step];
  const pad = 6;
  const spotX = rect.left - pad;
  const spotY = rect.top - pad;
  const spotW = rect.width + pad * 2;
  const spotH = rect.height + pad * 2;

  // Tooltip position
  let tooltipStyle = {};
  if (current.position === 'bottom') {
    tooltipStyle = {
      top: rect.top + rect.height + 12,
      left: Math.max(12, rect.left + rect.width / 2 - 140),
    };
  } else {
    // right
    tooltipStyle = {
      top: Math.max(12, rect.top + rect.height / 2 - 36),
      left: rect.left + rect.width + 14,
    };
  }

  return (
    <div className="fixed inset-0 z-[99998]" onClick={next}>
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="guided-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotX}
              y={spotY}
              width={spotW}
              height={spotH}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#guided-tour-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      <div
        className="absolute rounded-xl ring-2 ring-blue-400/60 ring-offset-2 ring-offset-transparent transition-all duration-300"
        style={{
          top: spotY,
          left: spotX,
          width: spotW,
          height: spotH,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute w-[280px] rounded-xl bg-white px-4 py-3.5 shadow-2xl transition-all duration-300"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[14px] font-bold text-slate-900">{current.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{current.desc}</p>

        <div className="mt-3 flex items-center justify-between">
          {/* Dots */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-4 bg-blue-500' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); finish(); }}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
            >
              Skip
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors active:scale-95"
            >
              {step === STEPS.length - 1 ? 'Done' : 'Next'}
              {step < STEPS.length - 1 && <ChevronRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
