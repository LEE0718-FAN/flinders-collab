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
    <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-slate-50 p-4 border-t-0 rounded-b-2xl">
      <Input
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 bg-white border-slate-200 rounded-full h-12 px-5 shadow-sm focus:shadow-md focus:border-blue-300 transition-all"
      />
      <Button type="submit" size="icon" disabled={!message.trim()} className="rounded-full h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-30 disabled:shadow-none">
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
