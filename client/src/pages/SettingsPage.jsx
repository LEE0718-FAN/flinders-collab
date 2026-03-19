import React from 'react';
import { Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProfileSettings from '@/components/settings/ProfileSettings';
import PreferenceSettings from '@/components/settings/PreferenceSettings';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2.5 mb-6">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferenceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
