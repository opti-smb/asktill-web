import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

import PageLoader from '../components/common/PageLoader';
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
    return <PageLoader title="Checking access" detail="Confirming your admin session…" />;
  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  if (!isAdmin) {
    return <Navigate to={DEFAULT_DASHBOARD_PATH} replace />;
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '56vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
        role="alert"
      >
        <div style={{ maxWidth: '22rem' }}>
          <p style={{ marginBottom: 12, color: 'var(--neg, #B91C1C)' }}>{error}</p>
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
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: 'var(--brand, #1E40AF)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageLoader
      title="Opening Admin Dashboard"
      detail="Signing you in securely — this only takes a moment."
    />
  );
}
