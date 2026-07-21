import { Routes, Route, Navigate } from 'react-router-dom';
import ClerkAuthProvider from '../components/auth/ClerkAuthProvider';
import { isClerkEnabled } from '../lib/clerk';
import LandingPage from '../pages/LandingPage';
import CalculatorsPage from '../pages/CalculatorsPage';
import ChannelPartnersPage from '../pages/ChannelPartnersPage';
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
import SourcesPage from '../pages/SourcesPage';
import ProfilePage from '../pages/ProfilePage';
import PricingPage from '../pages/PricingPage';
import CheckoutPage from '../pages/CheckoutPage';
import SubscriptionActivatingPage from '../pages/SubscriptionActivatingPage';
import DashboardNav from '../components/layout/DashboardNav';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PostPaymentRoute from '../components/auth/PostPaymentRoute';
import { DEFAULT_DASHBOARD_PATH } from '../lib/pendingPdfDownload';
import { useAuth } from '../context/AuthContext';

function UploadPageRoute() {
  const { user } = useAuth();
  return <UploadPage key={user?.userId ?? 'anon'} />;
}

function AppRoutes() {
  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calculators" element={<Navigate to="/dashboard/calculators" replace />} />
        <Route
          path="/calculators/:slug"
          element={<Navigate to="/dashboard/calculators" replace />}
        />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/sso-callback" element={<LoginOAuthCallback />} />
        <Route path="/login/oauth-complete" element={<LoginOAuthComplete />} />
        <Route
          path="/pricing/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing/activating"
          element={
            <PostPaymentRoute>
              <SubscriptionActivatingPage />
            </PostPaymentRoute>
          }
        />
        <Route
          path="/pricing"
          element={
            <ProtectedRoute>
              <PricingPage />
            </ProtectedRoute>
          }
        />
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
          <Route index element={<Navigate to={DEFAULT_DASHBOARD_PATH} replace />} />
          <Route path="overview" element={<Navigate to={DEFAULT_DASHBOARD_PATH} replace />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="cashflow" element={<CashFlowPage />} />
          <Route path="reconciliation" element={<ReconPage />} />
          <Route path="at-letter" element={<AtLetterPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="calculators" element={<CalculatorsPage />} />
          <Route path="calculators/:slug" element={<CalculatorsPage />} />
          <Route path="channel-partners/*" element={<ChannelPartnersPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="rewards" element={<Navigate to={DEFAULT_DASHBOARD_PATH} replace />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
    </Routes>
  );
}

export default function AppRouter() {
  return isClerkEnabled() ? (
    <ClerkAuthProvider>
      <AppRoutes />
    </ClerkAuthProvider>
  ) : (
    <AppRoutes />
  );
}
