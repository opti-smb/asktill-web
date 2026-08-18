import { useEffect } from 'react';

import PageLoader from '../components/common/PageLoader';
import { sendToAsktillAuth } from '../lib/asktillAuthSite';

/** Auth UI lives on asktill.com. This Vercel app only parses/stores statements. */
export default function RedirectToAsktillAuth({
  path,
}: {
  path: '/login' | '/register';
}) {
  useEffect(() => {
    sendToAsktillAuth(path);
  }, [path]);

  return (
    <PageLoader
      title={path === '/register' ? 'Create your account' : 'Sign in'}
      detail="Taking you to asktill.com…"
    />
  );
}
