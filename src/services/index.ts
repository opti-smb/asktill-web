/**
 * Service layer entry (I/O / network / DOM).
 *
 * - `pdfExportService` — browser PDF capture
 * - `rewardsService` / `billingService` — domain API facades (stable import path)
 * - Auth access JWT is memory-only; refresh uses httpOnly cookie via Auth `/api/auth/refresh`
 * - Remaining analyze/report helpers still live in `lib/api.ts` (compat barrel)
 */

export * from './pdfExportService';
export * from './rewardsService';
export * from './billingService';

export {
  login,
  refreshAccessSession,
  clerkLogin,
  clerkLoginWithRetry,
  fetchCurrentUser,
  logoutApi,
  register,
  analyzeWithProgress,
  getApiError,
  getToken,
  setToken,
  clearToken,
  clearAppSession,
} from '../lib/api';
