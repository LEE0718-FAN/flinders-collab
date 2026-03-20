import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import ReportButton from '@/components/ReportButton';
import InstallBanner from '@/components/InstallBanner';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, guestLogin, requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecoveryLink = search.get('type') === 'recovery'
      || hash.get('type') === 'recovery'
      || hash.has('access_token')
      || search.has('code');

    if (isRecoveryLink) {
      navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (email, password) => {
    await login(email, password);
    navigate('/dashboard');
  };

  const handleGuestLogin = async () => {
    await guestLogin();
    navigate('/dashboard');
  };

  const handlePasswordReset = async (email) => {
    await requestPasswordReset(email);
  };

  return (
    <AuthLayout banner={<InstallBanner />}>
      <LoginForm onSubmit={handleLogin} onGuestLogin={handleGuestLogin} onRequestPasswordReset={handlePasswordReset} />
      <ReportButton section="login" floating />
    </AuthLayout>
  );
}
