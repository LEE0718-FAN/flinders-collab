import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import ReportButton from '@/components/ReportButton';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, guestLogin, requestPasswordReset } = useAuth();
  const navigate = useNavigate();

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
    <AuthLayout>
      <LoginForm onSubmit={handleLogin} onGuestLogin={handleGuestLogin} onRequestPasswordReset={handlePasswordReset} />
      <div className="mt-6 flex justify-center">
        <ReportButton section="login" />
      </div>
    </AuthLayout>
  );
}
