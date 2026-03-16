import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginForm({ onSubmit, onGuestLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      const msg = err.message || 'Login failed';
      if (msg === 'Failed to fetch' || msg === 'Load failed') {
        setError('Server is starting up. Please try again in a few seconds.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground/70">Sign in to your account to continue</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-[13px] font-semibold text-foreground/70">Email</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input
            id="email"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-[13px] font-semibold text-foreground/70">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input
            id="password"
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <svg className="h-4 w-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="10" />
            <text x="10" y="14" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">!</text>
          </svg>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold text-[15px] shadow-lg shadow-blue-600/20 text-white"
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground/50">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700">Sign up</Link>
      </p>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/40" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground/50">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          setGuestLoading(true);
          setError('');
          try {
            await onGuestLogin();
          } catch (err) {
            const msg = err.message || 'Failed to start tester mode';
            if (msg === 'Failed to fetch' || msg === 'Load failed') {
              setError('Server is starting up. Please try again in a few seconds.');
            } else {
              setError(msg);
            }
          } finally {
            setGuestLoading(false);
          }
        }}
        disabled={guestLoading || loading}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-semibold text-[14px] shadow-lg shadow-emerald-500/20 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        {guestLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {guestLoading ? 'Setting up...' : '🎓 Try as Tester (Tutorial Only)'}
      </button>
      <p className="text-center text-[11px] text-muted-foreground/50">
        No signup needed — see a quick demo of the app
      </p>
    </form>
  );
}
