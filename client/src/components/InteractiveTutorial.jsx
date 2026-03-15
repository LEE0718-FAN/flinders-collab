import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Sparkles } from 'lucide-react';
import { createRoom, deleteRoom } from '@/services/rooms';

const TUTORIAL_KEY = 'tutorial-completed';
const TUTORIAL_ROOM_KEY = 'tutorial-room-id';

export default function InteractiveTutorial() {
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [active, setActive] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorScale, setCursorScale] = useState(1);
  const [spotlight, setSpotlight] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [showNextBtn, setShowNextBtn] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);
  const roomIdRef = useRef(null);
  const nextRef = useRef(null);
  const totalSteps = 13;

  // ── Check for stale tutorial room on mount ──
  useEffect(() => {
    const staleRoomId = localStorage.getItem(TUTORIAL_ROOM_KEY);
    if (staleRoomId) {
      deleteRoom(staleRoomId).catch(() => {});
      localStorage.removeItem(TUTORIAL_ROOM_KEY);
    }
  }, []);

  // ── Show prompt for first-time users ──
  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    const t = setTimeout(() => setShowPrompt(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // ── Utilities ──
  const sleep = (ms) =>
    new Promise((r) => {
      const t = setTimeout(r, ms);
      // Allow cancel to interrupt
      const check = setInterval(() => {
        if (cancelRef.current) { clearTimeout(t); clearInterval(check); r(); }
      }, 100);
    });

  const waitForEl = (selector, timeout = 5000) =>
    new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el || Date.now() - start > timeout || cancelRef.current) {
          clearInterval(interval);
          resolve(el || null);
        }
      }, 100);
    });

  const waitForNext = () =>
    new Promise((resolve) => {
      setShowNextBtn(true);
      nextRef.current = resolve;
    });

  const handleNext = () => {
    setShowNextBtn(false);
    nextRef.current?.();
    nextRef.current = null;
  };

  const moveCursorTo = async (target) => {
    let x, y;
    if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    } else {
      x = target.x;
      y = target.y;
    }
    setCursorVisible(true);
    setCursorPos({ x, y });
    await sleep(500);
  };

  const clickAt = async (selector) => {
    await moveCursorTo(selector);
    setCursorScale(0.75);
    await sleep(150);
    setCursorScale(1);
    const el = document.querySelector(selector);
    if (el) el.click();
    await sleep(300);
  };

  const spotlightEl = (selector) => {
    const el = document.querySelector(selector);
    if (!el) { setSpotlight(null); return; }
    const r = el.getBoundingClientRect();
    const pad = 10;
    setSpotlight({
      x: r.left - pad, y: r.top - pad,
      w: r.width + pad * 2, h: r.height + pad * 2,
      r: 14,
    });
  };

  const showTip = (title, desc, options = {}) => {
    if (options.center) {
      setTooltip({
        title, desc,
        style: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        icon: options.icon,
      });
    } else if (options.target) {
      const el = document.querySelector(options.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const tw = Math.min(320, window.innerWidth - 24);
      const gap = 14;
      let style = { position: 'fixed', width: tw };
      const pos = options.position || 'bottom';
      if (pos === 'bottom') {
        style.top = r.bottom + gap + 10;
        style.left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12));
      } else if (pos === 'top') {
        style.bottom = window.innerHeight - r.top + gap;
        style.left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12));
      } else if (pos === 'right') {
        style.top = Math.max(12, r.top + r.height / 2 - 50);
        style.left = Math.min(r.right + gap, window.innerWidth - tw - 12);
      }
      if (style.top > window.innerHeight - 180) {
        delete style.top;
        style.bottom = window.innerHeight - r.top + gap;
      }
      setTooltip({ title, desc, style, icon: options.icon });
    }
    setSpotlight(null);
    if (options.target) spotlightEl(options.target);
  };

  const typeInto = async (selector, text, isTextarea = false) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const proto = isTextarea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return;
    await moveCursorTo(selector);
    el.focus();
    for (let i = 1; i <= text.length; i++) {
      if (cancelRef.current) return;
      setter.call(el, text.slice(0, i));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      setTypingText(text.slice(0, i));
      await sleep(45 + Math.random() * 25);
    }
    setTypingText('');
    await sleep(300);
  };

  // ── Main tutorial flow ──
  const runTutorial = useCallback(async () => {
    cancelRef.current = false;
    const bail = () => cancelRef.current;

    // ── Step 1: Navigate to dashboard ──
    setProgress(1);
    navigate('/dashboard');
    await sleep(800);
    if (bail()) return;

    // ── Step 2: Highlight Create Room ──
    setProgress(2);
    showTip('방 만들기', '여기서 새 방을 만들 수 있어!\n눌러볼게 👆', {
      target: '[data-tour="create-room"]', icon: '✨', position: 'bottom',
    });
    await moveCursorTo('[data-tour="create-room"]');
    await waitForNext();
    if (bail()) return;

    // ── Step 3: Click Create Room → dialog opens ──
    setProgress(3);
    setTooltip(null);
    setSpotlight(null);
    await clickAt('[data-tour="create-room"] button');
    await sleep(500);
    if (bail()) return;

    // ── Step 4: Type room name ──
    setProgress(4);
    const nameInput = await waitForEl('[role="dialog"] input');
    if (!nameInput || bail()) return;
    showTip('방 이름 입력', '이름을 적어볼게!', { center: true, icon: '✏️' });
    await sleep(500);
    // Find the room name input (first input in dialog)
    const dialogInputs = document.querySelectorAll('[role="dialog"] input');
    if (dialogInputs[0]) {
      await typeInto('[role="dialog"] input', 'Tutorial Room');
    }
    if (bail()) return;

    // ── Step 5: Submit → create room ──
    setProgress(5);
    setTooltip(null);
    setSpotlight(null);
    const submitBtn = document.querySelector('[role="dialog"] button[type="submit"]');
    if (submitBtn) {
      await moveCursorTo('[role="dialog"] button[type="submit"]');
      setCursorScale(0.75);
      await sleep(150);
      setCursorScale(1);
      submitBtn.click();
    }
    await sleep(1500);
    if (bail()) return;

    // ── Find the created room ID ──
    // The room should now exist. Find it from the sidebar or by API.
    const staleCheck = localStorage.getItem(TUTORIAL_ROOM_KEY);
    if (staleCheck) {
      roomIdRef.current = staleCheck;
    }
    // Try to find room from sidebar links
    const roomLinks = document.querySelectorAll('[data-tour="sidebar-rooms"] a');
    let tutorialRoomId = null;
    for (const link of roomLinks) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/rooms\/(.+)/);
      if (match) {
        tutorialRoomId = match[1];
        break; // first room = most recently created
      }
    }

    if (!tutorialRoomId) {
      // Fallback: create room via API directly
      try {
        const room = await createRoom({ name: 'Tutorial Room' });
        tutorialRoomId = room.id || room.room?.id;
      } catch {
        // Can't create, skip room tour
      }
    }

    if (tutorialRoomId) {
      roomIdRef.current = tutorialRoomId;
      localStorage.setItem(TUTORIAL_ROOM_KEY, tutorialRoomId);
    }

    // ── Step 6: Navigate to room ──
    setProgress(6);
    setCursorVisible(false);
    if (tutorialRoomId) {
      showTip('방이 만들어졌어!', '들어가볼까? 🚀', { center: true, icon: '🎉' });
      await waitForNext();
      if (bail()) return;
      setTooltip(null);
      navigate(`/rooms/${tutorialRoomId}`);
      await sleep(1000);
    }
    if (bail()) return;

    // ── Step 7: Schedule tab ──
    setProgress(7);
    const scheduleTab = await waitForEl('[data-tour="tab-schedule"]');
    if (scheduleTab && !bail()) {
      showTip('📆 스케줄', '팀 일정을 관리해.\n미팅, 시험, 과제 마감일을 추가할 수 있어!', {
        target: '[data-tour="tab-schedule"]', icon: '📆', position: 'bottom',
      });
      await clickAt('[data-tour="tab-schedule"]');
      await waitForNext();
      if (bail()) return;
    }

    // ── Step 8: Tasks tab ──
    setProgress(8);
    setTooltip(null);
    setSpotlight(null);
    const tasksTab = await waitForEl('[data-tour="tab-tasks"]');
    if (tasksTab && !bail()) {
      showTip('✅ 태스크', '할 일을 만들고 팀원에게 배정해.\n완료하면 체크!', {
        target: '[data-tour="tab-tasks"]', icon: '✅', position: 'bottom',
      });
      await clickAt('[data-tour="tab-tasks"]');
      await waitForNext();
      if (bail()) return;
    }

    // ── Step 9: Chat tab ──
    setProgress(9);
    setTooltip(null);
    setSpotlight(null);
    const chatTab = await waitForEl('[data-tour="tab-chat"]');
    if (chatTab && !bail()) {
      showTip('💬 채팅', '팀원들이랑 실시간 대화!\n이미지, 파일도 보낼 수 있어.', {
        target: '[data-tour="tab-chat"]', icon: '💬', position: 'bottom',
      });
      await clickAt('[data-tour="tab-chat"]');
      await waitForNext();
      if (bail()) return;
    }

    // ── Step 10: Files tab ──
    setProgress(10);
    setTooltip(null);
    setSpotlight(null);
    const filesTab = await waitForEl('[data-tour="tab-files"]');
    if (filesTab && !bail()) {
      showTip('📁 파일', '강의자료, 과제 파일을 여기서 공유해!', {
        target: '[data-tour="tab-files"]', icon: '📁', position: 'bottom',
      });
      await clickAt('[data-tour="tab-files"]');
      await waitForNext();
      if (bail()) return;
    }

    // ── Step 11: Deadlines ──
    setProgress(11);
    setTooltip(null);
    setSpotlight(null);
    setCursorVisible(false);
    navigate('/deadlines');
    await sleep(800);
    if (bail()) return;
    showTip('📅 데드라인', '모든 방의 일정이 여기 한곳에 모여!\n절대 까먹을 일 없어.', { center: true, icon: '📅' });
    await waitForNext();
    if (bail()) return;

    // ── Step 12: Board ──
    setProgress(12);
    setTooltip(null);
    navigate('/board');
    await sleep(800);
    if (bail()) return;
    showTip('💬 자유게시판', '스터디 모집, Q&A, 익명 고백까지!\n뭐든 자유롭게 올려봐.', { center: true, icon: '💬' });
    await waitForNext();
    if (bail()) return;

    // ── Step 13: Flinders Life ──
    setProgress(13);
    setTooltip(null);
    navigate('/flinders-life');
    await sleep(800);
    if (bail()) return;
    showTip('🎓 Flinders Life', '캠퍼스 이벤트, 학사 일정, 스터디룸 예약!\n관심사 골라서 추천도 받아봐.', { center: true, icon: '🎓' });
    await waitForNext();
    if (bail()) return;

    // ── Farewell ──
    setTooltip(null);
    setSpotlight(null);
    setCursorVisible(false);
    showTip('준비 완료!', '이제 직접 해봐! 🎉\n궁금한 건 언제든 물어봐.', { center: true, icon: '🚀' });
    await waitForNext();

    // ── Cleanup ──
    await cleanup();
    setActive(false);
    localStorage.setItem(TUTORIAL_KEY, Date.now().toString());
  }, [navigate]);

  const cleanup = async () => {
    setTooltip(null);
    setSpotlight(null);
    setCursorVisible(false);
    if (roomIdRef.current) {
      try {
        await deleteRoom(roomIdRef.current);
      } catch {
        // ignore
      }
      localStorage.removeItem(TUTORIAL_ROOM_KEY);
      roomIdRef.current = null;
      // Refresh room list in sidebar
      window.dispatchEvent(new CustomEvent('rooms-updated'));
    }
    navigate('/dashboard');
  };

  const handleSkip = async () => {
    cancelRef.current = true;
    nextRef.current?.();
    nextRef.current = null;
    await cleanup();
    setActive(false);
    setShowPrompt(false);
    // Don't set tutorial-completed so it shows again next time
    // Unless dontShowAgain is checked
    if (dontShowAgain) {
      localStorage.setItem(TUTORIAL_KEY, Date.now().toString());
    }
  };

  const handleDecline = () => {
    setShowPrompt(false);
    // Will show again next visit
  };

  const handleAcceptAndNeverShow = () => {
    setShowPrompt(false);
    localStorage.setItem(TUTORIAL_KEY, Date.now().toString());
  };

  const startTutorial = () => {
    setShowPrompt(false);
    setActive(true);
  };

  // ── Run tutorial when active ──
  useEffect(() => {
    if (!active) return;
    runTutorial();
    return () => {
      cancelRef.current = true;
    };
  }, [active, runTutorial]);

  // ── Prompt modal ──
  if (showPrompt && !active) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl animate-scale-in">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-900">처음이야? 👋</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              앱 사용법을 직접 보여줄게!<br/>
              커서가 알아서 클릭하고 타이핑하면서<br/>
              하나하나 설명해줄 거야.
            </p>
          </div>
          <div className="mt-6 space-y-2">
            <button
              onClick={startTutorial}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all active:scale-[0.98]"
            >
              좋아, 보여줘! 🚀
            </button>
            <button
              onClick={handleDecline}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-all"
            >
              괜찮아, 직접 해볼게
            </button>
            <button
              onClick={handleAcceptAndNeverShow}
              className="w-full text-[11px] text-slate-400 hover:text-slate-600 py-1 transition-colors"
            >
              다시 묻지 않기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!active) return null;

  const progressPct = (progress / totalSteps) * 100;

  return (
    <>
      {/* ── Overlay with spotlight ── */}
      <div className="fixed inset-0" style={{ zIndex: 99998 }}>
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tutorial-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlight && (
                <rect
                  x={spotlight.x} y={spotlight.y}
                  width={spotlight.w} height={spotlight.h}
                  rx={spotlight.r} fill="black"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }}
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(15,23,42,0.55)"
            mask="url(#tutorial-mask)"
          />
          {spotlight && (
            <rect
              x={spotlight.x} y={spotlight.y}
              width={spotlight.w} height={spotlight.h}
              rx={spotlight.r}
              fill="none" stroke="rgba(165,180,252,0.5)" strokeWidth="2"
              style={{ transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }}
            />
          )}
        </svg>
      </div>

      {/* ── Animated cursor ── */}
      {cursorVisible && (
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 100001,
            left: cursorPos.x - 6,
            top: cursorPos.y - 2,
            transition: 'left 0.5s cubic-bezier(0.34,1.56,0.64,1), top 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s ease',
            transform: `scale(${cursorScale})`,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="rgb(79,70,229)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <div className="absolute top-0 left-0 w-6 h-6 rounded-full bg-indigo-400/30 animate-ping" />
        </div>
      )}

      {/* ── Tooltip ── */}
      {tooltip && (
        <div
          className="fixed animate-fade-in"
          style={{ ...tooltip.style, zIndex: 100000 }}
        >
          <div className="rounded-2xl bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden" style={{ minWidth: 280 }}>
            {/* Progress bar */}
            <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500">
              <div
                className="h-full bg-white/40 transition-all duration-700"
                style={{ width: `${100 - progressPct}%`, marginLeft: 'auto' }}
              />
            </div>

            <div className="px-5 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5">
                  {tooltip.icon && <span className="text-xl">{tooltip.icon}</span>}
                  <h3 className="text-[15px] font-bold text-slate-900">{tooltip.title}</h3>
                </div>
                <button
                  onClick={handleSkip}
                  className="mt-0.5 p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-500 pl-[30px] whitespace-pre-line">
                {tooltip.desc}
              </p>
            </div>

            <div className="px-5 py-2.5 bg-slate-50/60">
              {/* Don't show again checkbox on last step */}
              {progress >= totalSteps && (
                <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500">다시 표시 하지 않음</span>
                </label>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">
                  {progress} / {totalSteps}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSkip}
                    className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Skip
                  </button>
                  {showNextBtn && (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 pl-3.5 pr-2.5 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all active:scale-95"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
