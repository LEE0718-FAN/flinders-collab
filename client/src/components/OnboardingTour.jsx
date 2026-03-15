import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';

const STORAGE_KEY = 'onboarding-completed';

/**
 * Spotlight onboarding tour component.
 * Shows a step-by-step tutorial highlighting specific UI elements.
 *
 * Usage:
 *   <OnboardingTour tourId="dashboard" steps={[...]} />
 *
 * Each step: { target: 'css-selector' | null, title, description, position? }
 * position: 'bottom' | 'top' | 'left' | 'right' | 'center' (default: 'bottom')
 */
export default function OnboardingTour({ tourId, steps = [], onComplete }) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [animating, setAnimating] = useState(false);
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Check if tour should show
  useEffect(() => {
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!completed[tourId]) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [tourId]);

  const completeTour = useCallback((skipForever = false) => {
    if (skipForever) {
      const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      completed[tourId] = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
    setActive(false);
    onComplete?.();
  }, [tourId, onComplete]);

  // Position spotlight and tooltip
  const positionElements = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;

    if (!step.target) {
      // Center mode (no target element)
      setSpotlightRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 8;
    const spotlight = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: 12,
    };
    setSpotlightRect(spotlight);

    // Calculate tooltip position
    const pos = step.position || 'bottom';
    const tooltipWidth = Math.min(340, window.innerWidth - 32);
    const gap = 16;
    let style = { position: 'fixed', width: tooltipWidth };

    if (pos === 'bottom') {
      style.top = spotlight.top + spotlight.height + gap;
      style.left = Math.max(16, Math.min(
        spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
        window.innerWidth - tooltipWidth - 16
      ));
    } else if (pos === 'top') {
      style.bottom = window.innerHeight - spotlight.top + gap;
      style.left = Math.max(16, Math.min(
        spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
        window.innerWidth - tooltipWidth - 16
      ));
    } else if (pos === 'right') {
      style.top = Math.max(16, spotlight.top + spotlight.height / 2 - 60);
      style.left = Math.min(
        spotlight.left + spotlight.width + gap,
        window.innerWidth - tooltipWidth - 16
      );
    } else if (pos === 'left') {
      style.top = Math.max(16, spotlight.top + spotlight.height / 2 - 60);
      style.right = window.innerWidth - spotlight.left + gap;
    }

    // Ensure tooltip doesn't go off screen vertically
    if (style.top && style.top > window.innerHeight - 200) {
      style.top = undefined;
      style.bottom = window.innerHeight - spotlight.top + gap;
    }

    setTooltipStyle(style);
  }, [currentStep, steps]);

  useEffect(() => {
    if (!active) return;
    positionElements();

    const handleResize = () => positionElements();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [active, positionElements]);

  // Re-position on step change with animation
  useEffect(() => {
    if (!active) return;
    setAnimating(true);
    const timer = setTimeout(() => {
      positionElements();
      setAnimating(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [currentStep, active, positionElements]);

  // Scroll target into view
  useEffect(() => {
    if (!active) return;
    const step = steps[currentStep];
    if (!step?.target) return;
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Re-position after scroll
      setTimeout(positionElements, 400);
    }
  }, [currentStep, active, steps, positionElements]);

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour(true);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (!active || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="onboarding-tour" style={{ zIndex: 99999 }}>
      {/* Dark overlay with spotlight cutout */}
      <div
        ref={overlayRef}
        className="fixed inset-0 transition-opacity duration-300"
        style={{ zIndex: 99999 }}
        onClick={(e) => {
          // Only close if clicking the overlay itself
          if (e.target === overlayRef.current) {
            // Don't close on overlay click — user must use buttons
          }
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ transition: 'all 0.3s ease' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left}
                  y={spotlightRect.top}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx={spotlightRect.borderRadius}
                  fill="black"
                  style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#spotlight-mask)"
          />
          {/* Spotlight border glow */}
          {spotlightRect && (
            <rect
              x={spotlightRect.left}
              y={spotlightRect.top}
              width={spotlightRect.width}
              height={spotlightRect.height}
              rx={spotlightRect.borderRadius}
              fill="none"
              stroke="rgba(129,140,248,0.5)"
              strokeWidth="2"
              style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          )}
        </svg>
      </div>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`fixed transition-all duration-300 ease-out ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={{ ...tooltipStyle, zIndex: 100000 }}
      >
        <div className="rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="px-5 pt-4 pb-2">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">
                {currentStep + 1} / {steps.length}
              </span>
              <button
                onClick={() => completeTour(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Icon */}
            {step.icon && (
              <div className="mb-2 text-2xl">{step.icon}</div>
            )}

            {/* Title */}
            <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
              {step.title}
            </h3>

            {/* Description */}
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
              {step.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={goPrev}
                  className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLast && (
                <button
                  onClick={() => completeTour(true)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip all
                </button>
              )}
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all"
              >
                {isLast ? 'Got it!' : 'Next'}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Don't show again - on last step */}
          {isLast && (
            <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 text-center">
              <button
                onClick={() => completeTour(true)}
                className="text-[11px] text-slate-400 hover:text-indigo-500 transition-colors"
              >
                Don't show this again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Reset a specific tour so it shows again.
 */
export function resetTour(tourId) {
  const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  delete completed[tourId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
}

/**
 * Reset all tours.
 */
export function resetAllTours() {
  localStorage.removeItem(STORAGE_KEY);
}
