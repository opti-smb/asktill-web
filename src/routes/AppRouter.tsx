import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import SignupPage from '../pages/SignupPage';
import LoginPage from '../pages/LoginPage';
import UploadPage from '../pages/UploadPage';
import AnalysisPage from '../pages/AnalysisPage';
import CashFlowPage from '../pages/CashFlowPage';
import ReconPage from '../pages/ReconPage';
import DashboardNav from '../components/layout/DashboardNav';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardNav />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AnalysisPage />} />
          <Route path="cashflow" element={<CashFlowPage />} />
          <Route path="reconciliation" element={<ReconPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
