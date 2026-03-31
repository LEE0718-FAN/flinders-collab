import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getFriendRequests, respondToFriendRequest } from '@/services/flinders';
import { getMessages } from '@/services/chat';
import { apiUrl } from '@/lib/api';
import { getAuthHeaders, parseResponse } from '@/lib/api-headers';
import {
  Loader2, MessageSquare, ArrowLeft, Users, Check, X, UserPlus, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const ChatPanel = lazy(() => import('@/components/chat/ChatPanel'));

export default function MessagesPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null); // { roomId, friend }
  const [lastMessages, setLastMessages] = useState({}); // roomId → last message preview
  const [search, setSearch] = useState('');
  const [respondingId, setRespondingId] = useState(null);

  const loadFriends = useCallback(async () => {
    try {
      const data = await getFriendRequests();
      setFriends(Array.isArray(data?.friends) ? data.friends : []);
      setIncoming(Array.isArray(data?.incoming) ? data.incoming : []);
    } catch {
      setFriends([]);
      setIncoming([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Load last message for each friend's DM room
  useEffect(() => {
    const fetchPreviews = async () => {
      const previews = {};
      for (const f of friends) {
        if (!f.direct_room_id) continue;
        try {
          const data = await getMessages(f.direct_room_id);
          const msgs = data.messages || data || [];
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            previews[f.direct_room_id] = {
              content: last.message_type === 'file' ? '📎 File' : (last.content || '').slice(0, 60),
              time: last.created_at,
              isOwn: last.user_id === user?.id,
            };
          }
        } catch {}
      }
      setLastMessages(previews);
    };
    if (friends.length > 0) fetchPreviews();
  }, [friends, user?.id]);

  const handleRespond = async (requestId, action) => {
    setRespondingId(requestId);
    try {
      await respondToFriendRequest(requestId, action);
      await loadFriends();
    } catch {} finally {
      setRespondingId(null);
    }
  };

  const openChat = (friend) => {
    if (friend.direct_room_id) {
      setActiveChat({ roomId: friend.direct_room_id, friend });
    }
  };

  const filteredFriends = friends.filter((f) => {
    if (!search.trim()) return true;
    const name = (f.other_user?.full_name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Sort: friends with recent messages first
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aMsg = lastMessages[a.direct_room_id];
    const bMsg = lastMessages[b.direct_room_id];
    if (aMsg && bMsg) return new Date(bMsg.time) - new Date(aMsg.time);
    if (aMsg) return -1;
    if (bMsg) return 1;
    return 0;
  });

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  // Mobile: show chat or list
  const showChatMobile = activeChat !== null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 safe-area-top">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {showChatMobile && (
            <button onClick={() => setActiveChat(null)} className="sm:hidden p-1 -ml-1 rounded-lg hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
          )}
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Messages</h1>
          {friends.length > 0 && (
            <Badge className="rounded-full bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
              {friends.length} friends
            </Badge>
          )}
          {incoming.length > 0 && (
            <Badge className="rounded-full bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
              {incoming.length} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 max-w-4xl mx-auto w-full">
        {/* Left panel: Friend list */}
        <div className={`w-full sm:w-80 sm:border-r border-slate-100 flex flex-col shrink-0 ${showChatMobile ? 'hidden sm:flex' : 'flex'}`}>
          {/* Search */}
          <div className="p-3 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search friends..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-slate-50 border-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Incoming requests */}
          {incoming.length > 0 && (
            <div className="border-b border-slate-100">
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Friend Requests
              </div>
              {incoming.map((req) => (
                <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600 shrink-0">
                    {(req.other_user?.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{req.other_user?.full_name || 'Student'}</div>
                    {req.message && <div className="text-xs text-slate-400 truncate">{req.message}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleRespond(req.id, 'accept')}
                      disabled={respondingId === req.id}
                      className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {respondingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, 'decline')}
                      className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friend list / conversations */}
          <div className="flex-1 overflow-y-auto">
            {sortedFriends.length === 0 && (
              <div className="text-center py-16 px-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100">
                  <UserPlus className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600">No friends yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Add friends from your course chat members to start messaging
                </p>
              </div>
            )}
            {sortedFriends.map((f) => {
              const preview = lastMessages[f.direct_room_id];
              const isActive = activeChat?.roomId === f.direct_room_id;
              return (
                <button
                  key={f.id}
                  onClick={() => openChat(f)}
                  className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left ${
                    isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {f.other_user?.avatar_url ? (
                    <img src={f.other_user.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {(f.other_user?.full_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800 truncate">{f.other_user?.full_name || 'Student'}</span>
                      {preview && (
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatTime(preview.time)}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {preview ? (
                        <>
                          {preview.isOwn && <span className="text-slate-500">You: </span>}
                          {preview.content}
                        </>
                      ) : (
                        <span className="text-slate-300 italic">No messages yet</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel: Chat */}
        <div className={`flex-1 flex flex-col min-h-0 ${!showChatMobile ? 'hidden sm:flex' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
                <button onClick={() => setActiveChat(null)} className="sm:hidden p-1 -ml-1 rounded-lg hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {activeChat.friend.other_user?.avatar_url ? (
                  <img src={activeChat.friend.other_user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {(activeChat.friend.other_user?.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{activeChat.friend.other_user?.full_name || 'Student'}</h3>
                </div>
              </div>
              {/* Chat content */}
              <div className="flex-1 min-h-0">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>}>
                  <ChatPanel roomId={activeChat.roomId} />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg shadow-blue-500/10">
                  <MessageSquare className="h-10 w-10 text-blue-500" />
                </div>
                <p className="text-base font-semibold text-slate-600">Your Messages</p>
                <p className="mt-1.5 text-sm text-slate-400">
                  Select a friend to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
