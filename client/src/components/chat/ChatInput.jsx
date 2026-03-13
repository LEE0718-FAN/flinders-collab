import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

export default function ChatInput({ onSend }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-border/40 bg-white p-4">
      <Input
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 rounded-xl border-border/40 bg-muted/30 h-11 px-4"
      />
      <Button type="submit" size="icon" disabled={!message.trim()} className="rounded-xl h-11 w-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-30">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
