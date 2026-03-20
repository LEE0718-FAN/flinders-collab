import { getAuthHeaders } from './api-headers';

const API = import.meta.env.VITE_API_BASE_URL || '';

function emitPushDebug(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('push-debug', { detail }));
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    emitPushDebug({ status: 'error', stage: 'capability', message: 'Push is not supported on this device/browser.' });
    return null;
  }
  if (!('Notification' in window)) {
    emitPushDebug({ status: 'error', stage: 'notification-api', message: 'Notification API is not available.' });
    return null;
  }

  try {
    // Request notification permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      emitPushDebug({ status: 'error', stage: 'permission', message: `Notification permission is ${permission}.` });
      return null;
    }
    emitPushDebug({ status: 'info', stage: 'permission', message: 'Notification permission granted.' });

    const registration = await navigator.serviceWorker.ready;
    emitPushDebug({ status: 'info', stage: 'service-worker', message: 'Service worker is ready.' });

    // Get VAPID key from server
    const keyRes = await fetch(`${API}/api/push/vapid-key`);
    if (!keyRes.ok) {
      const text = await keyRes.text();
      throw new Error(`VAPID key request failed (${keyRes.status}): ${text.slice(0, 120)}`);
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      emitPushDebug({ status: 'error', stage: 'vapid-key', message: 'VAPID public key is missing.' });
      return null;
    }
    emitPushDebug({ status: 'info', stage: 'vapid-key', message: 'VAPID key loaded.' });

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      emitPushDebug({ status: 'info', stage: 'push-manager', message: 'Creating a new push subscription...' });
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } else {
      emitPushDebug({ status: 'info', stage: 'push-manager', message: 'Existing push subscription found.' });
    }

    // Send subscription to server
    const subscribeRes = await fetch(`${API}/api/push/subscribe`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });
    if (!subscribeRes.ok) {
      const text = await subscribeRes.text();
      throw new Error(`Subscription save failed (${subscribeRes.status}): ${text.slice(0, 120)}`);
    }

    emitPushDebug({
      status: 'success',
      stage: 'subscribe',
      message: 'Push subscription was saved on the server.',
      endpoint: subscription.endpoint,
    });

    return subscription;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    emitPushDebug({
      status: 'error',
      stage: 'subscribe',
      message: err?.message || 'Push subscription failed.',
    });
    return null;
  }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await subscription.unsubscribe();
    await fetch(`${API}/api/push/unsubscribe`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (err) {
    console.warn('Push unsubscribe failed:', err);
  }
}

// Cache API data for offline viewing
export function cacheForOffline(url, data) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_API',
      url,
      data,
    });
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}
