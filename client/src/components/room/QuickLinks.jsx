import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ExternalLink, Plus, Trash2, Link2 } from 'lucide-react';

const TOOL_PRESETS = [
  { name: 'Google Docs', icon: '📄', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { name: 'Google Slides', icon: '📊', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { name: 'Google Sheets', icon: '📗', color: 'bg-green-50 border-green-200 text-green-700' },
  { name: 'Notion', icon: '📝', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  { name: 'Figma', icon: '🎨', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { name: 'Jira', icon: '🔧', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { name: 'GitHub', icon: '🐙', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  { name: 'Miro', icon: '🖼️', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { name: 'Canva', icon: '🎯', color: 'bg-teal-50 border-teal-200 text-teal-700' },
  { name: 'Other', icon: '🔗', color: 'bg-gray-50 border-gray-200 text-gray-700' },
];

function getPreset(name) {
  return TOOL_PRESETS.find((p) => p.name === name) || TOOL_PRESETS[TOOL_PRESETS.length - 1];
}

export default function QuickLinks({ roomId, links = [], onLinksChange }) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState('');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  // Links are stored in localStorage per room
  const storageKey = `quick-links:${roomId}`;

  const savedLinks = links.length > 0 ? links : (() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  })();

  const saveLinks = (next) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
    onLinksChange?.(next);
  };

  const handleAdd = () => {
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    const preset = getPreset(selectedTool || 'Other');
    const newLink = {
      id: Date.now().toString(),
      tool: selectedTool || 'Other',
      url: finalUrl,
      label: label.trim() || preset.name,
    };

    const next = [...savedLinks, newLink];
    saveLinks(next);
    setAddOpen(false);
    setUrl('');
    setLabel('');
    setSelectedTool('');
    setError('');
  };

  const handleRemove = (linkId) => {
    const next = savedLinks.filter((l) => l.id !== linkId);
    saveLinks(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-indigo-500" />
          <h3 className="text-base font-semibold">Quick Links</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Link
        </Button>
      </div>

      {savedLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <Link2 className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No links yet</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Add Google Docs, Figma, Jira or any tool your team uses</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {savedLinks.map((link) => {
            const preset = getPreset(link.tool);
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${preset.color}`}
              >
                <span className="text-xl">{preset.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{link.label}</p>
                  <p className="text-[11px] opacity-60 truncate">{link.url}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(link.id); }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </a>
            );
          })}
        </div>
      )}

      {/* Add Link Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Quick Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tool</label>
              <div className="grid grid-cols-5 gap-1.5">
                {TOOL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => { setSelectedTool(preset.name); if (!label) setLabel(preset.name); }}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all ${
                      selectedTool === preset.name
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-border hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-[10px] font-medium leading-tight">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input
                placeholder="https://docs.google.com/..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Label <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="e.g. Project Report Draft"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
