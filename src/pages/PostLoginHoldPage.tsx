import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import PageLoader from '../components/common/PageLoader';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useReportSync } from '../hooks/useReportSync';
import {
  consumePostLoginRouting,
  DEFAULT_DASHBOARD_PATH,
  peekPostLoginRouting,
} from '../lib/pendingPdfDownload';

/**
 * Neutral hold after sign-in. Waits for a fresh report-history fetch, then:
 * - 0 statements → upload (/onboarding)
 * - has statements → dashboard
 * Avoids flashing Business Brief for brand-new accounts.
 */
function PostLoginHoldInner() {
  const { historyReady, savedCount } = useReportSync();
  const navigate = useNavigate();
  const sawFreshFetchRef = useRef(false);

  useEffect(() => {
    if (!peekPostLoginRouting()) {
      navigate(DEFAULT_DASHBOARD_PATH, { replace: true });
      return;
    }

    if (!historyReady) {
      sawFreshFetchRef.current = true;
      return;
    }
    if (!sawFreshFetchRef.current) return;
    if (!consumePostLoginRouting()) return;

    navigate(savedCount > 0 ? DEFAULT_DASHBOARD_PATH : '/onboarding', { replace: true });
  }, [historyReady, savedCount, navigate]);

  return (
    <PageLoader
      title="Getting your workspace ready"
      detail="Checking whether to open upload or your dashboard…"
    />
  );
}

export default function PostLoginHoldPage() {
  return (
    <ProtectedRoute>
      <PostLoginHoldInner />
    </ProtectedRoute>
  );
}
