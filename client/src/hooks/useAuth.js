import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiSignup, apiLogin, apiLogout, apiUpdateProfile, apiGuestLogin, apiGuestCleanup } from '@/services/auth';
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
    const result = await apiLogin({ email, password });
    const accountType = result.user.account_type || (email.endsWith('@flinders.edu.au') ? 'flinders' : 'general');

    const sessionData = {
      access_token: result.session.access_token,
      expires_at: result.session.expires_at,
      account_type: accountType,
      user: {
        id: result.user.id,
        email: result.user.email,
        is_admin: result.user.is_admin || false,
        account_type: accountType,
        user_metadata: {
          name: result.user.full_name,
          full_name: result.user.full_name,
          avatar_url: result.user.avatar_url || null,
          account_type: accountType,
        },
      },
    };

    saveSession(sessionData);
    setSession(sessionData);
    setUser(sessionData.user);

    return sessionData;
  }, [setSession, setUser]);

  const signup = useCallback(async (email, password, metadata) => {
    const accountType = metadata.account_type || 'flinders';

    if (accountType === 'flinders' && !email.endsWith('@flinders.edu.au')) {
      throw new Error('Please use your @flinders.edu.au email address');
    }

    await apiSignup({
      email,
      password,
      full_name: metadata.name,
      student_id: metadata.student_id,
      major: metadata.major,
      account_type: accountType,
    });

    // After signup, log in
    const result = await apiLogin({ email, password });

    const sessionData = {
      access_token: result.session.access_token,
      expires_at: result.session.expires_at,
      account_type: accountType,
      user: {
        id: result.user.id,
        email: result.user.email,
        is_admin: result.user.is_admin || false,
        account_type: accountType,
        user_metadata: {
          name: result.user.full_name,
          full_name: result.user.full_name,
          avatar_url: result.user.avatar_url || null,
          account_type: accountType,
        },
      },
    };

    saveSession(sessionData);
    setSession(sessionData);
    setUser(sessionData.user);

    return sessionData;
  }, [setSession, setUser]);

  const updateUser = useCallback(async (formData) => {
    const updated = await apiUpdateProfile(formData);

    // Update local session with new data
    const currentSession = loadSession();
    if (currentSession) {
      const newUser = {
        ...currentSession.user,
        user_metadata: {
          ...currentSession.user.user_metadata,
          name: updated.full_name || currentSession.user.user_metadata?.name,
          full_name: updated.full_name || currentSession.user.user_metadata?.full_name,
          avatar_url: updated.avatar_url || currentSession.user.user_metadata?.avatar_url,
        },
      };
      const newSession = { ...currentSession, user: newUser };
      saveSession(newSession);
      setSession(newSession);
      setUser(newUser);
    }

    return updated;
  }, [setSession, setUser]);

  const guestLogin = useCallback(async () => {
    const result = await apiGuestLogin();

    const sessionData = {
      access_token: result.session.access_token,
      expires_at: result.session.expires_at,
      is_tester: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        is_admin: false,
        is_tester: true,
        user_metadata: {
          name: 'Tester',
          full_name: 'Tester',
          avatar_url: null,
        },
      },
    };

    saveSession(sessionData);
    setSession(sessionData);
    setUser(sessionData.user);

    return sessionData;
  }, [setSession, setUser]);

  const guestCleanup = useCallback(async () => {
    try {
      await apiGuestCleanup();
    } catch { /* ignore */ }
    clearSession();
    clearAuth();
  }, [clearAuth]);

  const logout = useCallback(async () => {
    // If tester, do full cleanup instead of just logout
    const currentSession = loadSession();
    if (currentSession?.is_tester) {
      await guestCleanup();
      return;
    }
    try {
      await apiLogout();
    } catch {
      // Clear local session even if remote revoke fails
    } finally {
      clearSession();
      clearAuth();
    }
  }, [clearAuth, guestCleanup]);

  return { user, session, isLoading, login, signup, logout, updateUser, guestLogin, guestCleanup };
}
