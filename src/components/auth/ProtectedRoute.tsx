import { Navigate, useLocation } from 'react-router-dom';

import PageLoader from '../common/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { isEc2BackendSession } from '../../lib/ec2BackendSession';
import { isSessionExpiredPersisted } from '../../lib/session';

import SessionExpiredOverlay from './SessionExpiredOverlay';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuth, ready, sessionExpired } = useAuth();
  const location = useLocation();
  const showSessionExpired = sessionExpired || isSessionExpiredPersisted();

  if (!ready) {
    return <PageLoader title="Signing you in" detail="Restoring your AskTill session…" />;
  }

  if (showSessionExpired) {
    // Do not keep dashboard data mounted behind the overlay (devtools / a11y can still read it).
    return <SessionExpiredOverlay returnTo={location.pathname} />;
  }

  if (!isAuth) {
    if (isEc2BackendSession()) {
      return <Navigate to="/workspace" replace />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
