import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { deleteFile } from '@/services/files';
import { useAuth } from '@/hooks/useAuth';

export default function FileList({ files = [], roomId, onUpdated }) {
  const { user } = useAuth();

  const handleDelete = async (fileId) => {
    try {
      await deleteFile(roomId, fileId);
      onUpdated?.();
    } catch {
      // silently fail
    }
  };

  if (files.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No files uploaded yet</p>;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <Card key={file.id}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name || file.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {file.uploader_name || 'Unknown'} &middot; {file.created_at ? format(new Date(file.created_at), 'MMM d, yyyy') : ''}
              </p>
            </div>
            <div className="flex gap-1">
              {file.url && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={file.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {file.user_id === user?.id && (
                <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
