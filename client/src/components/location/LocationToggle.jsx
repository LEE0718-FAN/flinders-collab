import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MapPin, MapPinOff, Loader2 } from 'lucide-react';
import { startSharing, stopSharing, updateLocation } from '@/services/location';
import { requestLocationPermission, watchPosition, clearLocationWatch } from '@/lib/native';

const UPDATE_INTERVAL_MS = 10_000; // throttle location updates to every 10s

export default function LocationToggle({ roomId, eventId, isSharing, onToggle }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

  // Send location updates to the backend (throttled)
  const sendUpdate = useCallback(
    async (coords) => {
      const now = Date.now();
      if (now - lastSentRef.current < UPDATE_INTERVAL_MS) return;
      lastSentRef.current = now;
      try {
        await updateLocation(eventId, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      } catch {
        // non-critical — next update will retry
      }
    },
    [eventId],
  );

  // Start / stop the geolocation watcher when sharing state changes
  useEffect(() => {
    if (!isSharing || !eventId) return;

    const id = watchPosition(
      (coords) => sendUpdate(coords),
      () => {
        // watcher error — stop gracefully rather than leave stale state
      },
    );
    watchIdRef.current = id;

    return () => {
      clearLocationWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [isSharing, eventId, sendUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLocationWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, []);

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setError('Location permission denied. Please allow access in your settings.');
        return;
      }
      await startSharing(eventId);
      onToggle?.(true);
    } catch (err) {
      setError(err.message || 'Failed to start sharing location.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setError('');
    setLoading(true);
    try {
      clearLocationWatch(watchIdRef.current);
      watchIdRef.current = null;
      await stopSharing(eventId);
      onToggle?.(false);
    } catch (err) {
      setError(err.message || 'Failed to stop sharing.');
    } finally {
      setLoading(false);
    }
  };

  if (isSharing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-emerald-600">Sharing location</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          disabled={loading}
          className="rounded-xl bg-red-500/10 text-red-600 border border-red-200/60 hover:bg-red-500/15 h-10 px-5 gap-2 transition-all duration-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinOff className="h-4 w-4" />}
          Stop Sharing
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
        <span className="text-sm text-muted-foreground">Requesting permission…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:shadow-md h-10 px-5 gap-2 transition-all duration-200"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Share My Location
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl border border-border/40 shadow-lg">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <MapPin className="h-6 w-6 text-emerald-600" />
            </div>
            <AlertDialogTitle className="text-center">Share Your Location?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Your location will be visible to other room members for this event. You can stop sharing at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStart} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-md transition-all duration-200">Share Location</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
