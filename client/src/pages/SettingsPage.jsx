import React from 'react';
import { Settings } from 'lucide-react';
import ProfileSettings from '@/components/settings/ProfileSettings';
import PreferenceSettings from '@/components/settings/PreferenceSettings';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 flex items-center gap-2.5 sm:mb-6">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="space-y-4 sm:space-y-5">
        <ProfileSettings />
        <PreferenceSettings />
      </div>
    </div>
  );
}
