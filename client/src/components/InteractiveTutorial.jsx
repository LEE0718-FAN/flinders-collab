import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { createRoom, deleteRoom, getRoom, getRooms } from '@/services/rooms';
import { createEvent } from '@/services/events';

const TUTORIAL_KEY = 'tutorial-completed';
const TUTORIAL_ROOM_NAME = '🎓 Tutorial Room';

export default function InteractiveTutorial() {
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [active, setActive] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorScale, setCursorScale] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);
  const [spotlight, setSpotlight] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [showNextBtn, setShowNextBtn] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);
  const nextRef = useRef(null);
  const createdRoomIdRef = useRef(null);
  const totalSteps = 15;

  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    let cancelled = false;
    getRooms()
      .then((rooms) => {
        if (cancelled) return;
        const list = Array.isArray(rooms) ? rooms : rooms?.rooms || [];
        if (list.length === 0) {
          setTimeout(() => { if (!cancelled) setShowPrompt(true); }, 1200);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = () => { setShowPrompt(false); setActive(true); };
    window.addEventListener('start-interactive-tutorial', handler);
    return () => window.removeEventListener('start-interactive-tutorial', handler);
  }, []);

  // ── Utilities ──
  const sleep = useCallback((ms) =>
    new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve(); } }, ms);
      const check = setInterval(() => {
        if (cancelRef.current && !done) { done = true; clearTimeout(t); clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => clearInterval(check), ms + 50);
    }), []);

  const waitForEl = useCallback((selector, timeout = 8000) =>
    new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) { clearInterval(interval); resolve(el); return; }
        if (Date.now() - start > timeout || cancelRef.current) { clearInterval(interval); resolve(null); }
      }, 150);
    }), []);

  const waitForNext = useCallback(() =>
    new Promise((resolve) => { setShowNextBtn(true); nextRef.current = resolve; }), []);

  const handleNext = useCallback(() => {
    setShowNextBtn(false); nextRef.current?.(); nextRef.current = null;
  }, []);

  const moveCursorTo = useCallback(async (target) => {
    let x, y;
    if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    } else { x = target.x; y = target.y; }
    setCursorVisible(true);
    setCursorPos({ x, y });
    await sleep(500);
  }, [sleep]);

  const clickEl = useCallback(async (selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    await moveCursorTo(selector);
    setCursorScale(0.75); await sleep(120); setCursorScale(1);
    el.click();
    await sleep(300);
  }, [moveCursorTo, sleep]);

  const spotlightEl = useCallback((selector) => {
    const el = document.querySelector(selector);
    if (!el) { setSpotlight(null); return; }
    const r = el.getBoundingClientRect();
    const pad = 10;
    setSpotlight({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2, r: 14 });
  }, []);

  const showTip = useCallback((title, desc, options = {}) => {
    const tw = Math.min(320, window.innerWidth - 24);
    if (options.center || !options.target) {
      setTooltip({ title, desc, style: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: tw }, icon: options.icon });
      setSpotlight(null);
      return;
    }
    const el = document.querySelector(options.target);
    if (!el) {
      setTooltip({ title, desc, style: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: tw }, icon: options.icon });
      setSpotlight(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const gap = 14;
    const style = { position: 'fixed', width: tw };
    const pos = options.position || 'bottom';
    if (pos === 'bottom') { style.top = r.bottom + gap + 10; style.left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12)); }
    else if (pos === 'top') { style.bottom = window.innerHeight - r.top + gap; style.left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12)); }
    else if (pos === 'right') { style.top = Math.max(12, r.top + r.height / 2 - 50); style.left = Math.min(r.right + gap, window.innerWidth - tw - 12); }
    if (style.top !== undefined && style.top > window.innerHeight - 180) { delete style.top; style.bottom = window.innerHeight - r.top + gap; }
    setTooltip({ title, desc, style, icon: options.icon });
    spotlightEl(options.target);
  }, [spotlightEl]);

  const typeInto = useCallback(async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const isTextarea = el.tagName === 'TEXTAREA';
    const proto = isTextarea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return;
    await moveCursorTo(selector);
    el.focus();
    for (let i = 1; i <= text.length; i++) {
      if (cancelRef.current) return;
      setter.call(el, text.slice(0, i));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(35 + Math.random() * 15);
    }
    await sleep(200);
  }, [moveCursorTo, sleep]);

  const setInputValue = useCallback((selector, value) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  }, []);

  const safeDeleteTutorialRoom = useCallback(async () => {
    const roomId = createdRoomIdRef.current;
    if (!roomId) return;
    try {
      const room = await getRoom(roomId);
      const name = room?.name || room?.room?.name || '';
      if (name === TUTORIAL_ROOM_NAME) await deleteRoom(roomId);
    } catch { /* room may already be gone */ }
    createdRoomIdRef.current = null;
    window.dispatchEvent(new CustomEvent('rooms-updated'));
  }, []);

  const cleanup = useCallback(async () => {
    setTooltip(null); setSpotlight(null); setCursorVisible(false); setShowOverlay(false); setShowNextBtn(false);
    await safeDeleteTutorialRoom();
    navigate('/dashboard');
  }, [navigate, safeDeleteTutorialRoom]);

  // ── Main tutorial flow ──
  const runTutorial = useCallback(async () => {
    cancelRef.current = false;
    const bail = () => cancelRef.current;
    const end = async () => { await cleanup(); setActive(false); };

    // ── 1: Welcome ──
    setProgress(1);
    setShowOverlay(true);
    navigate('/dashboard');
    showTip('Welcome!', "I'll give you a quick tour!", { center: true, icon: '👋' });
    await waitForNext(); if (bail()) { await end(); return; }

    // ── 2: Create Room ──
    setProgress(2);
    setTooltip(null); setSpotlight(null);
    const createBtn = await waitForEl('[data-tour="create-room"]');
    if (!createBtn || bail()) { await end(); return; }
    await sleep(300);
    showTip('Create Room', 'Make a study room here.', { target: '[data-tour="create-room"]', icon: '✨', position: 'bottom' });
    await moveCursorTo('[data-tour="create-room"]');
    await waitForNext(); if (bail()) { await end(); return; }

    // ── 3: Join Room ──
    setProgress(3);
    setTooltip(null); setSpotlight(null);
    const joinBtn = await waitForEl('[data-tour="join-room"]');
    if (joinBtn && !bail()) {
      showTip('Join Room', 'Got an invite code? Join here.', { target: '[data-tour="join-room"]', icon: '🔗', position: 'bottom' });
      await moveCursorTo('[data-tour="join-room"]');
      await waitForNext(); if (bail()) { await end(); return; }
    }

    // ── 4: Let's create a room ──
    setProgress(4);
    setTooltip(null); setSpotlight(null); setCursorVisible(false);
    showTip("Let's make a room!", "I'll create one and show you\nwhat's inside.", { center: true, icon: '🚀' });
    await waitForNext(); if (bail()) { await end(); return; }

    // ── 5: Open dialog & type ──
    setProgress(5);
    setTooltip(null); setSpotlight(null);
    setShowOverlay(false);
    await sleep(200);
    const triggerBtn = document.querySelector('[data-tour="create-room"] button');
    if (triggerBtn) {
      await moveCursorTo('[data-tour="create-room"] button');
      setCursorScale(0.75); await sleep(120); setCursorScale(1);
      triggerBtn.click();
    }
    await sleep(600); if (bail()) { await end(); return; }
    const nameInput = await waitForEl('[role="dialog"] input');
    if (!nameInput || bail()) { await end(); return; }
    await typeInto('[role="dialog"] input', TUTORIAL_ROOM_NAME);
    if (bail()) { await end(); return; }

    // ── 6: Create room via API ──
    setProgress(6);
    let tutorialRoomId = null;
    try {
      const result = await createRoom({ name: TUTORIAL_ROOM_NAME });
      tutorialRoomId = result?.id || result?.room?.id;
    } catch { /* fail */ }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(400);
    if (!tutorialRoomId || bail()) { await end(); return; }
    createdRoomIdRef.current = tutorialRoomId;
    window.dispatchEvent(new CustomEvent('rooms-updated'));
    await sleep(600);

    // ── 7: Enter room ──
    setProgress(7);
    setShowOverlay(true);
    showTip('Room Created!', "Let's go inside!", { center: true, icon: '🎉' });
    await waitForNext(); if (bail()) { await end(); return; }
    setTooltip(null); setSpotlight(null); setCursorVisible(false);
    navigate(`/rooms/${tutorialRoomId}`);
    await sleep(1500); if (bail()) { await end(); return; }

    // ── 8: Schedule tab — add an event ──
    setProgress(8);
    const scheduleTab = await waitForEl('[data-tour="tab-schedule"]');
    if (scheduleTab && !bail()) {
      showTip('Schedule', "Your team calendar.\nLet me add an event!", { target: '[data-tour="tab-schedule"]', icon: '📆', position: 'bottom' });
      await clickEl('[data-tour="tab-schedule"]');
      await waitForNext(); if (bail()) { await end(); return; }

      // Click "Add Event" button
      setTooltip(null); setSpotlight(null);
      setShowOverlay(false);
      const addEventBtn = await waitForEl('button.bg-indigo-600');
      if (addEventBtn && !bail()) {
        await clickEl('button.bg-indigo-600');
        await sleep(600);

        // Type event title
        const eventTitleInput = await waitForEl('[role="dialog"] input');
        if (eventTitleInput && !bail()) {
          await typeInto('[role="dialog"] input', 'Team Study Session');
          await sleep(300);

          // Create event via API
          try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await createEvent(tutorialRoomId, {
              title: 'Team Study Session',
              category: 'study',
              start_time: new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString(),
              end_time: new Date(tomorrow.setHours(16, 0, 0, 0)).toISOString(),
            });
          } catch { /* ok */ }

          // Close dialog
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          await sleep(500);
        }
      }
      setShowOverlay(true);
    }
    if (bail()) { await end(); return; }

    // ── 9: Tasks tab — add a task ──
    setProgress(9);
    setTooltip(null); setSpotlight(null);
    const tasksTab = await waitForEl('[data-tour="tab-tasks"]');
    if (tasksTab && !bail()) {
      showTip('Tasks', "Assign work to teammates.\nLet me create one!", { target: '[data-tour="tab-tasks"]', icon: '✅', position: 'bottom' });
      await clickEl('[data-tour="tab-tasks"]');
      await waitForNext(); if (bail()) { await end(); return; }

      // Click "New Task" button
      setTooltip(null); setSpotlight(null);
      await sleep(400);
      // Find the New Task button
      const newTaskBtns = document.querySelectorAll('button');
      let newTaskBtn = null;
      for (const btn of newTaskBtns) {
        if (btn.textContent.includes('New Task')) { newTaskBtn = btn; break; }
      }
      if (newTaskBtn && !bail()) {
        await moveCursorTo({ x: newTaskBtn.getBoundingClientRect().left + newTaskBtn.getBoundingClientRect().width / 2, y: newTaskBtn.getBoundingClientRect().top + newTaskBtn.getBoundingClientRect().height / 2 });
        setCursorScale(0.75); await sleep(120); setCursorScale(1);
        newTaskBtn.click();
        await sleep(500);

        // Type task title
        const taskInput = await waitForEl('input[placeholder="What needs to be done?"]');
        if (taskInput && !bail()) {
          await typeInto('input[placeholder="What needs to be done?"]', 'Review lecture notes');
          await sleep(300);

          // Submit task
          const submitBtns = document.querySelectorAll('form button[type="submit"]');
          const taskSubmit = submitBtns[submitBtns.length - 1];
          if (taskSubmit) {
            await moveCursorTo({ x: taskSubmit.getBoundingClientRect().left + taskSubmit.getBoundingClientRect().width / 2, y: taskSubmit.getBoundingClientRect().top + taskSubmit.getBoundingClientRect().height / 2 });
            setCursorScale(0.75); await sleep(120); setCursorScale(1);
            taskSubmit.click();
            await sleep(800);
          }
        }
      }
      setShowOverlay(true);
    }
    if (bail()) { await end(); return; }

    // ── 10: Chat tab ──
    setProgress(10);
    setTooltip(null); setSpotlight(null);
    const chatTab = await waitForEl('[data-tour="tab-chat"]');
    if (chatTab && !bail()) {
      showTip('Chat', 'Message your team in real time.\nSend files and images too!', { target: '[data-tour="tab-chat"]', icon: '💬', position: 'bottom' });
      await clickEl('[data-tour="tab-chat"]');
      await waitForNext(); if (bail()) { await end(); return; }
    }

    // ── 11: Files tab ──
    setProgress(11);
    setTooltip(null); setSpotlight(null);
    const filesTab = await waitForEl('[data-tour="tab-files"]');
    if (filesTab && !bail()) {
      showTip('Files', 'Share notes, slides, anything!', { target: '[data-tour="tab-files"]', icon: '📁', position: 'bottom' });
      await clickEl('[data-tour="tab-files"]');
      await waitForNext(); if (bail()) { await end(); return; }
    }

    // ── 12: Deadlines page — show the event we just created ──
    setProgress(12);
    setTooltip(null); setSpotlight(null); setCursorVisible(false);
    navigate('/deadlines');
    await sleep(1000); if (bail()) { await end(); return; }
    showTip('Deadlines', 'Events from all rooms show up here!\nThe one we just made is here too.', { center: true, icon: '📅' });
    await waitForNext(); if (bail()) { await end(); return; }

    // ── 13: Board ──
    setProgress(13);
    setTooltip(null);
    navigate('/board');
    await sleep(800); if (bail()) { await end(); return; }
    showTip('Free Board', 'Post questions, find study groups,\nor share anonymously!', { center: true, icon: '📋' });
    await waitForNext(); if (bail()) { await end(); return; }

    // ── 14: Flinders Life ──
    setProgress(14);
    setTooltip(null);
    navigate('/flinders-life');
    await sleep(800); if (bail()) { await end(); return; }
    showTip('Flinders Life', 'Campus events, study rooms,\nacademic calendar — all here!', { center: true, icon: '🎓' });
    await waitForNext(); if (bail()) { await end(); return; }

    // ── 15: Done ──
    setProgress(15);
    setTooltip(null); setSpotlight(null); setCursorVisible(false);
    navigate('/dashboard');
    await sleep(500);
    showTip("That's it!", "The demo room will be cleaned up.\nNow create your own and get started!", { center: true, icon: '🎉' });
    await waitForNext();

    await end();
    localStorage.setItem(TUTORIAL_KEY, Date.now().toString());
  }, [navigate, sleep, waitForEl, waitForNext, moveCursorTo, clickEl, showTip, typeInto, setInputValue, cleanup]);

  const runTutorialRef = useRef(runTutorial);
  runTutorialRef.current = runTutorial;

  useEffect(() => {
    if (!active) return;
    runTutorialRef.current();
    return () => { cancelRef.current = true; };
  }, [active]);

  const handleSkip = useCallback(async () => {
    cancelRef.current = true;
    nextRef.current?.(); nextRef.current = null;
    await cleanup();
    setActive(false); setShowPrompt(false);
    if (dontShowAgain) localStorage.setItem(TUTORIAL_KEY, Date.now().toString());
  }, [cleanup, dontShowAgain]);

  const handleDecline = () => setShowPrompt(false);
  const handleNeverShow = () => { setShowPrompt(false); localStorage.setItem(TUTORIAL_KEY, Date.now().toString()); };
  const startTutorial = () => { setShowPrompt(false); setActive(true); };

  if (showPrompt && !active) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl animate-scale-in">
          <div className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full overflow-hidden shadow-lg shadow-indigo-500/30 ring-3 ring-indigo-100">
              <img src="/images/seungyun.png" alt="Seung Yun Lee" className="h-full w-full object-cover" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Hi, I'm Seung Yun!</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              I built this app for Flinders students.<br/>
              Let me give you a quick tour!
            </p>
          </div>
          <div className="mt-6 space-y-2">
            <button onClick={startTutorial} className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all active:scale-[0.98]">
              Show me around!
            </button>
            <button onClick={handleDecline} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-all">
              I'll figure it out myself
            </button>
            <button onClick={handleNeverShow} className="w-full text-[11px] text-slate-400 hover:text-slate-600 py-1 transition-colors">
              Don't ask again
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
      {showOverlay && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 99998 }}>
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tutorial-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlight && <rect x={spotlight.x} y={spotlight.y} width={spotlight.w} height={spotlight.h} rx={spotlight.r} fill="black" style={{ transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }} />}
              </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(15,23,42,0.55)" mask="url(#tutorial-mask)" />
            {spotlight && <rect x={spotlight.x} y={spotlight.y} width={spotlight.w} height={spotlight.h} rx={spotlight.r} fill="none" stroke="rgba(165,180,252,0.5)" strokeWidth="2" style={{ transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }} />}
          </svg>
        </div>
      )}

      {cursorVisible && (
        <div className="fixed pointer-events-none" style={{ zIndex: 100001, left: cursorPos.x - 6, top: cursorPos.y - 2, transition: 'left 0.5s cubic-bezier(0.34,1.56,0.64,1), top 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s ease', transform: `scale(${cursorScale})` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="rgb(79,70,229)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <div className="absolute top-0 left-0 w-6 h-6 rounded-full bg-indigo-400/30 animate-ping" />
        </div>
      )}

      {tooltip && (
        <div className="fixed animate-fade-in" style={{ ...tooltip.style, zIndex: 100000, pointerEvents: 'auto' }}>
          <div className="rounded-2xl bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden" style={{ minWidth: 280 }}>
            <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500">
              <div className="h-full bg-white/40 transition-all duration-700" style={{ width: `${100 - progressPct}%`, marginLeft: 'auto' }} />
            </div>
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5">
                  {tooltip.icon && <span className="text-xl">{tooltip.icon}</span>}
                  <h3 className="text-[15px] font-bold text-slate-900">{tooltip.title}</h3>
                </div>
                <button onClick={handleSkip} className="mt-0.5 p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-500 pl-[30px] whitespace-pre-line">{tooltip.desc}</p>
            </div>
            <div className="px-5 py-2.5 bg-slate-50/60">
              {progress >= totalSteps && (
                <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                  <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 cursor-pointer" />
                  <span className="text-[11px] text-slate-500">Don't show again</span>
                </label>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">{progress} / {totalSteps}</span>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkip} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">Skip</button>
                  {showNextBtn && (
                    <button onClick={handleNext} className="flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 pl-3.5 pr-2.5 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all active:scale-95">
                      Next <ChevronRight className="h-3.5 w-3.5" />
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
