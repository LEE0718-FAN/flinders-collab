import React from 'react';
import { MessageSquare } from 'lucide-react';

import { FlinapPanel } from '@/pages/FlindersLifePage';
import { useAuth } from '@/hooks/useAuth';
import { apiGetMe } from '@/services/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageTour from '@/components/PageTour';

export default function FlindersSocialPage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = React.useState(null);
  const [gateOpen, setGateOpen] = React.useState(false);
  const [major, setMajor] = React.useState('');
  const [yearLevel, setYearLevel] = React.useState('');
  const [semester, setSemester] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    apiGetMe()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        const nextMajor = String(data?.major || user?.user_metadata?.major || '').trim();
        const nextYear = String(data?.year_level || user?.user_metadata?.year_level || '').trim();
        const nextSemester = String(data?.semester || user?.user_metadata?.semester || '').trim();
        setMajor(nextMajor);
        setYearLevel(nextYear);
        setSemester(nextSemester);
        setGateOpen(!nextMajor || !nextYear || !nextSemester);
      })
      .catch(() => {
        const nextMajor = String(user?.user_metadata?.major || '').trim();
        const nextYear = String(user?.user_metadata?.year_level || '').trim();
        const nextSemester = String(user?.user_metadata?.semester || '').trim();
        setMajor(nextMajor);
        setYearLevel(nextYear);
        setSemester(nextSemester);
        setGateOpen(!nextMajor || !nextYear || !nextSemester);
      });

    return () => {
      active = false;
    };
  }, [user?.user_metadata?.major, user?.user_metadata?.semester, user?.user_metadata?.year_level]);

  const handleSaveProfileGate = async () => {
    if (!major.trim() || !yearLevel || !semester) {
      setError('Please fill in your major, year level, and semester.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('major', major.trim());
      formData.append('year_level', yearLevel);
      formData.append('semester', semester);
      await updateUser(formData);
      setGateOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save your Flinders Social profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-2 py-3 sm:px-0">
      <Dialog open={gateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Complete Your Social Profile</DialogTitle>
            <DialogDescription>
              Before using Flinders Social, add your major, year level and semester once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Major</label>
              <Input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="e.g. Computer Science" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Year</label>
                <select
                  value={yearLevel}
                  onChange={(event) => setYearLevel(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                >
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                    <option key={value} value={value}>Year {value}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Semester</label>
                <select
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                >
                  <option value="">Select</option>
                  {[1, 2, 3].map((value) => (
                    <option key={value} value={value}>Sem {value}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleSaveProfileGate} disabled={saving} className="h-11 w-full rounded-xl">
              {saving ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div data-tour="social-hero" className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 px-5 py-6 shadow-lg sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.45) 0%, transparent 60%)' }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Flinders Social</h1>
            <p className="mt-0.5 text-xs text-white/80">Campus-only live sharing, snap map and status updates</p>
          </div>
        </div>
      </div>

      {!gateOpen && (
        <>
          <PageTour
            tourId="social"
            delay={800}
            steps={[
              {
                target: '[data-tour="social-hero"]',
                title: 'Flinders Social',
                desc: 'Share your location on campus, set your status, and see where your friends are!',
                position: 'bottom',
              },
              {
                target: '[data-tour="social-map"]',
                title: 'Live Campus Map',
                desc: 'Your location shows up here. Chat with friends and send friend requests!',
                position: 'top',
              },
            ]}
          />
          <div data-tour="social-map">
            <FlinapPanel currentUserId={user?.id || null} />
          </div>
        </>
      )}
    </div>
  );
}
