import { Navigate } from 'react-router-dom';

/** Unused leftover: production routes render LoginPage/RegisterPage on Vercel. */
export default function RedirectToAsktillAuth({
  path,
  signedOut = false,
}: {
  path: '/login' | '/register';
  signedOut?: boolean;
}) {
  const to = path === '/login' && signedOut ? '/login?signedOut=1' : path;
  return <Navigate to={to} replace />;
}
