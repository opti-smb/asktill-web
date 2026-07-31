import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

const AUTH_BASE = import.meta.env.DEV
  ? ((import.meta.env.VITE_AUTH_API_URL as string | undefined)?.replace(/\/$/, '') || '')
  : '/auth-api';

/** Fire-and-forget page view beacon to Auth (synced into Admin insights). */
export function trackAppView(path: string): void {
  const url = `${AUTH_BASE}/api/analytics/view`;
  const body = JSON.stringify({ source: 'app', path: path.slice(0, 200) });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch {
    /* fall through */
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

/** Mount once under BrowserRouter — records a view on each route change. */
export default function ViewBeacon() {
  const { pathname } = useLocation();
  const { ready, isAdmin } = useAuth();
  const last = useRef('');

  useEffect(() => {
    if (!ready) return;
    // Staff browsing AskTill must not inflate customer view counts.
    if (isAdmin) return;
    if (pathname === last.current) return;
    // In-app admin handoff is not a customer page view.
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return;
    last.current = pathname;
    trackAppView(pathname);
  }, [pathname, ready, isAdmin]);

  return null;
}
