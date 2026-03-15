import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, X, Image, FileText } from 'lucide-react';

export default function ChatInput({ onSend, onFileSelect, uploading }) {
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null); // { file, previewUrl }
  const fileRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (preview) {
      onFileSelect?.(preview.file);
      clearPreview();
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage('');
  };

  const clearPreview = () => {
    if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    setPreview({
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : null,
      isImage,
    });
  };

  return (
    <div className="border-t-0 bg-slate-50 rounded-b-2xl" style={{ paddingBottom: 'max(0.75rem, var(--safe-bottom))' }}>
      {preview && (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            {preview.isImage && preview.previewUrl ? (
              <img src={preview.previewUrl} alt="preview" className="h-14 w-14 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-800">{preview.file.name}</p>
              <p className="text-xs text-slate-500">{(preview.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-100" onClick={clearPreview} disabled={uploading}>
              <X className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.pptx,.docx,.zip,.txt"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full hover:bg-blue-100 shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-5 w-5 text-slate-400" />
        </Button>
        <Input
          placeholder={preview ? 'Send file...' : 'Type a message...'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!!preview || uploading}
          className="h-11 flex-1 rounded-full border-slate-200 bg-white px-4 text-sm shadow-sm transition-all focus:border-blue-300 focus:shadow-md sm:h-12 sm:px-5"
        />
        <Button
          type="submit"
          size="icon"
          disabled={(!message.trim() && !preview) || uploading}
          className="h-11 w-11 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-30 disabled:shadow-none sm:h-12 sm:w-12"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
