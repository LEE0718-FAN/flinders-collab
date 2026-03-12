import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { apiSignup, apiLogin } from '@/services/auth';

export function useAuth() {
  const { user, session, isLoading, setUser, setSession, setLoading, logout: clearAuth } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading]);

  const login = useCallback(async (email, password) => {
    if (!email.endsWith('@flinders.edu.au')) {
      throw new Error('Please use your @flinders.edu.au email address');
    }
    // Use backend API for login, then set Supabase session
    const result = await apiLogin({ email, password });
    const { data, error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    if (error) throw error;
    return data;
  }, []);

  const signup = useCallback(async (email, password, metadata) => {
    if (!email.endsWith('@flinders.edu.au')) {
      throw new Error('Please use your @flinders.edu.au email address');
    }
    // Use backend API which auto-confirms email
    await apiSignup({
      email,
      password,
      full_name: metadata.name,
      student_id: metadata.student_id,
      major: metadata.major,
    });
    // After signup, immediately log in
    const result = await apiLogin({ email, password });
    const { data, error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    if (error) throw error;
    return data;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearAuth();
  }, [clearAuth]);

  return { user, session, isLoading, login, signup, logout };
}
