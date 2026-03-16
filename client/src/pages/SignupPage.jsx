import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import SignupForm from '@/components/auth/SignupForm';
import ReportButton from '@/components/ReportButton';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const { signup, guestLogin } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (email, password, metadata) => {
    await signup(email, password, metadata);
    navigate('/dashboard');
  };

  const handleGuestLogin = async () => {
    await guestLogin();
    navigate('/dashboard');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('start-interactive-tutorial'));
    }, 1500);
  };

  return (
    <AuthLayout>
      <SignupForm onSubmit={handleSignup} onGuestLogin={handleGuestLogin} />
      <div className="mt-6 flex justify-center">
        <ReportButton section="signup" />
      </div>
    </AuthLayout>
  );
}
