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
      <div className="flex h-[560px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[560px] flex-col">
      <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-gradient-to-b from-muted/20 to-transparent">
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground/70">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground/50">Start the conversation!</p>
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
