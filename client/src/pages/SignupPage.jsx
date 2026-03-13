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
    await signup(email, password, metadata);
    navigate('/dashboard');
  };

  return (
    <AuthLayout>
      <SignupForm onSubmit={handleSignup} />
      <div className="mt-6 flex justify-center">
        <ReportButton section="signup" />
      </div>
    </AuthLayout>
  );
}
