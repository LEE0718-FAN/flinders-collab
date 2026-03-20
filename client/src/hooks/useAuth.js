import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiSignup, apiLogin, apiLogout, apiUpdateProfile, apiGuestLogin, apiGuestCleanup, apiRequestPasswordReset, apiRefreshSession } from '@/services/auth';
import { saveSession, loadSession, loadStoredSession, clearSession, isSessionExpired } from '@/lib/auth-token';
import { subscribeToPush } from '@/lib/push';

function buildSessionData(result, fallback = {}) {
  const accountType = result.user.account_type || fallback.account_type || 'flinders';

  return {
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token || fallback.refresh_token || null,
    expires_at: result.session.expires_at,
    account_type: accountType,
    is_tester: result.user.is_tester || fallback.is_tester || false,
    user: {
      id: result.user.id,
      email: result.user.email,
      is_admin: result.user.is_admin || false,
      is_tester: result.user.is_tester || fallback.is_tester || false,
      account_type: accountType,
      user_metadata: {
        name: result.user.full_name,
        full_name: result.user.full_name,
        avatar_url: result.user.avatar_url || null,
        account_type: accountType,
        major: result.user.major || fallback.major || null,
        university: result.user.university || fallback.university || null,
      },
    },
  };
}

export function useAuth() {
  const { user, session, isLoading, setUser, setSession, setLoading, logout: clearAuth } = useAuthStore();

  // On mount, restore session from localStorage
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const stored = loadStoredSession();
      if (!stored) {
        if (active) setLoading(false);
        return;
      }

      if (!isSessionExpired(stored)) {
        if (active) {
          setSession(stored);
          setUser(stored.user || null);
          setLoading(false);
          subscribeToPush().catch(() => {});
        }
        return;
      }

      if (!stored.refresh_token) {
        clearSession();
        if (active) {
          clearAuth();
          setLoading(false);
        }
        return;
      }

      try {
        const refreshed = await apiRefreshSession(stored.refresh_token);
        const sessionData = buildSessionData(refreshed, {
          account_type: stored.account_type,
          is_tester: stored.is_tester,
        });
        saveSession(sessionData);
        if (active) {
          setSession(sessionData);
          setUser(sessionData.user);
        }
      } catch {
        clearSession();
        if (active) {
          clearAuth();
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [setUser, setSession, setLoading]);

  const login = useCallback(async (email, password) => {
    const result = await apiLogin({ email, password });
    const sessionData = buildSessionData(result, {
      account_type: email.endsWith('@flinders.edu.au') ? 'flinders' : 'general',
    });

    saveSession(sessionData);
    setSession(sessionData);
    setUser(sessionData.user);
    subscribeToPush().catch(() => {});

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
      university: metadata.university,
      account_type: accountType,
    });

    // After signup, log in
    const result = await apiLogin({ email, password });
    const sessionData = buildSessionData(result, {
      account_type: accountType,
      major: metadata.major,
      university: metadata.university,
    });

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

  const requestPasswordReset = useCallback(async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }
    return apiRequestPasswordReset(normalizedEmail);
  }, []);

  const guestLogin = useCallback(async () => {
    const result = await apiGuestLogin();
    const sessionData = buildSessionData(result, { is_tester: true, account_type: 'flinders' });

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

  return { user, session, isLoading, login, signup, logout, updateUser, requestPasswordReset, guestLogin, guestCleanup };
}
