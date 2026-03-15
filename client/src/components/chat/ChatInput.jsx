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
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t-0 bg-slate-50 p-3 sm:gap-3 sm:p-4 rounded-b-2xl"
      style={{ paddingBottom: 'max(0.75rem, var(--safe-bottom))' }}
    >
      <Input
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="h-11 flex-1 rounded-full border-slate-200 bg-white px-4 text-sm shadow-sm transition-all focus:border-blue-300 focus:shadow-md sm:h-12 sm:px-5"
      />
      <Button type="submit" size="icon" disabled={!message.trim()} className="h-11 w-11 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-30 disabled:shadow-none sm:h-12 sm:w-12">
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
