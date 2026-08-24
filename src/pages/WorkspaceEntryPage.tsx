import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import PageLoader from '../components/common/PageLoader';
import { useAuth } from '../context/AuthContext';
import { useReportSync } from '../hooks/useReportSync';
import {
  consumePostLoginRouting,
  DEFAULT_DASHBOARD_PATH,
} from '../lib/pendingPdfDownload';

const HISTORY_WAIT_MS = 12_000;

/**
 * Render session only. New accounts → upload; accounts with statements → dashboard.
 */
export default function WorkspaceEntryPage() {
  const { ready, isAuth } = useAuth();
  const { historyReady, savedCount } = useReportSync();
  const navigate = useNavigate();
  const sentRef = useRef(false);
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), HISTORY_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !isAuth || sentRef.current) return;
    if (!historyReady && !waited) return;
    sentRef.current = true;
    consumePostLoginRouting();
    navigate(savedCount > 0 ? DEFAULT_DASHBOARD_PATH : '/onboarding', { replace: true });
  }, [ready, isAuth, historyReady, waited, savedCount, navigate]);

  if (ready && !isAuth) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PageLoader
      title="Opening your workspace"
      detail="Checking whether to open upload or your dashboard…"
    />
  );
}
