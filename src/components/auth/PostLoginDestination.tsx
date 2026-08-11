import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReportSync } from '../../hooks/useReportSync';
import {
  consumePostLoginRouting,
  peekPostLoginRouting,
} from '../../lib/pendingPdfDownload';

/**
 * After sign-in we navigate to Business Brief immediately (no history cold-start).
 * First-time users (zero statements) are steered to upload only after a fresh
 * history fetch — never from the stale logged-out ready+empty state.
 */
export default function PostLoginDestination() {
  const { historyReady, savedCount } = useReportSync();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  /** Must see history loading after sign-in before trusting empty count. */
  const sawFreshFetchRef = useRef(false);

  useEffect(() => {
    if (!peekPostLoginRouting()) {
      sawFreshFetchRef.current = false;
      return;
    }

    // Stale "ready + 0" from before login must not send existing users to upload.
    if (!historyReady) {
      sawFreshFetchRef.current = true;
      return;
    }

    if (!sawFreshFetchRef.current) return;
    if (!consumePostLoginRouting()) return;
    if (savedCount > 0) return;
    if (pathname.startsWith('/onboarding')) return;
    navigate('/onboarding', { replace: true });
  }, [historyReady, savedCount, navigate, pathname]);

  return null;
}
