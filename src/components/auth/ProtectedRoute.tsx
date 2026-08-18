import { Navigate, useLocation } from 'react-router-dom';

import PageLoader from '../common/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { isEc2BackendSession } from '../../lib/ec2BackendSession';
import { hasSignedOutIntent } from '../../lib/explicitLogout';
import { isSessionExpiredPersisted } from '../../lib/session';
import RedirectToAsktillAuth from '../../pages/RedirectToAsktillAuth';

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
    if (isEc2BackendSession() && !hasSignedOutIntent()) {
      return <Navigate to="/workspace" replace />;
    }
    if (!import.meta.env.DEV) {
      return <RedirectToAsktillAuth path="/login" />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
