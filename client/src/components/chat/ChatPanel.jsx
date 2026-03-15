import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { getMessages } from '@/services/chat';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

function normalizeMessage(message) {
  if (!message) return message;
  return {
    ...message,
    sender_name:
      message.sender_name ||
      message.users?.full_name ||
      message.users?.university_email ||
      message.user_name ||
      'User',
  };
}

export default function ChatPanel({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const { emit, on, off } = useSocket();
  const { user } = useAuth();

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getMessages(roomId);
        const nextMessages = (data.messages || data || []).map(normalizeMessage);
        setMessages(nextMessages);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    emit('chat:join', { roomId });

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, normalizeMessage(msg)]);
    };

    on('chat:message', handleNewMessage);

    return () => {
      off('chat:message', handleNewMessage);
      emit('chat:leave', { roomId });
    };
  }, [roomId, emit, on, off]);

  const handleSend = (content) => {
    emit('chat:message', { roomId, content });
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-14rem)] sm:h-[600px] items-center justify-center rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-blue-500/5">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] sm:h-[600px] flex-col rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-blue-500/5 overflow-hidden">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 rounded-t-2xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">Chat</span>
        </div>
        <span className="text-white/70 text-xs font-medium bg-white/10 rounded-full px-3 py-1">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gradient-to-b from-slate-50 to-white">
        {messages.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg shadow-blue-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="text-base font-semibold text-slate-600">No messages yet</p>
            <p className="mt-1.5 text-sm text-slate-400">Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.user_id === user?.id} />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
}
