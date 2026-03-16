import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, Mail, Hash, GraduationCap, Lock, ArrowLeft, School, Eye } from 'lucide-react';
import { FLINDERS_PROGRAMS } from '@/lib/flinders-programs';

const ACCOUNT_TYPES = [
  {
    id: 'flinders',
    label: 'Flinders Student',
    desc: 'Sign up with your @flinders.edu.au email',
    icon: GraduationCap,
    color: 'from-blue-600 to-indigo-600',
    border: 'border-blue-200 hover:border-blue-400',
    bg: 'bg-blue-50',
  },
  {
    id: 'general',
    label: 'Other University',
    desc: 'Any university email works',
    icon: School,
    color: 'from-violet-600 to-purple-600',
    border: 'border-violet-200 hover:border-violet-400',
    bg: 'bg-violet-50',
  },
  {
    id: 'tester',
    label: 'Tester',
    desc: 'Quick demo — tutorial only, no signup needed',
    icon: Eye,
    color: 'from-emerald-500 to-teal-500',
    border: 'border-emerald-200 hover:border-emerald-400',
    bg: 'bg-emerald-50',
  },
];

export default function SignupForm({ onSubmit, onGuestLogin }) {
  const [accountType, setAccountType] = useState(null); // null = choosing
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [majorQuery, setMajorQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const suggestionsRef = useRef(null);
  const majorInputRef = useRef(null);

  const filtered = majorQuery.length > 0
    ? FLINDERS_PROGRAMS.filter((p) =>
        p.toLowerCase().includes(majorQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          majorInputRef.current && !majorInputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectProgram = (program) => {
    setMajor(program);
    setMajorQuery(program);
    setShowSuggestions(false);
    setHighlightIndex(-1);
  };

  const handleMajorKeyDown = (e) => {
    if (!showSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectProgram(filtered[highlightIndex]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (accountType === 'flinders' && !email.endsWith('@flinders.edu.au')) {
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

    if (accountType === 'flinders' && !major) {
      setError('Please select your degree program');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password, {
        name,
        student_id: accountType === 'flinders' ? studentId : undefined,
        major: accountType === 'flinders' ? major : (university || undefined),
        account_type: accountType,
      });
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

  const handleGuestClick = async () => {
    setLoading(true);
    setError('');
    try {
      await onGuestLogin();
    } catch (err) {
      const msg = err.message || 'Failed';
      if (msg === 'Failed to fetch' || msg === 'Load failed') {
        setError('Server is starting up. Please try again in a few seconds.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Choose account type ──
  if (!accountType) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
          <p className="text-sm text-muted-foreground/70">Choose how you'd like to join</p>
        </div>

        <div className="space-y-2.5">
          {ACCOUNT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => type.id === 'tester' ? handleGuestClick() : setAccountType(type.id)}
                disabled={loading}
                className={`w-full flex items-center gap-3.5 rounded-xl border-2 ${type.border} p-4 text-left transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50`}
              >
                <div className={`shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${type.color} text-white shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{type.label}</p>
                  <p className="text-[12px] text-muted-foreground leading-snug">{type.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Setting up tester...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <svg className="h-4 w-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="10" />
              <text x="10" y="14" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">!</text>
            </svg>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
        </p>
      </div>
    );
  }

  // ── Step 2: Signup form ──
  const isFlinders = accountType === 'flinders';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { setAccountType(null); setError(''); }} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <h2 className="text-lg font-bold tracking-tight">
          {isFlinders ? 'Flinders Student' : 'Other University'}
        </h2>
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-semibold text-foreground/70">Full Name</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] font-semibold text-foreground/70">Email</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input
            type="email"
            placeholder={isFlinders ? 'you@flinders.edu.au' : 'you@university.edu'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
          />
        </div>
      </div>

      {isFlinders && (
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground/70">FAN ID</label>
          <div className="relative">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input placeholder="e.g. lee2086" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="h-11 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
          </div>
        </div>
      )}

      {isFlinders ? (
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground/70">Degree Program</label>
          <div className="relative">
            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
            <Input
              ref={majorInputRef}
              placeholder="Search your degree"
              value={majorQuery}
              onChange={(e) => { setMajorQuery(e.target.value); setMajor(''); setShowSuggestions(true); setHighlightIndex(-1); }}
              onFocus={() => { if (majorQuery.length > 0) setShowSuggestions(true); }}
              onKeyDown={handleMajorKeyDown}
              autoComplete="off"
              required
              className="h-11 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white"
            />
            {showSuggestions && filtered.length > 0 && (
              <div ref={suggestionsRef} className="absolute left-0 right-0 top-full mt-1 z-50 max-h-44 overflow-y-auto rounded-xl bg-white border shadow-lg">
                {filtered.map((program, i) => (
                  <button
                    key={program}
                    type="button"
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${i === highlightIndex ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50'}`}
                    onMouseEnter={() => setHighlightIndex(i)}
                    onClick={() => selectProgram(program)}
                  >
                    {program}
                  </button>
                ))}
              </div>
            )}
            {major && (
              <p className="mt-1 text-[11px] text-emerald-600 font-medium">Selected: {major}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground/70">University</label>
          <div className="relative">
            <School className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input placeholder="e.g. University of Adelaide" value={university} onChange={(e) => setUniversity(e.target.value)} required className="h-11 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground/70">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input type="password" placeholder="Min. 6 chars" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-foreground/70">Confirm</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input type="password" placeholder="Re-enter" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-11 rounded-xl pl-10 bg-muted/30 border-border/40 focus:bg-white" />
          </div>
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
        className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold text-[15px] shadow-lg shadow-blue-600/20 text-white"
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
      </p>
    </form>
  );
}
