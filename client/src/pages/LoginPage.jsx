import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import ReportButton from '@/components/ReportButton';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (email, password) => {
    await login(email, password);
    navigate('/dashboard');
  };

  return (
    <AuthLayout>
      <LoginForm onSubmit={handleLogin} />
      <div className="mt-4 flex justify-center">
        <ReportButton section="login" />
      </div>
    </AuthLayout>
  );
}
