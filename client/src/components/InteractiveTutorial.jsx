import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { createRoom, deleteRoom, getRoom, getRooms } from '@/services/rooms';
import { createEvent } from '@/services/events';

const TUTORIAL_KEY = 'tutorial-completed';
const TUTORIAL_ROOM_NAME = '🎓 Tutorial Room';
const TUTORIAL_ROOM_ID_KEY = 'tutorial-room-id';

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
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);
  const createdRoomIdRef = useRef(null);
  const totalSteps = 16;

  // ── Clean up any leftover tutorial room from a previous crashed session ──
  useEffect(() => {
    const leftover = localStorage.getItem(TUTORIAL_ROOM_ID_KEY);
    if (leftover) {
      localStorage.removeItem(TUTORIAL_ROOM_ID_KEY);
      getRoom(leftover)
        .then((room) => {
          const name = room?.name || room?.room?.name || '';
          if (name === TUTORIAL_ROOM_NAME) {
            deleteRoom(leftover)
              .then(() => window.dispatchEvent(new CustomEvent('rooms-updated')))
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    let cancelled = false;
    getRooms()
      .then((rooms) => {
        if (cancelled) return;
        const list = Array.isArray(rooms) ? rooms : rooms?.rooms || [];
        if (list.length === 0) setTimeout(() => { if (!cancelled) setShowPrompt(true); }, 1200);
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
        const found = document.querySelector(selector);
        if (found) { clearInterval(interval); resolve(found); return; }
        if (Date.now() - start > timeout || cancelRef.current) { clearInterval(interval); resolve(null); }
      }, 150);
    }), []);

  const moveCursorTo = useCallback(async (target) => {
    let x, y;
    if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    } else { x = target.x; y = target.y; }
    setCursorVisible(true); setCursorPos({ x, y });
    await sleep(450);
  }, [sleep]);

  // Simulate a real click — dispatch pointer/mouse events so Radix UI responds
  const simulateClick = useCallback((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.click();
  }, []);

  const clickEl = useCallback(async (selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    await moveCursorTo(selector);
    setCursorScale(0.75); await sleep(100); setCursorScale(1);
    simulateClick(el); await sleep(250);
  }, [moveCursorTo, sleep, simulateClick]);

  const clickDomEl = useCallback(async (el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    await moveCursorTo({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setCursorScale(0.75); await sleep(100); setCursorScale(1);
    simulateClick(el); await sleep(250);
  }, [moveCursorTo, sleep, simulateClick]);

  const spotlightEl = useCallback((selector) => {
    const el = document.querySelector(selector);
    if (!el) { setSpotlight(null); return; }
    const r = el.getBoundingClientRect();
    const pad = 10;
    setSpotlight({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2, r: 14 });
  }, []);

  const showTip = useCallback((title, desc, options = {}) => {
    const tw = Math.min(340, window.innerWidth - 24);
    // Sidebar is 256px wide on md+ screens — offset center to content area
    const sidebar = document.querySelector('aside');
    const sidebarW = (sidebar && sidebar.offsetWidth > 0) ? sidebar.getBoundingClientRect().width : 0;
    const centerLeft = sidebarW + (window.innerWidth - sidebarW) / 2;
    if (options.center || !options.target) {
      setTooltip({ title, desc, style: { position: 'fixed', top: '50%', left: centerLeft, transform: 'translate(-50%, -50%)', width: tw }, icon: options.icon });
      if (!options.keepSpotlight) setSpotlight(null);
      return;
    }
    const el = document.querySelector(options.target);
    if (!el) { setTooltip({ title, desc, style: { position: 'fixed', top: '50%', left: centerLeft, transform: 'translate(-50%, -50%)', width: tw }, icon: options.icon }); if (!options.keepSpotlight) setSpotlight(null); return; }
    const r = el.getBoundingClientRect();
    const gap = 14; const style = { position: 'fixed', width: tw };
    const pos = options.position || 'bottom';
    if (pos === 'bottom') { style.top = r.bottom + gap + 10; style.left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12)); }
    else if (pos === 'top') { style.bottom = window.innerHeight - r.top + gap; style.left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12)); }
    else if (pos === 'right') { style.top = Math.max(12, Math.min(r.top + r.height / 2 - 50, window.innerHeight - 200)); style.left = Math.max(12, Math.min(r.right + gap, window.innerWidth - tw - 12)); }
    else if (pos === 'left') { style.top = Math.max(12, Math.min(r.top + r.height / 2 - 50, window.innerHeight - 200)); style.right = window.innerWidth - r.left + gap; }
    if (style.top !== undefined && style.top > window.innerHeight - 160 && pos !== 'right' && pos !== 'left') { delete style.top; style.bottom = window.innerHeight - r.top + gap; }
    setTooltip({ title, desc, style, icon: options.icon });
    spotlightEl(options.target);
  }, [spotlightEl]);

  const typeInto = useCallback(async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return;
    await moveCursorTo(selector);
    el.focus();
    for (let i = 1; i <= text.length; i++) {
      if (cancelRef.current) return;
      setter.call(el, text.slice(0, i));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(30 + Math.random() * 15);
    }
    await sleep(200);
  }, [moveCursorTo, sleep]);

  const safeDeleteTutorialRoom = useCallback(async () => {
    const roomId = createdRoomIdRef.current;
    if (!roomId) return;
    try {
      // Try to delete directly — we know the ID, just delete it
      await deleteRoom(roomId);
    } catch {
      // If direct delete fails, try with name verification
      try {
        const room = await getRoom(roomId);
        const name = room?.name || room?.room?.name || '';
        if (name === TUTORIAL_ROOM_NAME) await deleteRoom(roomId);
      } catch { /* already gone */ }
    }
    createdRoomIdRef.current = null;
    localStorage.removeItem(TUTORIAL_ROOM_ID_KEY);
    window.dispatchEvent(new CustomEvent('rooms-updated'));
  }, []);

  const cleanup = useCallback(async () => {
    setTooltip(null); setSpotlight(null); setCursorVisible(false); setShowOverlay(false);
    // Delete room FIRST, then navigate — so dashboard loads without the room
    await safeDeleteTutorialRoom();
    navigate('/dashboard');
    // Fire multiple times to ensure sidebar + dashboard both refresh
    window.dispatchEvent(new CustomEvent('rooms-updated'));
    setTimeout(() => window.dispatchEvent(new CustomEvent('rooms-updated')), 800);
    setTimeout(() => window.dispatchEvent(new CustomEvent('rooms-updated')), 2000);
  }, [navigate, safeDeleteTutorialRoom]);

  // ── Helper: find button by text ──
  const findBtn = useCallback((text) => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent.includes(text)) return b; }
    return null;
  }, []);

  // ── Auto-advancing tutorial (no Next button) ──
  const runTutorial = useCallback(async () => {
    cancelRef.current = false;
    const bail = () => cancelRef.current;
    const end = async () => { await cleanup(); setActive(false); };
    const pause = (ms) => sleep(ms);
    const totalStepsLocal = 14;
    const setP = (n) => { setProgress(n); };

    // ── 1: Welcome ──
    setP(1); setShowOverlay(true);
    navigate('/dashboard');
    await waitForEl('[data-tour="create-room"]');
    await sleep(1000);
    showTip('Welcome!', "Hey! I'm Sean. I made this app for Flinders students. Let me show you how it works!", { center: true, icon: '👋' });
    await pause(4000); if (bail()) { await end(); return; }

    // ── 2: Create Room button ──
    setP(2); setTooltip(null); setSpotlight(null);
    await waitForEl('[data-tour="create-room"]');
    if (bail()) { await end(); return; }
    showTip('Create Room', "This button creates a study room. Think of it like a group chat, but with a calendar, tasks, files, and more!", { target: '[data-tour="create-room"]', icon: '✨', position: 'bottom' });
    await moveCursorTo('[data-tour="create-room"]');
    await pause(4500); if (bail()) { await end(); return; }

    // ── 3: Join Room button ──
    setP(3); setTooltip(null); setSpotlight(null);
    const joinBtn = await waitForEl('[data-tour="join-room"]');
    if (joinBtn && !bail()) {
      showTip('Join Room', "If your friend already made a room, they can share an invite code with you. Just paste it here and you're in!", { target: '[data-tour="join-room"]', icon: '🔗', position: 'bottom' });
      await moveCursorTo('[data-tour="join-room"]');
      await pause(4000); if (bail()) { await end(); return; }
    }

    // ── 3.5: Sidebar navigation ──
    setTooltip(null); setSpotlight(null); setCursorVisible(false);
    const sidebarEl = document.querySelector('aside');
    if (sidebarEl && !bail()) {
      // Spotlight the whole sidebar and show tip in content area
      const sr = sidebarEl.getBoundingClientRect();
      setSpotlight({ x: sr.left, y: sr.top, w: sr.width, h: sr.height, r: 0 });
      showTip('Sidebar', "This sidebar is your main navigation — Dashboard, Deadlines, Free Board, Flinders Life, and your rooms all live here.", { center: true, icon: '📌', keepSpotlight: true });
      await pause(5000); if (bail()) { await end(); return; }
    }

    // ── 4: Let's make a room ──
    setP(4); setTooltip(null); setSpotlight(null); setCursorVisible(false);
    showTip("Let's try it!", "Alright, let me create a room so you can see how everything works inside.", { center: true, icon: '🚀' });
    await pause(3500); if (bail()) { await end(); return; }

    // ── 5: Open dialog, type room name, create via API ──
    setP(5); setTooltip(null); setSpotlight(null); setShowOverlay(false);
    await sleep(300);
    const triggerBtn = document.querySelector('[data-tour="create-room"] button');
    if (triggerBtn) await clickDomEl(triggerBtn);
    await sleep(600); if (bail()) { await end(); return; }

    const nameInput = await waitForEl('[role="dialog"] input');
    if (!nameInput || bail()) { await end(); return; }
    await typeInto('[role="dialog"] input', TUTORIAL_ROOM_NAME);
    if (bail()) { await end(); return; }
    await pause(1000);

    // Create room via API
    setTooltip(null);
    let tutorialRoomId = null;
    try {
      const result = await createRoom({ name: TUTORIAL_ROOM_NAME });
      tutorialRoomId = result?.id || result?.room?.id;
    } catch { /* fail */ }
    if (!tutorialRoomId || bail()) { await end(); return; }
    createdRoomIdRef.current = tutorialRoomId;
    localStorage.setItem(TUTORIAL_ROOM_ID_KEY, tutorialRoomId);

    setShowOverlay(true); setCursorVisible(false);
    showTip('Room Created!', "Done! The room's ready. Let's go inside and check out what you can do.", { center: true, icon: '🎉' });
    await pause(3500); if (bail()) { await end(); return; }

    // ── 6: Navigate into room — wait for it to fully load ──
    setP(6); setTooltip(null); setSpotlight(null);    navigate(`/rooms/${tutorialRoomId}`);
    window.dispatchEvent(new CustomEvent('rooms-updated'));
    showTip('Entering Room...', "Loading your new room... hang tight!", { center: true, icon: '⏳' });
    const roomTabs = await waitForEl('[data-tour="tab-schedule"]', 15000);
    if (!roomTabs || bail()) { await end(); return; }
       await sleep(2000);
    showTip('Welcome to Your Room!', "This is your room! Each tab up there has a different feature — schedule, tasks, chat, files, and more. Let me show you.", { center: true, icon: '🏠' });
    await pause(5000); if (bail()) { await end(); return; }

    // ── 6.5: Invite code ──
    setTooltip(null); setSpotlight(null);
    const inviteBtn = document.querySelector('button code.font-mono')?.closest('button');
    if (inviteBtn && !bail()) {
      showTip('Invite Code', "This is your room's invite code. Share it with friends so they can join instantly from the dashboard!", { center: true, icon: '🔑' });
      const r = inviteBtn.getBoundingClientRect();
      setSpotlight({ x: r.left - 10, y: r.top - 10, w: r.width + 20, h: r.height + 20, r: 14 });
      await moveCursorTo({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      await pause(4500); if (bail()) { await end(); return; }
    }

    // ── 7: Schedule tab — click tab, add event via form ──
    setP(7); setTooltip(null); setSpotlight(null);
    showTip('Schedule', "Your team calendar for events!", { target: '[data-tour="tab-schedule"]', icon: '📆', position: 'bottom' });
    await pause(2500); if (bail()) { await end(); return; }

    // Click schedule tab and wait for content to appear
    await clickEl('[data-tour="tab-schedule"]');
    await sleep(1000);

    // Wait for "Add Event" button to appear in schedule content
    let addEventBtn = null;
    for (let i = 0; i < 15; i++) {
      addEventBtn = findBtn('Add Event');
      if (addEventBtn) break;
      await sleep(300);
    }

    if (addEventBtn && !bail()) {
      // Click the Add Event button
      setTooltip(null); setShowOverlay(false);
      await clickDomEl(addEventBtn);
      await sleep(1000);

      // Wait for event dialog — hide tooltip while interacting
      const eventDialog = await waitForEl('[role="dialog"]', 5000);
      if (eventDialog && !bail()) {
        await sleep(500);

        // Pick "study" category
        const allCatBtns = document.querySelectorAll('[role="dialog"] button[type="button"]');
        for (const btn of allCatBtns) {
          if (btn.textContent.includes('Study')) {
            await clickDomEl(btn);
            await sleep(500);
            break;
          }
        }

        // Type event title
        const titleInput = document.querySelector('[role="dialog"] input[placeholder*="Group Meeting"]');
        if (titleInput && !bail()) {
          await typeInto('[role="dialog"] input[placeholder*="Group Meeting"]', 'Team Study Session');
          await pause(600);
        }

        // Type location
        const locInput = document.querySelector('[role="dialog"] input[placeholder*="Flinders Library"]');
        if (locInput && !bail()) {
          await typeInto('[role="dialog"] input[placeholder*="Flinders Library"]', 'Flinders Library Room 3');
          await pause(600);
        }

        // Click submit button inside the dialog
        if (!bail()) {
          const dialogBtns = document.querySelectorAll('[role="dialog"] button[type="submit"]');
          const submitBtn = dialogBtns.length > 0 ? dialogBtns[dialogBtns.length - 1] : null;
          if (submitBtn) {
            await clickDomEl(submitBtn);
            await sleep(2000);
          }
        }

        setShowOverlay(true);
        showTip('Event Added!', "It's on the calendar now! Everyone in this room can see it.", { center: true, icon: '🎉' });
        await pause(3500); if (bail()) { await end(); return; }
      }
    } else if (!bail()) {
      // Fallback: create event via API if button not found
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = new Date(tomorrow); start.setHours(14, 0, 0, 0);
        const endT = new Date(tomorrow); endT.setHours(16, 0, 0, 0);
        await createEvent(tutorialRoomId, {
          title: 'Team Study Session', category: 'study',
          start_time: start.toISOString(), end_time: endT.toISOString(),
          location_name: 'Flinders Library Room 3',
        });
      } catch { /* ok */ }
      showTip('Event Added!', "Added a study session to the calendar!", { center: true, icon: '🎉' });
      await pause(3000); if (bail()) { await end(); return; }
    }

    // ── 8: Tasks tab — click tab, add task via inline form ──
    setP(8); setTooltip(null); setSpotlight(null);
    showTip('Tasks', "Assign to-dos to your teammates!", { target: '[data-tour="tab-tasks"]', icon: '✅', position: 'bottom' });
    await pause(2500); if (bail()) { await end(); return; }

    // Click tasks tab
    await clickEl('[data-tour="tab-tasks"]');
    await sleep(1200);

    // Find "New Task" button in the inline TaskList
    let newTaskBtn = null;
    for (let i = 0; i < 15; i++) {
      newTaskBtn = findBtn('New Task');
      if (newTaskBtn) break;
      await sleep(300);
    }

    if (newTaskBtn && !bail()) {
      // Hide tooltip while interacting with inline form
      setTooltip(null); setShowOverlay(false);
      await clickDomEl(newTaskBtn);
      await sleep(1000);

      // Wait for inline form to appear — look for the task title input
      const taskInput = await waitForEl('input[placeholder="What needs to be done?"]', 5000);
      if (taskInput && !bail()) {
        // Type task title
        await typeInto('input[placeholder="What needs to be done?"]', 'Review lecture notes');
        await pause(800);

        // Click "Select Members" to expand member picker
        if (!bail()) {
          let selectMembersBtn = null;
          for (let i = 0; i < 10; i++) {
            selectMembersBtn = findBtn('Select Members');
            if (selectMembersBtn) break;
            await sleep(200);
          }
          if (selectMembersBtn) {
            await clickDomEl(selectMembersBtn);
            await sleep(800);

            // Click the first member button in the picker grid
            const memberBtns = document.querySelectorAll('.grid button[type="button"]');
            if (memberBtns.length > 0 && !bail()) {
              await clickDomEl(memberBtns[0]);
              await sleep(600);
            }
          }
        }

        // Click "Create Task" submit button
        if (!bail()) {
          const submitBtn = findBtn('Create Task');
          if (submitBtn) {
            await clickDomEl(submitBtn);
            await sleep(2000);
          }
        }

        setShowOverlay(true);
        showTip('Task Created!', "Task assigned to a teammate! Check it off when it's done.", { center: true, icon: '🎉' });
        await pause(3000); if (bail()) { await end(); return; }
      } else if (!bail()) {
        setShowOverlay(true);
        showTip('Tasks', "Create tasks and assign them to your teammates here!", { center: true, icon: '✅' });
        await pause(3000); if (bail()) { await end(); return; }
      }
    } else if (!bail()) {
      setShowOverlay(true);
      showTip('Tasks', "Create tasks and assign them to your teammates here!", { center: true, icon: '✅' });
      await pause(3000); if (bail()) { await end(); return; }
    }

    // ── 9: Chat tab ──
    setP(9); setTooltip(null); setSpotlight(null);
    showTip('Chat', "Real-time messaging with your team!", { target: '[data-tour="tab-chat"]', icon: '💬', position: 'bottom' });
    await pause(2500); if (bail()) { await end(); return; }
    await clickEl('[data-tour="tab-chat"]');
    await sleep(1000);
    setTooltip(null);
    showTip('Chat', "Send messages, images, and files. Everything stays in the room!", { center: true, icon: '💬' });
    await pause(3500); if (bail()) { await end(); return; }

    // ── 10: Files tab ──
    setP(10); setTooltip(null); setSpotlight(null);
    showTip('Files', "Share notes, slides, PDFs here!", { target: '[data-tour="tab-files"]', icon: '📁', position: 'bottom' });
    await pause(2500); if (bail()) { await end(); return; }
    await clickEl('[data-tour="tab-files"]');
    await sleep(1000);
    setTooltip(null);
    showTip('Files', "Drag and drop any file — the whole team can download them!", { center: true, icon: '📁' });
    await pause(3500); if (bail()) { await end(); return; }

    // ── 11: Deadlines page ──
    setP(11); setTooltip(null); setSpotlight(null); setCursorVisible(false);    navigate('/deadlines');
    showTip('Loading...', "Opening Deadlines...", { center: true, icon: '⏳' });
    await waitForEl('main', 10000);
    await sleep(1500); setIsLoading(false); if (bail()) { await end(); return; }
    // Spotlight the main content area
    const deadlinesMain = document.querySelector('main');
    if (deadlinesMain) {
      const mr = deadlinesMain.getBoundingClientRect();
      setSpotlight({ x: mr.left + 10, y: mr.top + 10, w: mr.width - 20, h: Math.min(mr.height - 20, 400), r: 16 });
    }
    showTip('Deadlines', "All events from every room show up here! The study session we just added is here too.", { center: true, icon: '📅' });
    await pause(4000); if (bail()) { await end(); return; }

    // ── 12: Free Board ──
    setP(12); setTooltip(null); setSpotlight(null); setCursorVisible(false);    navigate('/board');
    showTip('Loading...', "Opening Free Board...", { center: true, icon: '⏳' });
    await waitForEl('[data-tour="board-new-post"]', 12000);
    await sleep(1500); setIsLoading(false); if (bail()) { await end(); return; }
    showTip('Free Board', "Community board for all Flinders students — post anything, find study groups, or organize meetups!", { center: true, icon: '📋' });
    await pause(3500); if (bail()) { await end(); return; }

    // Show New Post button, open dialog, demo typing, then close without posting
    setP(13); setTooltip(null); setSpotlight(null);
    const newPostBtn = await waitForEl('[data-tour="board-new-post"]', 5000);
    if (newPostBtn && !bail()) {
      showTip('New Post', "Let me show you how to create a post!", { target: '[data-tour="board-new-post"]', icon: '✏️', position: 'bottom' });
      await moveCursorTo('[data-tour="board-new-post"]');
      await pause(3000); if (bail()) { await end(); return; }

      // Open the dialog — hide tooltip while interacting
      setTooltip(null); setShowOverlay(false);
      await clickDomEl(newPostBtn);
      await sleep(1500);

      const postDialog = await waitForEl('[role="dialog"]', 5000);
      if (postDialog && !bail()) {
        await sleep(500);

        // Select "Meetup" category
        const allCatBtns2 = postDialog.querySelectorAll('button');
        for (const btn of allCatBtns2) {
          if (btn.textContent.includes('Meetup')) {
            await clickDomEl(btn);
            await sleep(600);
            break;
          }
        }

        // Type title
        const postTitle = postDialog.querySelector('input[placeholder="Title"]');
        if (postTitle && !bail()) {
          await typeInto('[role="dialog"] input[placeholder="Title"]', 'City Campus meetup this Friday?');
          await pause(600);
        }

        // Type content
        const postContent = postDialog.querySelector('textarea[placeholder="What\'s on your mind?"]');
        if (postContent && !bail()) {
          await typeInto('[role="dialog"] textarea[placeholder="What\'s on your mind?"]', 'Anyone down to grab coffee at Victoria Square after class?');
          await pause(600);
        }

        // Click "Add Poll" button
        if (!bail()) {
          const dialogBtns = postDialog.querySelectorAll('button');
          let pollBtn = null;
          for (const b of dialogBtns) { if (b.textContent.includes('Add Poll')) { pollBtn = b; break; } }
          if (pollBtn) {
            await clickDomEl(pollBtn);
            await sleep(1000);

            const pollOpt1 = postDialog.querySelector('input[placeholder="Option 1"]');
            const pollOpt2 = postDialog.querySelector('input[placeholder="Option 2"]');
            if (pollOpt1 && !bail()) {
              await typeInto('[role="dialog"] input[placeholder="Option 1"]', 'Friday 3pm');
              await sleep(400);
            }
            if (pollOpt2 && !bail()) {
              await typeInto('[role="dialog"] input[placeholder="Option 2"]', 'Friday 5pm');
              await pause(500);
            }
          }
        }

        // Brief pause then close
        await pause(1500); if (bail()) { await end(); return; }

        // Close the dialog without posting
        setTooltip(null); setShowOverlay(false);
        // Press Escape to close the dialog cleanly
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await sleep(800);
      }
      setShowOverlay(true);
    }

    // ── 14: Flinders Life — show 3 tabs ──
    setP(14); setTooltip(null); setSpotlight(null); setCursorVisible(false);    navigate('/flinders-life');
    await waitForEl('button[value="events"]', 12000);
    setIsLoading(false); if (bail()) { await end(); return; }

    // Events tab — already active by default
    showTip('Events', "Campus events, workshops, and career fairs at Flinders!", { target: 'button[value="events"]', icon: '🎪', position: 'bottom' });
    await pause(3000); if (bail()) { await end(); return; }

    // Academic Calendar tab — click it and highlight content
    setTooltip(null); setSpotlight(null);
    await clickEl('button[value="academic-calendar"]');
    await sleep(800);
    // Spotlight the tab content area
    const acadContent = document.querySelector('[role="tabpanel"]');
    if (acadContent) {
      const cr = acadContent.getBoundingClientRect();
      setSpotlight({ x: cr.left, y: cr.top, w: cr.width, h: Math.min(cr.height, 350), r: 12 });
    }
    showTip('Academic Calendar', "Semester dates, exam periods, and holidays — never miss a deadline!", { target: 'button[value="academic-calendar"]', icon: '📅', position: 'bottom' });
    await pause(3500); if (bail()) { await end(); return; }

    // Study Rooms tab — click it and highlight content
    setTooltip(null); setSpotlight(null);
    await clickEl('button[value="study-rooms"]');
    await sleep(800);
    const studyContent = document.querySelector('[role="tabpanel"]');
    if (studyContent) {
      const cr2 = studyContent.getBoundingClientRect();
      setSpotlight({ x: cr2.left, y: cr2.top, w: cr2.width, h: Math.min(cr2.height, 350), r: 12 });
    }
    showTip('Study Rooms', "Book study rooms at City Campus or Bedford Park — links right here!", { target: 'button[value="study-rooms"]', icon: '📚', position: 'bottom' });
    await pause(3500); if (bail()) { await end(); return; }

    // ── 15: Done ──
    setP(15); setTooltip(null); setSpotlight(null); setCursorVisible(false);
    showTip('All done!', "That's everything! The demo room will be cleaned up. Now go create your own room and start collaborating!", { center: true, icon: '🎉' });
    await pause(3500);

    await end();
    localStorage.setItem(TUTORIAL_KEY, Date.now().toString());
  }, [navigate, sleep, waitForEl, moveCursorTo, clickEl, clickDomEl, showTip, typeInto, cleanup, findBtn, simulateClick]);

  const runTutorialRef = useRef(runTutorial);
  runTutorialRef.current = runTutorial;

  useEffect(() => {
    if (!active) return;
    runTutorialRef.current();
    return () => { cancelRef.current = true; };
  }, [active]);

  const handleStop = useCallback(async (permanent) => {
    cancelRef.current = true;
    await cleanup();
    setActive(false); setShowPrompt(false);
    if (permanent) localStorage.setItem(TUTORIAL_KEY, Date.now().toString());
  }, [cleanup]);

  const handleDecline = () => setShowPrompt(false);
  const handleNeverShow = () => { setShowPrompt(false); localStorage.setItem(TUTORIAL_KEY, Date.now().toString()); };
  const startTutorial = () => { setShowPrompt(false); setActive(true); };

  // ── Prompt modal ──
  if (showPrompt && !active) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl animate-scale-in">
          <div className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full overflow-hidden shadow-lg shadow-indigo-500/30 ring-3 ring-indigo-100">
              <img src="/images/seungyun.png" alt="Sean Lee" className="h-full w-full object-cover" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Hi, I'm Sean!</h2>
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
      {/* ── Fixed top-right control bar ── */}
      <div className="fixed top-4 right-4 z-[100002] flex items-center gap-2 animate-fade-in" style={{ pointerEvents: 'auto' }}>
        <button
          onClick={() => handleStop(true)}
          className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold text-slate-400 shadow-lg border border-white/60 hover:bg-white hover:text-slate-600 transition-all"
        >
          Don't show again
        </button>
        <button
          onClick={() => handleStop(false)}
          className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-lg border border-white/60 hover:bg-white hover:text-slate-700 transition-all"
        >
          <X className="h-3 w-3" />
          Exit
        </button>
      </div>

      {/* ── Overlay ── */}
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

      {/* ── Cursor ── */}
      {cursorVisible && (
        <div className="fixed pointer-events-none" style={{ zIndex: 100001, left: cursorPos.x - 6, top: cursorPos.y - 2, transition: 'left 0.5s cubic-bezier(0.34,1.56,0.64,1), top 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s ease', transform: `scale(${cursorScale})` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="rgb(79,70,229)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <div className="absolute top-0 left-0 w-6 h-6 rounded-full bg-indigo-400/30 animate-ping" />
        </div>
      )}

      {/* ── Tooltip ── */}
      {tooltip && (
        <div className="fixed animate-fade-in" style={{ ...tooltip.style, zIndex: 100000, pointerEvents: 'none' }}>
          <div className="rounded-2xl bg-white shadow-[0_25px_60px_-12px_rgba(0,0,0,0.4)] border border-slate-200/80 overflow-hidden" style={{ minWidth: 290 }}>
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500">
              <div className="h-full bg-white/40 transition-all duration-700" style={{ width: `${100 - progressPct}%`, marginLeft: 'auto' }} />
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-2">
                {tooltip.icon && <span className="text-2xl">{tooltip.icon}</span>}
                <h3 className="text-[17px] font-black text-slate-950 tracking-tight leading-snug">{tooltip.title}</h3>
              </div>
              <p className="text-[14px] leading-[1.7] text-slate-800 font-semibold pl-[34px]">{tooltip.desc}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
