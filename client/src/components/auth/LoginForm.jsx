import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@flinders.edu.au')) {
      setError('Please use your @flinders.edu.au email');
      return;
    }

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground/70 mt-1">Sign in to your account</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-[13px] font-semibold text-foreground/70 block">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              id="email"
              type="email"
              placeholder="you@flinders.edu.au"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-[13px] font-semibold text-foreground/70 block">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2.5">
          <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-red-500 text-[10px] font-bold">!</span>
          </div>
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold text-[15px] shadow-lg shadow-blue-600/20 text-white transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/25"
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white/90 px-3 text-muted-foreground/40">or</span>
        </div>
      </div>

      <p className="text-center text-[13px] text-muted-foreground/60">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          Create one
        </Link>
      </p>
    </form>
  );
}
