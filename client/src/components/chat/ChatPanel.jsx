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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[500px] flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
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
