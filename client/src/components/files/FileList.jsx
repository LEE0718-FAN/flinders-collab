import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { deleteFile } from '@/services/files';
import { useAuth } from '@/hooks/useAuth';

export default function FileList({ files = [], roomId, onUpdated, memberRole }) {
  const { user } = useAuth();
  const [error, setError] = useState('');

  const isAdmin = memberRole === 'owner' || memberRole === 'admin';

  const handleDelete = async (fileId) => {
    setError('');
    try {
      await deleteFile(roomId, fileId);
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Failed to delete file.');
    }
  };

  if (files.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No files uploaded yet</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {files.map((file) => {
        // Backend returns: file_name, file_url, uploaded_by, users: { id, full_name, avatar_url }
        const fileName = file.file_name || file.name;
        const fileUrl = file.file_url || file.url;
        const uploaderName = file.users?.full_name || file.uploader_name || 'Unknown';
        const isUploader = file.uploaded_by === user?.id || file.user_id === user?.id;
        const canDelete = isUploader || isAdmin;

        return (
          <Card key={file.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {uploaderName} &middot; {file.created_at ? format(new Date(file.created_at), 'MMM d, yyyy') : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {fileUrl && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
