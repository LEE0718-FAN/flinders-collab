import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Clipboard } from '@capacitor/clipboard';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function getCurrentPosition(options = { enableHighAccuracy: true }) {
  if (isNativeApp()) {
    const permission = await Geolocation.requestPermissions();

    if (
      permission.location !== 'granted'
      && permission.coarseLocation !== 'granted'
    ) {
      throw new Error('Location permission was denied');
    }

    return Geolocation.getCurrentPosition(options);
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Watch position continuously. Works on both native (Capacitor) and web.
 * Returns a watchId that can be passed to clearWatch().
 *
 * On native, the watchId is the Capacitor callback ID string.
 * On web, the watchId is the numeric id from navigator.geolocation.watchPosition.
 */
export async function watchPosition(onSuccess, onError, options = { enableHighAccuracy: true }) {
  if (isNativeApp()) {
    const permission = await Geolocation.requestPermissions();

    if (
      permission.location !== 'granted'
      && permission.coarseLocation !== 'granted'
    ) {
      throw new Error('Location permission was denied');
    }

    const watchId = await Geolocation.watchPosition(options, (position, err) => {
      if (err) {
        onError?.(err);
        return;
      }
      onSuccess?.(position);
    });

    return watchId;
  }

  // Web browser
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  const watchId = navigator.geolocation.watchPosition(
    onSuccess,
    onError,
    options,
  );

  return watchId;
}

/**
 * Clear a position watch started by watchPosition().
 */
export async function clearWatch(watchId) {
  if (watchId == null) return;

  if (isNativeApp()) {
    await Geolocation.clearWatch({ id: watchId });
    return;
  }

  navigator.geolocation.clearWatch(watchId);
}

export async function writeClipboardText(value) {
  if (isNativeApp()) {
    await Clipboard.write({ string: value });
    return;
  }

  await navigator.clipboard.writeText(value);
}
