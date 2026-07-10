import { Navigate, useLocation } from 'react-router-dom';

import { getToken } from '../../lib/api';
import { isTokenExpired } from '../../lib/jwt';

/**
 * After Stripe redirect — only require a stored JWT, not a finished /me bootstrap.
 * ProtectedRoute waits on fetchCurrentUser (slow) and showed generic "Loading…" first.
 */
export default function PostPaymentRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = getToken();
  const from = `${location.pathname}${location.search}`;

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <>{children}</>;
}
