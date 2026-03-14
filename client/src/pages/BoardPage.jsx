import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2, Plus, MessageCircle, UserCheck, UserX, Trash2, Send, GraduationCap, BookOpen, Users2, Calendar, Coffee, HelpCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getPosts, createPost, deletePost, toggleParticipation, getMyParticipations,
  getComments, createComment, deleteComment, getAcademicInfo, updateAcademicInfo,
} from '@/services/board';

const CATEGORIES = [
  { value: 'all', label: 'All', icon: BookOpen },
  { value: 'study_group', label: 'Study Group', icon: Users2 },
  { value: 'study_room', label: 'Study Room', icon: Coffee },
  { value: 'event', label: 'Event', icon: Calendar },
  { value: 'general', label: 'General', icon: HelpCircle },
];

const CATEGORY_COLORS = {
  study_group: 'bg-blue-50 text-blue-700 border-blue-200',
  study_room: 'bg-amber-50 text-amber-700 border-amber-200',
  event: 'bg-purple-50 text-purple-700 border-purple-200',
  general: 'bg-slate-50 text-slate-600 border-slate-200',
};

function AcademicInfoDialog({ open, onOpenChange, onSaved }) {
  const [year, setYear] = useState('');
  const [sem, setSem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!year || !sem) { setError('Please select both year and semester.'); return; }
    setLoading(true);
    setError('');
    try {
      await updateAcademicInfo(Number(year), Number(sem));
      onSaved?.({ year_level: Number(year), semester: Number(sem) });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            Academic Information
          </DialogTitle>
          <DialogDescription>
            Please enter your current year and semester to use the board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Year Level</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Semester</label>
              <select
                value={sem}
                onChange={(e) => setSem(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select</option>
                {[1, 2, 3].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save & Continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CommentSection({ postId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getComments('board_post', postId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSend = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      const comment = await createComment('board_post', postId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // silent
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
          )}
          {comments.map((c) => {
            const authorName = c.users?.full_name || 'Anonymous';
            const initials = authorName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            const academicLabel = c.users?.year_level && c.users?.semester
              ? `Y${c.users.year_level} S${c.users.semester}`
              : null;
            return (
              <div key={c.id} className="group flex gap-2">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  {c.users?.avatar_url && <AvatarImage src={c.users.avatar_url} />}
                  <AvatarFallback className="text-[9px] bg-slate-100">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800">{authorName}</span>
                    {academicLabel && (
                      <span className="text-[10px] text-slate-400">{academicLabel}</span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed break-words">{c.content}</p>
                </div>
                {c.author_id === user?.id && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-destructive transition-opacity shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comment input */}
      <div className="flex gap-2 items-end">
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm rounded-xl"
          maxLength={2000}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!newComment.trim() || sending}
          className="rounded-xl shrink-0 bg-indigo-500 hover:bg-indigo-600"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function PostCard({ post, myStatus, onParticipate, onDelete, userId }) {
  const [showComments, setShowComments] = useState(false);
  const [joinCount, setJoinCount] = useState(post.join_count);
  const [passCount, setPassCount] = useState(post.pass_count);
  const [currentStatus, setCurrentStatus] = useState(myStatus);
  const [loading, setLoading] = useState(null);

  const authorName = post.users?.full_name || 'Anonymous';
  const initials = authorName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const academicLabel = post.users?.year_level && post.users?.semester
    ? `Year ${post.users.year_level}, Semester ${post.users.semester}`
    : null;
  const majorLabel = post.users?.major || null;
  const catConfig = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.general;

  const handleParticipate = async (status) => {
    setLoading(status);
    try {
      const result = await onParticipate(post.id, status);
      if (result.action === 'removed') {
        if (currentStatus === 'join') setJoinCount((c) => Math.max(0, c - 1));
        if (currentStatus === 'pass') setPassCount((c) => Math.max(0, c - 1));
        setCurrentStatus(null);
      } else {
        if (currentStatus === 'join') setJoinCount((c) => Math.max(0, c - 1));
        if (currentStatus === 'pass') setPassCount((c) => Math.max(0, c - 1));
        if (result.status === 'join') setJoinCount((c) => c + 1);
        if (result.status === 'pass') setPassCount((c) => c + 1);
        setCurrentStatus(result.status);
      }
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-5 transition-all hover:shadow-md animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm shrink-0">
          {post.users?.avatar_url && <AvatarImage src={post.users.avatar_url} />}
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">{authorName}</span>
            {academicLabel && (
              <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0">
                <GraduationCap className="h-2.5 w-2.5 mr-0.5" />
                {academicLabel}
              </Badge>
            )}
            {majorLabel && (
              <span className="text-[11px] text-slate-400">{majorLabel}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] rounded-full ${catConfig}`}>
            {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
          </Badge>
          {post.author_id === userId && (
            <button onClick={() => onDelete(post.id)} className="text-slate-400 hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        <h3 className="font-bold text-base text-slate-900">{post.title}</h3>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Button
          variant={currentStatus === 'join' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleParticipate('join')}
          disabled={loading !== null}
          className={`rounded-xl text-xs gap-1.5 ${currentStatus === 'join' ? 'bg-green-500 hover:bg-green-600 border-green-500' : 'hover:border-green-300 hover:text-green-600'}`}
        >
          {loading === 'join' ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
          Join {joinCount > 0 && `(${joinCount})`}
        </Button>
        <Button
          variant={currentStatus === 'pass' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleParticipate('pass')}
          disabled={loading !== null}
          className={`rounded-xl text-xs gap-1.5 ${currentStatus === 'pass' ? 'bg-slate-500 hover:bg-slate-600 border-slate-500' : 'hover:border-slate-300'}`}
        >
          {loading === 'pass' ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
          Pass {passCount > 0 && `(${passCount})`}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((v) => !v)}
          className="rounded-xl text-xs gap-1.5 text-slate-500 hover:text-indigo-600"
        >
          <MessageCircle className="h-3 w-3" />
          Comments {post.comment_count > 0 && `(${post.comment_count})`}
        </Button>
      </div>

      {/* Comments */}
      {showComments && <CommentSection postId={post.id} />}
    </div>
  );
}

function CreatePostDialog({ open, onOpenChange, onCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setTitle(''); setContent(''); setCategory('general'); setError(''); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const post = await createPost({ title: title.trim(), content: content.trim(), category });
      onCreated?.(post);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a Post</DialogTitle>
          <DialogDescription>Share with the Flinders community</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      category === cat.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-500'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Title</label>
            <Input
              placeholder="e.g. Looking for study partners for COMP3000"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Content</label>
            <Textarea
              placeholder="Describe what you're looking for..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="rounded-xl min-h-[100px]"
              maxLength={5000}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Post
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BoardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [myParticipations, setMyParticipations] = useState({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [academicOpen, setAcademicOpen] = useState(false);
  const [academicInfo, setAcademicInfo] = useState(null);
  const [academicChecked, setAcademicChecked] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getPosts(category);
      setPosts(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [category]);

  // Check academic info on mount
  useEffect(() => {
    getAcademicInfo()
      .then((info) => {
        setAcademicInfo(info);
        if (!info.year_level || !info.semester) {
          setAcademicOpen(true);
        }
        setAcademicChecked(true);
      })
      .catch(() => {
        setAcademicOpen(true);
        setAcademicChecked(true);
      });

    getMyParticipations()
      .then(setMyParticipations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (academicChecked) fetchPosts();
  }, [fetchPosts, academicChecked]);

  const handlePostCreated = (post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      // silent
    }
  };

  const handleParticipate = async (postId, status) => {
    const result = await toggleParticipation(postId, status);
    setMyParticipations((prev) => {
      const next = { ...prev };
      if (result.action === 'removed') delete next[postId];
      else next[postId] = result.status;
      return next;
    });
    return result;
  };

  return (
    <MainLayout>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white mb-6 shadow-xl">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-teal-400/20 blur-xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
              Community Board
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Free Board</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Find study partners, share study room bookings, or post anything for the Flinders community.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="shrink-0 rounded-xl bg-white text-teal-700 hover:bg-white/90 font-semibold shadow-lg gap-2"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 custom-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setLoading(true); }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                category === cat.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-500'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-400">No posts yet</h3>
          <p className="text-sm text-slate-400 mt-1">Be the first to post something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              myStatus={myParticipations[post.id] || null}
              onParticipate={handleParticipate}
              onDelete={handleDelete}
              userId={user?.id}
            />
          ))}
        </div>
      )}

      <CreatePostDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handlePostCreated}
      />

      <AcademicInfoDialog
        open={academicOpen}
        onOpenChange={setAcademicOpen}
        onSaved={(info) => setAcademicInfo(info)}
      />
    </MainLayout>
  );
}
