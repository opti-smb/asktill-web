import { Navigate, useLocation } from 'react-router-dom';

import PageLoader from '../common/PageLoader';
import { useAuth } from '../../context/AuthContext';

/**
 * After Stripe redirect the in-memory access JWT is gone (full page navigation).
 * Wait for Auth bootstrap (httpOnly refresh + checkout sessionStorage bridge)
 * before deciding — never bounce to /login while restore is still in flight.
 */
export default function PostPaymentRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { ready, isAuth } = useAuth();
  const from = `${location.pathname}${location.search}`;

  if (!ready) {
    return (
      <PageLoader
        title="Payment successful"
        detail="Restoring your session so you can continue…"
      />
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <>{children}</>;
}
