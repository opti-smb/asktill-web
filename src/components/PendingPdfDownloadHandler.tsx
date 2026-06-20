import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadAtLetterPdfByIdSafe } from '../lib/atLetterDownload';
import { consumePendingPdfDownload } from '../lib/pendingPdfDownload';

/** Resume AT Letter PDF download after sign-in from any route. */
export default function PendingPdfDownloadHandler() {
  const { isAuth, ready } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || !isAuth || startedRef.current) return;
    const statementId = consumePendingPdfDownload();
    if (!statementId) return;
    startedRef.current = true;
    void downloadAtLetterPdfByIdSafe(statementId, (message) => {
      console.error(message);
    });
  }, [ready, isAuth]);

  return null;
}
