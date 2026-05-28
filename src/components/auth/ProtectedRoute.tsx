import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuth, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;

  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

