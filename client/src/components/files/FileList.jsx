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
import { Download, Trash2, Pencil, CalendarDays, Loader2, FileText, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { deleteFile, getFileDownloadUrl, updateFile } from '@/services/files';
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

function FileRow({ file, canEdit, onDelete, onEdit, onDownload, deleting, downloading }) {
  const fileName = file.file_name || file.name;
  const uploaderName = file.users?.full_name || file.uploader_name || 'Unknown';

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-white shadow-card hover:shadow-card-hover transition-all duration-200 p-4">
      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-primary/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{fileName}</p>
        {file.file_description ? (
          <p className="text-xs text-muted-foreground/80 italic leading-snug line-clamp-2 mt-0.5">{file.file_description}</p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic mt-0.5">No description</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          {uploaderName} <span className="mx-1">&middot;</span> {file.created_at ? format(new Date(file.created_at), 'MMM d, h:mm a') : ''}
          {file.file_size > 0 && <><span className="mx-1">&middot;</span>{formatSize(file.file_size)}</>}
        </p>
        {file.event && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 text-xs px-2.5 py-0.5 text-muted-foreground">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span className="truncate">{file.event.title}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-lg bg-primary/10 text-primary hover:bg-primary/15 h-9 px-3" onClick={() => onDownload(file)} disabled={downloading}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top"><p>Download</p></TooltipContent>
        </Tooltip>
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => onEdit(file)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Edit description</p></TooltipContent>
          </Tooltip>
        )}
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(file.id, fileName)} disabled={deleting}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Delete file</p></TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export default function FileList({ files = [], roomId, onFilesChange, filterCategory }) {
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
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
      onFilesChange?.((prev) => prev.filter((file) => file.id !== fileId));
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
      const updatedFile = await updateFile(editFile.id, { file_description: editDesc.trim() });
      onFilesChange?.((prev) =>
        prev.map((file) => (
          file.id === editFile.id
            ? { ...file, ...updatedFile }
            : file
        ))
      );
      setEditFile(null);
    } catch {
      // fail silently
    } finally {
      setEditLoading(false);
    }
  };

  const handleDownload = async (file) => {
    setDownloadingId(file.id);
    try {
      const data = await getFileDownloadUrl(file.id);
      if (data?.download_url) {
        await forceDownload(data.download_url, file.file_name || file.name);
      }
    } catch {
      // fail silently
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = filterCategory
    ? files.filter((f) => f.category === filterCategory)
    : files;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
          <FolderOpen className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No files yet</p>
        <p className="text-xs text-muted-foreground/50 mt-0.5">Upload a file to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {filtered.map((file) => {
          const isUploader = String(file.uploaded_by) === String(user?.id);
          return (
            <FileRow
              key={file.id}
              file={file}
              canEdit={isUploader}
              onDownload={handleDownload}
              onDelete={(id, name) => setConfirmDelete({ id, name })}
              onEdit={handleEditOpen}
              deleting={deletingId === file.id}
              downloading={downloadingId === file.id}
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
