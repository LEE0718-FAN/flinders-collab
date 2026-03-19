import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

const PREF_NOTIFICATION_SOUNDS = 'pref-notification-sounds';
const PREF_COMPACT_MESSAGES = 'pref-compact-messages';
const PREF_DARK_MODE = 'pref-dark-mode';
const TUTORIAL_KEY = 'tutorial-completed';

function readBool(key, defaultValue = false) {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === 'true';
}

function Toggle({ checked, onChange, id, disabled }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

function PreferenceRow({ id, label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} />
    </div>
  );
}

export default function PreferenceSettings() {
  const { addToast } = useToast();

  const [notificationSounds, setNotificationSounds] = useState(
    () => readBool(PREF_NOTIFICATION_SOUNDS, true)
  );
  const [compactMessages, setCompactMessages] = useState(
    () => readBool(PREF_COMPACT_MESSAGES, false)
  );
  const [darkMode, setDarkMode] = useState(
    () => readBool(PREF_DARK_MODE, false)
  );
  const [tutorialReset, setTutorialReset] = useState(false);

  const handleNotificationSounds = (value) => {
    localStorage.setItem(PREF_NOTIFICATION_SOUNDS, String(value));
    setNotificationSounds(value);
  };

  const handleCompactMessages = (value) => {
    localStorage.setItem(PREF_COMPACT_MESSAGES, String(value));
    setCompactMessages(value);
  };

  const handleDarkMode = (value) => {
    localStorage.setItem(PREF_DARK_MODE, String(value));
    setDarkMode(value);
  };

  const handleResetTutorial = () => {
    localStorage.removeItem(TUTORIAL_KEY);
    setTutorialReset(true);
    addToast('Tutorial reset — it will appear on your next visit.', 'success');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
          <CardDescription>Control sound and alert preferences.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          <PreferenceRow
            id="pref-notification-sounds"
            label="Notification Sounds"
            description="Play a sound when you receive new messages."
            checked={notificationSounds}
            onChange={handleNotificationSounds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Display</CardTitle>
          <CardDescription>Adjust how content appears in the app.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          <PreferenceRow
            id="pref-compact-messages"
            label="Compact Message View"
            description="Show messages in a denser layout with less spacing."
            checked={compactMessages}
            onChange={handleCompactMessages}
          />
          <PreferenceRow
            id="pref-dark-mode"
            label="Dark Mode"
            description="Use a dark colour scheme across the app."
            checked={darkMode}
            onChange={handleDarkMode}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tutorial</CardTitle>
          <CardDescription>Manage the onboarding tutorial.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Reset Tutorial</p>
              <p className="text-xs text-muted-foreground">
                Show the getting-started tutorial again on your next visit.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTutorial}
              disabled={tutorialReset}
            >
              {tutorialReset ? 'Reset' : 'Reset Tutorial'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
