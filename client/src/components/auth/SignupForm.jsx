import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, User, Hash, GraduationCap } from 'lucide-react';

export default function SignupForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h2>
        <p className="text-sm text-muted-foreground/70 mt-1">Join your team on Flinders Collab</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-[13px] font-semibold text-foreground/70 block">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input id="name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" required />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-[13px] font-semibold text-foreground/70 block">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input id="email" type="email" placeholder="you@flinders.edu.au" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="studentId" className="text-[13px] font-semibold text-foreground/70 block">FAN ID</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input id="studentId" placeholder="lee2086" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" required />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="major" className="text-[13px] font-semibold text-foreground/70 block">Major</label>
            <div className="relative">
              <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input id="major" placeholder="Computer Science" value={major} onChange={(e) => setMajor(e.target.value)} className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" required />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-[13px] font-semibold text-foreground/70 block">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" required />
          </div>
          <p className="text-[11px] text-muted-foreground/40 pl-1">Must be at least 6 characters</p>
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
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-[13px] text-muted-foreground/60">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">Sign in</Link>
      </p>
    </form>
  );
}
