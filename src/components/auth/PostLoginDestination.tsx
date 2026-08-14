import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReportSync } from '../../hooks/useReportSync';
import {
  consumePostLoginRouting,
  peekPostLoginRouting,
  POST_LOGIN_HOLD_PATH,
} from '../../lib/pendingPdfDownload';

/**
 * Safety net if a session still has the post-login flag on the dashboard
 * (deep-link / legacy). Prefer /post-login so Business Brief never flashes
 * for brand-new accounts.
 */
export default function PostLoginDestination() {
  const { historyReady, savedCount } = useReportSync();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sawFreshFetchRef = useRef(false);

  useEffect(() => {
    if (!peekPostLoginRouting()) {
      sawFreshFetchRef.current = false;
      return;
    }

    // Don't paint dashboard while we still need empty/history routing.
    if (pathname.startsWith('/dashboard')) {
      navigate(POST_LOGIN_HOLD_PATH, { replace: true });
      return;
    }

    if (pathname.startsWith('/onboarding') || pathname.startsWith(POST_LOGIN_HOLD_PATH)) {
      return;
    }

    if (!historyReady) {
      sawFreshFetchRef.current = true;
      return;
    }

    if (!sawFreshFetchRef.current) return;
    if (!consumePostLoginRouting()) return;
    if (savedCount > 0) return;
    navigate('/onboarding', { replace: true });
  }, [historyReady, savedCount, navigate, pathname]);

  return null;
}
