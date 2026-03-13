import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Image, FileArchive, File, Download, Trash2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { deleteFile } from '@/services/files';
import { useAuth } from '@/hooks/useAuth';

function getFileIcon(type) {
  if (type?.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (type?.includes('presentation') || type?.includes('pptx')) return <FileText className="h-4 w-4 text-orange-500" />;
  if (type?.includes('word') || type?.includes('docx')) return <FileText className="h-4 w-4 text-blue-500" />;
  if (type?.includes('image')) return <Image className="h-4 w-4 text-purple-500" />;
  if (type?.includes('zip')) return <FileArchive className="h-4 w-4 text-yellow-600" />;
  return <File className="h-4 w-4 text-gray-500" />;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function forceDownload(url, fileName) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank');
  }
}

function FileRow({ file, canDelete, onDelete, deleting }) {
  const fileName = file.file_name || file.name;
  const fileUrl = file.file_url || file.url;
  const uploaderName = file.users?.full_name || file.uploader_name || 'Unknown';

  return (
    <div className="flex items-center gap-4 rounded-md border px-3 py-2.5 bg-card hover:bg-muted/40 transition-colors">
      {/* Left: description + event */}
      <div className="flex-1 min-w-0">
        {file.file_description ? (
          <p className="text-sm text-foreground leading-snug line-clamp-2">{file.file_description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description</p>
        )}
        {file.event && (
          <div className="flex items-center gap-1 mt-1 text-xs text-primary/80">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span className="truncate">{file.event.title}</span>
          </div>
        )}
      </div>

      {/* Right: file info + actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs font-medium text-muted-foreground truncate max-w-[180px]">{fileName}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {uploaderName} · {file.created_at ? format(new Date(file.created_at), 'MMM d, h:mm a') : ''}
            {file.file_size > 0 && ` · ${formatSize(file.file_size)}`}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {fileUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => forceDownload(fileUrl, fileName)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Download file</p></TooltipContent>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(file.id, fileName)}
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Delete file</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FileList({ files = [], roomId, onUpdated, filterCategory }) {
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const fileId = confirmDelete.id;
    setConfirmDelete(null);
    setDeletingId(fileId);
    try {
      await deleteFile(roomId, fileId);
      onUpdated?.();
    } catch {
      // fail silently
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filterCategory
    ? files.filter((f) => f.category === filterCategory)
    : files;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-2xl mb-1.5">{filterCategory === 'submission' ? '📝' : '📖'}</div>
        <p className="text-sm text-muted-foreground">No files yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {filtered.map((file) => {
          const isUploader = file.uploaded_by === user?.id;
          return (
            <FileRow
              key={file.id}
              file={file}
              canDelete={isUploader}
              onDelete={(id, name) => setConfirmDelete({ id, name })}
              deleting={deletingId === file.id}
            />
          );
        })}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{confirmDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
