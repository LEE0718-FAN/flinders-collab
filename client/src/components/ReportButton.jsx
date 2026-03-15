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
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 sm:py-2.5 text-white shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all hover:scale-105 active:scale-95 min-h-[44px]"
        >
          <Flag className="h-4 w-4" />
          <span className="text-sm font-semibold">Report</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
        >
          <Flag className="h-3.5 w-3.5" />
          Report
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-600" />
              Report an Issue
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium text-green-700">Report submitted successfully!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Section</span>
                <div>
                  <Badge className="bg-red-100 text-red-700 capitalize">{section}</Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-medium">
                  Subject <span className="text-red-500">*</span>
                </span>
                <Input
                  placeholder="Brief summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-medium">
                  Description <span className="text-red-500">*</span>
                </span>
                <Textarea
                  placeholder="Describe the issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  disabled={submitting}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white"
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
