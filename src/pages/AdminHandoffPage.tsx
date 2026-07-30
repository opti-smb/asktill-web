import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { openAdminDashboard, prefetchAdminDashboard } from '../lib/api';
import { DEFAULT_DASHBOARD_PATH } from '../lib/pendingPdfDownload';

/**
 * In-app /admin entry: same Admin Console as today (separate Vercel app),
 * opened via JWT handoff — never dumps the user on Admin /login.
 */
export default function AdminHandoffPage() {
  const { ready, isAdmin, isAuth } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    prefetchAdminDashboard();
  }, []);

  useEffect(() => {
    if (!ready || !isAuth || !isAdmin || started.current) return;
    started.current = true;
    setError(null);
    void openAdminDashboard().catch((e) => {
      started.current = false;
      setError(e instanceof Error ? e.message : 'Could not open Admin Dashboard.');
    });
  }, [ready, isAuth, isAdmin]);

  if (!ready) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }} role="status">
        Loading…
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  if (!isAdmin) {
    return <Navigate to={DEFAULT_DASHBOARD_PATH} replace />;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }} role="alert">
        <p style={{ marginBottom: 12 }}>{error}</p>
        <button
          type="button"
          onClick={() => {
            started.current = false;
            setError(null);
            started.current = true;
            void openAdminDashboard().catch((e) => {
              started.current = false;
              setError(e instanceof Error ? e.message : 'Could not open Admin Dashboard.');
            });
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }} role="status">
      Opening Admin Dashboard…
    </div>
  );
}
