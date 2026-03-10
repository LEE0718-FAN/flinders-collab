import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MapPin, MapPinOff, Loader2 } from 'lucide-react';
import { startSharing, stopSharing } from '@/services/location';

export default function LocationToggle({ roomId, eventId, isSharing, onToggle }) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      await startSharing(roomId, eventId, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      onToggle?.(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopSharing(roomId);
      onToggle?.(false);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (isSharing) {
    return (
      <Button variant="outline" onClick={handleStop} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPinOff className="mr-2 h-4 w-4" />}
        Stop Sharing
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
          Share Location
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Share Your Location?</AlertDialogTitle>
          <AlertDialogDescription>
            Your location will be visible to other room members for this event. You can stop sharing at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleStart}>Share Location</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
