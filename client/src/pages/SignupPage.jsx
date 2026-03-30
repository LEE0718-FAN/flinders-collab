import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import SignupForm from '@/components/auth/SignupForm';
import ReportButton from '@/components/ReportButton';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (email, password, metadata) => {
    const result = await signup(email, password, metadata);
    navigate('/login', {
      replace: true,
      state: {
        signupNotice: result?.message || 'Check your email to verify your account before signing in.',
        signupEmail: email,
      },
    });
  };

  return (
    <>
      <AuthLayout>
        <SignupForm onSubmit={handleSignup} />
      </AuthLayout>
      <ReportButton section="signup" floating />
    </>
  );
}
