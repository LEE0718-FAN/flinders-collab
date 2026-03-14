import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, Mail, Hash, GraduationCap, Lock } from 'lucide-react';

export default function SignupForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [major, setMajor] = useState('');
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password, { name, student_id: studentId, major });
    } catch (err) {
      const msg = err.message || 'Signup failed';
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
        <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground/70">Join your university community</p>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
        <p className="text-[13px] font-semibold text-blue-800">Before you sign up</p>
        <ul className="text-[12px] text-blue-700 space-y-1 list-disc list-inside">
          <li>Use your <strong>Flinders University email</strong> (e.g. lee2086@flinders.edu.au)</li>
          <li>Enter your <strong>real full name</strong> as registered at Flinders</li>
          <li>Password can be anything you choose (min. 6 characters)</li>
        </ul>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-[13px] font-semibold text-foreground/70">Full Name</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input id="name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-[13px] font-semibold text-foreground/70">Email</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input id="email" type="email" placeholder="you@flinders.edu.au" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="studentId" className="text-[13px] font-semibold text-foreground/70">FAN ID</label>
          <div className="relative">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input id="studentId" placeholder="e.g. lee2086" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="major" className="text-[13px] font-semibold text-foreground/70">Major</label>
          <div className="relative">
            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input id="major" placeholder="e.g. Computer Science" value={major} onChange={(e) => setMajor(e.target.value)} required className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-[13px] font-semibold text-foreground/70">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
        </div>
        <p className="text-[11px] text-muted-foreground/40">Must be at least 6 characters</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-[13px] font-semibold text-foreground/70">Confirm Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input id="confirmPassword" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
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
        {loading ? 'Creating account...' : 'Create Account'}
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
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
      </p>
    </form>
  );
}
