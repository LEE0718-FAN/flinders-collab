import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { uploadFile } from '@/services/files';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUpload({ roomId, onUploaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('File type not allowed. Accepted: PDF, PPTX, DOCX, PNG, JPG, ZIP, TXT');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setLoading(true);
    try {
      await uploadFile(roomId, file);
      onUploaded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop a file here, or</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
              Browse Files
            </Button>
            <input ref={inputRef} type="file" className="hidden" onChange={handleChange} accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.zip,.txt" />
            <p className="mt-2 text-xs text-muted-foreground">PDF, PPTX, DOCX, PNG, JPG, ZIP, TXT (max 10MB)</p>
          </>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
