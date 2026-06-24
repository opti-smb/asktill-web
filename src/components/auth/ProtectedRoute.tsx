import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import SessionExpiredOverlay from './SessionExpiredOverlay';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuth, ready, sessionExpired } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  }

  if (sessionExpired) {
    return (
      <>
        <div aria-hidden="true" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {children}
        </div>
        <SessionExpiredOverlay returnTo={location.pathname} />
      </>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
