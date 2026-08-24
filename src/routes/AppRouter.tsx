import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ClerkAuthProvider from '../components/auth/ClerkAuthProvider';
import { isClerkEnabled } from '../lib/clerk';
import LandingPage from '../pages/LandingPage';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import WorkspaceEntryPage from '../pages/WorkspaceEntryPage';
import LoginOAuthCallback from '../pages/LoginOAuthCallback';
import LoginOAuthComplete from '../pages/LoginOAuthComplete';
import UploadPage from '../pages/UploadPage';
import AtLedgerPage from '../pages/AtLedgerPage';
import AtLedgerSectionLayout from '../pages/AtLedgerSectionLayout';
import AnalysisPage from '../pages/AnalysisPage';
import CashFlowPage from '../pages/CashFlowPage';
import ReconPage from '../pages/ReconPage';
import AtLetterPage from '../pages/AtLetterPage';
import ReportsPage from '../pages/ReportsPage';
import SourcesPage from '../pages/SourcesPage';
import AtRewardsPage from '../pages/AtRewardsPage';
import AtChargebacksPage from '../pages/AtChargebacksPage';
import ProfilePage from '../pages/ProfilePage';
import AdminHandoffPage from '../pages/AdminHandoffPage';
import PricingPage from '../pages/PricingPage';
import CheckoutPage from '../pages/CheckoutPage';
import SubscriptionActivatingPage from '../pages/SubscriptionActivatingPage';
import DashboardNav from '../components/layout/DashboardNav';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PostPaymentRoute from '../components/auth/PostPaymentRoute';
import { DEFAULT_DASHBOARD_PATH } from '../lib/pendingPdfDownload';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/common/PageLoader';

const CalculatorsPage = lazy(() => import('../pages/CalculatorsPage'));
const ChannelPartnersPage = lazy(() => import('../pages/ChannelPartnersPage'));

function RouteFallback() {
  return <PageLoader title="Loading page" detail="Getting everything ready…" />;
}

function UploadPageRoute() {
  const { user } = useAuth();
  return <UploadPage key={user?.userId ?? 'anon'} />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calculators" element={<Navigate to="/dashboard/calculators" replace />} />
        <Route
          path="/calculators/:slug"
          element={<Navigate to="/dashboard/calculators" replace />}
        />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/workspace" element={<WorkspaceEntryPage />} />
        <Route path="/post-login" element={<WorkspaceEntryPage />} />
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
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminHandoffPage />
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
          <Route path="overview" element={<Navigate to="/dashboard/at-ledger/overview" replace />} />
          <Route path="analysis" element={<Navigate to="/dashboard/at-ledger/overview" replace />} />
          <Route path="cashflow" element={<Navigate to="/dashboard/at-ledger/cashflow" replace />} />
          <Route
            path="reconciliation"
            element={<Navigate to="/dashboard/at-ledger/reconciliation" replace />}
          />
          <Route path="reports" element={<Navigate to="/dashboard/at-ledger/reports" replace />} />
          <Route path="at-letter" element={<AtLetterPage />} />
          <Route path="at-ledger" element={<AtLedgerPage />} />
          <Route element={<AtLedgerSectionLayout />}>
            <Route path="at-ledger/cashflow" element={<CashFlowPage />} />
            <Route path="at-ledger/reconciliation" element={<ReconPage />} />
            <Route path="at-ledger/overview" element={<AnalysisPage />} />
            <Route path="at-ledger/reports" element={<ReportsPage />} />
          </Route>
          <Route path="calculators" element={<CalculatorsPage />} />
          <Route path="calculators/:slug" element={<CalculatorsPage />} />
          <Route path="chargebacks" element={<AtChargebacksPage />} />
          <Route path="channel-partners/*" element={<ChannelPartnersPage />} />
          <Route path="rewards" element={<AtRewardsPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
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
