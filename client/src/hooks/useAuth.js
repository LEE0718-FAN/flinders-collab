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

    // Call backend API for login
    let result;
    try {
      result = await apiLogin({ email, password });
    } catch (err) {
      // If fetch fails (cold start / network), retry once after a short delay
      if (err.message === 'Failed to fetch' || err.message === 'Load failed') {
        await new Promise((r) => setTimeout(r, 2000));
        result = await apiLogin({ email, password });
      } else {
        throw err;
      }
    }

    // Set the session in Supabase client
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      if (error) throw error;
      return data;
    } catch (sessionErr) {
      // Even if setSession fails, store the session manually so the app works
      const manualSession = {
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        user: {
          id: result.user.id,
          email: result.user.email,
          user_metadata: { name: result.user.full_name, full_name: result.user.full_name },
        },
      };
      setSession(manualSession);
      setUser(manualSession.user);
      return manualSession;
    }
  }, [setSession, setUser]);

  const signup = useCallback(async (email, password, metadata) => {
    if (!email.endsWith('@flinders.edu.au')) {
      throw new Error('Please use your @flinders.edu.au email address');
    }

    // Call backend signup API
    let signupResult;
    try {
      signupResult = await apiSignup({
        email,
        password,
        full_name: metadata.name,
        student_id: metadata.student_id,
        major: metadata.major,
      });
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message === 'Load failed') {
        await new Promise((r) => setTimeout(r, 2000));
        signupResult = await apiSignup({
          email,
          password,
          full_name: metadata.name,
          student_id: metadata.student_id,
          major: metadata.major,
        });
      } else {
        throw err;
      }
    }

    // After signup, immediately log in
    let loginResult;
    try {
      loginResult = await apiLogin({ email, password });
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message === 'Load failed') {
        await new Promise((r) => setTimeout(r, 2000));
        loginResult = await apiLogin({ email, password });
      } else {
        throw err;
      }
    }

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: loginResult.session.access_token,
        refresh_token: loginResult.session.refresh_token,
      });
      if (error) throw error;
      return data;
    } catch (sessionErr) {
      const manualSession = {
        access_token: loginResult.session.access_token,
        refresh_token: loginResult.session.refresh_token,
        user: {
          id: loginResult.user.id,
          email: loginResult.user.email,
          user_metadata: { name: loginResult.user.full_name, full_name: loginResult.user.full_name },
        },
      };
      setSession(manualSession);
      setUser(manualSession.user);
      return manualSession;
    }
  }, [setSession, setUser]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore signout errors
    }
    clearAuth();
  }, [clearAuth]);

  return { user, session, isLoading, login, signup, logout };
}
