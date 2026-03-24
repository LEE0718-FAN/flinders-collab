import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    const initRecovery = async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const code = params.get('code') || '';
      const tokenHash = params.get('token_hash') || '';
      const accessToken = hash.get('access_token') || '';
      const refreshToken = hash.get('refresh_token') || '';

      // Attempt to establish a session from recovery params
      try {
        if (code) {
          const { error: err } = await supabase.auth.exchangeCodeForSession(code);
          if (err) console.warn('[reset] code exchange:', err.message);
        } else if (tokenHash) {
          const { error: err } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (err) console.warn('[reset] verifyOtp:', err.message);
        } else if (accessToken && refreshToken) {
          const { error: err } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (err) console.warn('[reset] setSession:', err.message);
        }
      } catch (e) {
        // Code may already have been consumed by detectSessionInUrl — that's OK
        console.warn('[reset] exchange attempt error (may be normal):', e.message);
      }

      if (!active) return;

      // Regardless of exchange result, check if we have a valid session now
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;

        if (data.session) {
          setReady(true);
          setError('');
          if (window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, '/reset-password');
          }
        } else {
          setError('This reset link is invalid or has expired. Please request a new one.');
        }
      } catch (e) {
        if (!active) return;
        setError('Unable to connect. Please check your internet connection and try again.');
      }

      if (active) setChecking(false);
    };

    initRecovery();

    // Backup: listen for auth state changes (Supabase may auto-detect recovery from URL)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true);
        setError('');
        setChecking(false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess('Your password has been updated. Redirecting to login...');
      await supabase.auth.signOut();
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      const msg = err.message || '';
      if (msg === 'Failed to fetch' || msg === 'Load failed') {
        setError('Unable to connect. Please check your internet connection and try again.');
      } else {
        setError(msg || 'Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Reset password</h2>
          <p className="text-sm text-muted-foreground/70">Set a new password for your account</p>
        </div>

        {checking ? (
          <div className="flex items-center justify-center rounded-xl border border-border/40 bg-muted/20 px-4 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-[13px] font-semibold text-foreground/70">New password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
                  disabled={!ready || loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-[13px] font-semibold text-foreground/70">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
                  disabled={!ready || loading}
                />
              </div>
            </div>

            {success && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!ready || loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold text-[15px] shadow-lg shadow-blue-600/20 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Updating...' : 'Update password'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
