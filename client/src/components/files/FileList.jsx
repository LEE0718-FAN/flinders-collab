import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Image, FileArchive, File, Download, Trash2, Pencil, CalendarDays, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { deleteFile, updateFile } from '@/services/files';
import { useAuth } from '@/hooks/useAuth';

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

function FileRow({ file, canEdit, onDelete, onEdit, deleting }) {
  const fileName = file.file_name || file.name;
  const fileUrl = file.file_url || file.url;
  const uploaderName = file.users?.full_name || file.uploader_name || 'Unknown';

  return (
    <div className="flex items-center gap-4 rounded-md border px-3 py-2.5 bg-card hover:bg-muted/40 transition-colors">
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
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => forceDownload(fileUrl, fileName)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Download</p></TooltipContent>
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(file)}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Edit description</p></TooltipContent>
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(file.id, fileName)} disabled={deleting}>
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
  const [editFile, setEditFile] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

  const handleEditOpen = (file) => {
    setEditFile(file);
    setEditDesc(file.file_description || '');
  };

  const handleEditSave = async () => {
    if (!editFile) return;
    setEditLoading(true);
    try {
      await updateFile(editFile.id, { file_description: editDesc.trim() });
      setEditFile(null);
      onUpdated?.();
    } catch {
      // fail silently
    } finally {
      setEditLoading(false);
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
              canEdit={isUploader}
              onDelete={(id, name) => setConfirmDelete({ id, name })}
              onEdit={handleEditOpen}
              deleting={deletingId === file.id}
            />
          );
        })}
      </div>

      {/* Edit description dialog */}
      <Dialog open={!!editFile} onOpenChange={(open) => !open && setEditFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit File Description</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">File: {editFile?.file_name}</p>
            <Input
              placeholder="Enter description..."
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              disabled={editLoading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFile(null)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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
