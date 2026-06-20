import { useEffect, useState } from 'react';

import { getApiError } from '../lib/api';
import { getCachedAtLetterHtml, prefetchAtLetterHtml } from '../lib/atLetterHtmlCache';
import { LETTER_UPDATED_EVENT } from '../lib/atLetterCache';
import { REPORT_HISTORY_REFRESH_EVENT } from './useReportSync';

/** Load full backend AT Letter HTML (?preview=1) for inline display. */
export function useAtLetterHtml(statementId: string | undefined): {
  html: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [html, setHtml] = useState<string | null>(() =>
    statementId ? getCachedAtLetterHtml(statementId) : null,
  );
  const [loading, setLoading] = useState(() => {
    if (!statementId?.trim()) return false;
    return !getCachedAtLetterHtml(statementId);
  });
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onRefresh = () => setTick((n) => n + 1);
    window.addEventListener(LETTER_UPDATED_EVENT, onRefresh);
    window.addEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener(LETTER_UPDATED_EVENT, onRefresh);
      window.removeEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
    };
  }, []);

  useEffect(() => {
    if (!statementId?.trim()) {
      setHtml(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    const cached = getCachedAtLetterHtml(statementId);
    if (cached) {
      setHtml(cached);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    prefetchAtLetterHtml(statementId)
      .then((fresh) => {
        if (cancelled) return;
        if (fresh) {
          setHtml(fresh);
          setError(null);
        } else if (!cached) {
          setHtml(null);
          setError('Could not load your AT Letter.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          setError(getApiError(err, 'Could not load your AT Letter.'));
          setHtml(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statementId, tick]);

  return {
    html,
    loading,
    error,
    refresh: () => setTick((n) => n + 1),
  };
}
