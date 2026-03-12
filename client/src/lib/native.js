/**
 * Android-safe native helpers.
 * Wraps browser APIs so they work inside Capacitor WebView and on plain web.
 *
 * Capacitor plugins (if installed) are accessed via window.Capacitor.Plugins
 * to avoid static/dynamic import errors during Vite builds.
 */

const isCapacitor = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

function getCapPlugin(name) {
  return isCapacitor() ? window.Capacitor?.Plugins?.[name] : null;
}

/**
 * Request geolocation permission (no-op on web; Capacitor handles via plugin).
 * Returns true if permission is available.
 */
export async function requestLocationPermission() {
  const geo = getCapPlugin('Geolocation');
  if (geo) {
    try {
      const status = await geo.requestPermissions();
      return status.location === 'granted';
    } catch {
      // plugin not available — fall through to web
    }
  }

  // Web fallback: permissions API or just try getCurrentPosition
  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state !== 'denied';
    } catch {
      // query not supported for geolocation in some browsers
    }
  }
  return !!navigator.geolocation;
}

/**
 * Get current position. Returns { latitude, longitude, accuracy }.
 * Throws with a user-friendly message on failure.
 */
export async function getCurrentPosition(options = {}) {
  const opts = { enableHighAccuracy: true, timeout: 15000, ...options };

  const geo = getCapPlugin('Geolocation');
  if (geo) {
    try {
      const pos = await geo.getCurrentPosition(opts);
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch {
      // fall through to web
    }
  }

  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const messages = {
          1: 'Location permission denied. Please allow location access in your device settings.',
          2: 'Unable to determine your location. Please try again.',
          3: 'Location request timed out. Please try again.',
        };
        reject(new Error(messages[err.code] || 'Failed to get location.'));
      },
      opts,
    );
  });
}

/**
 * Watch position continuously. Returns a watchId that can be passed to clearLocationWatch().
 * `onUpdate({ latitude, longitude, accuracy })` is called on each update.
 * `onError(Error)` is called on failures.
 */
export function watchPosition(onUpdate, onError, options = {}) {
  const opts = { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000, ...options };

  // For Capacitor we'd use the plugin, but the web API works in the WebView too
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation is not supported by this browser.'));
    return null;
  }

  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
    (err) => {
      const messages = {
        1: 'Location permission denied.',
        2: 'Unable to determine your location.',
        3: 'Location request timed out.',
      };
      onError?.(new Error(messages[err.code] || 'Location watch failed.'));
    },
    opts,
  );

  return id;
}

/**
 * Clear a location watch by its id.
 */
export function clearLocationWatch(watchId) {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Copy text to clipboard (Android-safe).
 */
export async function copyToClipboard(text) {
  const clip = getCapPlugin('Clipboard');
  if (clip) {
    try {
      await clip.write({ string: text });
      return;
    } catch {
      // fall through
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Legacy fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}
