import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClerkAuthProvider from '../components/auth/ClerkAuthProvider';
import { isClerkEnabled } from '../lib/clerk';
import LandingPage from '../pages/LandingPage';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import LoginOAuthCallback from '../pages/LoginOAuthCallback';
import LoginOAuthComplete from '../pages/LoginOAuthComplete';
import UploadPage from '../pages/UploadPage';
import AnalysisPage from '../pages/AnalysisPage';
import CashFlowPage from '../pages/CashFlowPage';
import ReconPage from '../pages/ReconPage';
import AtLetterPage from '../pages/AtLetterPage';
import ReportsPage from '../pages/ReportsPage';
import ProfilePage from '../pages/ProfilePage';
import DashboardNav from '../components/layout/DashboardNav';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

function UploadPageRoute() {
  const { user } = useAuth();
  return <UploadPage key={user?.userId ?? 'anon'} />;
}

function AppRoutes() {
  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/sso-callback" element={<LoginOAuthCallback />} />
        <Route path="/login/oauth-complete" element={<LoginOAuthComplete />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <UploadPageRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardNav />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AnalysisPage />} />
          <Route path="cashflow" element={<CashFlowPage />} />
          <Route path="reconciliation" element={<ReconPage />} />
          <Route path="at-letter" element={<AtLetterPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      {isClerkEnabled() ? (
        <ClerkAuthProvider>
          <AppRoutes />
        </ClerkAuthProvider>
      ) : (
        <AppRoutes />
      )}
    </BrowserRouter>
  );
}
