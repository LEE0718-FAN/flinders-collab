import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToastProvider } from '@/components/ui/toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const RoomPage = lazy(() => import('@/pages/RoomPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const DeadlinesPage = lazy(() => import('@/pages/DeadlinesPage'));
const BoardPage = lazy(() => import('@/pages/BoardPage'));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/deadlines" element={<ProtectedRoute><DeadlinesPage /></ProtectedRoute>} />
                <Route path="/board" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
                <Route path="/rooms/:roomId" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
