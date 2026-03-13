import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiSignup, apiLogin, apiLogout } from '@/services/auth';
import { saveSession, loadSession, clearSession } from '@/lib/auth-token';

export function useAuth() {
  const { user, session, isLoading, setUser, setSession, setLoading, logout: clearAuth } = useAuthStore();

  // On mount, restore session from localStorage
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      setUser(stored.user || null);
    }
    setLoading(false);
  }, [setUser, setSession, setLoading]);

  const login = useCallback(async (email, password) => {
    if (!email.endsWith('@flinders.edu.au')) {
      throw new Error('Please use your @flinders.edu.au email address');
    }

    const result = await apiLogin({ email, password });

    const sessionData = {
      access_token: result.session.access_token,
      expires_at: result.session.expires_at,
      user: {
        id: result.user.id,
        email: result.user.email,
        is_admin: result.user.is_admin || false,
        user_metadata: {
          name: result.user.full_name,
          full_name: result.user.full_name,
        },
      },
    };

    // Save to our own localStorage
    saveSession(sessionData);
    setSession(sessionData);
    setUser(sessionData.user);

    return sessionData;
  }, [setSession, setUser]);

  const signup = useCallback(async (email, password, metadata) => {
    if (!email.endsWith('@flinders.edu.au')) {
      throw new Error('Please use your @flinders.edu.au email address');
    }

    await apiSignup({
      email,
      password,
      full_name: metadata.name,
      student_id: metadata.student_id,
      major: metadata.major,
    });

    // After signup, log in
    const result = await apiLogin({ email, password });

    const sessionData = {
      access_token: result.session.access_token,
      expires_at: result.session.expires_at,
      user: {
        id: result.user.id,
        email: result.user.email,
        is_admin: result.user.is_admin || false,
        user_metadata: {
          name: result.user.full_name,
          full_name: result.user.full_name,
        },
      },
    };

    saveSession(sessionData);
    setSession(sessionData);
    setUser(sessionData.user);

    return sessionData;
  }, [setSession, setUser]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Clear local session even if remote revoke fails
    } finally {
      clearSession();
      clearAuth();
    }
  }, [clearAuth]);

  return { user, session, isLoading, login, signup, logout };
}
