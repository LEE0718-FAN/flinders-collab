import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import ReportButton from '@/components/ReportButton';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, guestLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (email, password) => {
    await login(email, password);
    navigate('/dashboard');
  };

  const handleGuestLogin = async () => {
    await guestLogin();
    navigate('/dashboard');
    // Tutorial will auto-start for tester users
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('start-interactive-tutorial'));
    }, 1500);
  };

  return (
    <AuthLayout>
      <LoginForm onSubmit={handleLogin} onGuestLogin={handleGuestLogin} />
      <div className="mt-6 flex justify-center">
        <ReportButton section="login" />
      </div>
    </AuthLayout>
  );
}
