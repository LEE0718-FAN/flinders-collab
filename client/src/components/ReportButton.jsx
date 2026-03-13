import React, { useState } from 'react';
import { Flag, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createReport } from '@/services/reports';

export default function ReportButton({ section, roomId, floating = false }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setError('');
    setSuccess(false);
  };

  const handleOpenChange = (value) => {
    setOpen(value);
    if (!value) resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await createReport({
        room_id: roomId || null,
        section,
        subject: subject.trim(),
        description: description.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {floating ? (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full h-12 w-12 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <Flag className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 px-3 py-1.5 text-white text-xs font-semibold transition-colors shadow-sm"
        >
          <Flag className="h-3.5 w-3.5" />
          Report
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Report an Issue
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 p-6 flex flex-col items-center gap-3">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">Report submitted successfully!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground/80">Section</span>
                <div>
                  <Badge className="rounded-full bg-red-50 text-red-600 border border-red-200/60 capitalize">{section}</Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground/80">
                  Subject <span className="text-red-500">*</span>
                </span>
                <Input
                  className="rounded-xl"
                  placeholder="Brief summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground/80">
                  Description <span className="text-red-500">*</span>
                </span>
                <Textarea
                  className="rounded-xl"
                  placeholder="Describe the issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  disabled={submitting}
                />
              </div>

              {error && <div className="rounded-xl bg-red-50 border border-red-200/60 p-3 text-sm text-red-600">{error}</div>}

              <DialogFooter>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                  disabled={submitting || !subject.trim() || !description.trim()}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
