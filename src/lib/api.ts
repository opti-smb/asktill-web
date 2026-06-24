import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { isTokenExpired } from './jwt';

import {
  ANALYZE_TIMEOUT_MS,
  buildFallbackPipelineEvents,
  CLASSIC_PIPELINE_STEP_MS,
  type AnalyzeProgressEvent,
} from './analyzeProgress';
import type { AnalyzeResult, WeekReportsViewApi } from './analyzeResponse';
import { periodKeyFromLabel } from './atLetterStatement';

export { formatAskResponseForChat } from './analyzeResponse';

const TOKEN_KEY =
  import.meta.env.TOKEN_STORAGE_KEY ?? 'asktill_access_token';

export const extractAccessToken = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  return (
    (d.accessToken as string | undefined) ??
    (d.access_token as string | undefined) ??
    (d.token as string | undefined) ??
    null
  );
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export interface AuthUser {
  userId: string;
  email: string | null;
  name: string | null;
  businessName: string | null;
  tier?: string;
  roles?: string[];
  industry?: string | null;
  country?: string | null;
  mfaEnabled?: boolean;
  createdAt?: string | null;
}

export const SESSION_EXPIRED_EVENT = 'asktill:session-expired';
export const USER_LOGOUT_EVENT = 'asktill:user-logout';
export const USER_STATE_RESET_EVENT = 'asktill:user-state-reset';

let sessionExpiryDispatchPending = false;

export function resetSessionExpiryDispatchGuard(): void {
  sessionExpiryDispatchPending = false;
}

function dispatchSessionExpiredOnce(): void {
  if (sessionExpiryDispatchPending) return;
  sessionExpiryDispatchPending = true;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export { dispatchSessionExpiredOnce };
export const CHAT_STORAGE_KEY = 'asktill_chat_messages';

/** Clear in-memory user data (analysis, chat, upload) without removing JWT. */
export function resetUserScopedState() {
  try {
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(USER_STATE_RESET_EVENT));
}

/** Remove JWT, chat, and notify contexts to reset in-memory state. */
export function clearAppSession() {
  clearToken();
  resetUserScopedState();
  window.dispatchEvent(new CustomEvent(USER_LOGOUT_EVENT));
}

function isSessionUnauthorized(err: AxiosError): boolean {
  return err.response?.status === 401;
}

function attachAuthInterceptor(client: ReturnType<typeof axios.create>) {
  client.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      if (err.response?.status === 401) {
        const url = String(err.config?.url ?? '');
        const isLogin = url.includes('/api/auth/login');
        const token = getToken();
        const isMe = url.includes('/api/auth/me');
        const backendProtected =
          isBackendApiRequest(err)
          && (url.includes('/api/reports/') || url.includes('/api/analyze'));
        if (
          !isLogin
          && token
          && (isMe || isTokenExpired(token) || backendProtected)
        ) {
          dispatchSessionExpiredOnce();
        }
      }
      return Promise.reject(err);
    }
  );
}

const devBase = () => (import.meta.env.DEV ? '' : undefined);

const mainApi = axios.create({
  baseURL: devBase() ?? import.meta.env.VITE_API_BASE_URL,
});
const authApi = axios.create({
  baseURL: devBase() ?? import.meta.env.VITE_AUTH_API_URL,
  timeout: 90_000,
});
const registerApi = axios.create({
  baseURL: devBase() ?? import.meta.env.VITE_REGISTER_API_URL,
  timeout: 90_000,
});

export function getApiError(err: unknown, fallback = 'Request failed.'): string {
  return formatApiError(extractApiErrorPayload(err), fallback, err);
}

export async function getApiErrorAsync(err: unknown, fallback = 'Request failed.'): Promise<string> {
  let payload = extractApiErrorPayload(err);
  const axiosErr = err as AxiosError<{ detail?: unknown; message?: string; error?: string } | Blob>;
  if (payload == null && axiosErr?.response?.data instanceof Blob) {
    try {
      payload = JSON.parse(await axiosErr.response.data.text()) as {
        detail?: unknown;
        message?: string;
        error?: string;
      };
    } catch {
      payload = null;
    }
  }
  return formatApiError(payload, fallback, err);
}

function extractApiErrorPayload(
  err: unknown,
): { detail?: unknown; message?: string; error?: string } | null {
  const axiosErr = err as AxiosError<{ detail?: unknown; message?: string; error?: string } | Blob>;
  if (!axiosErr?.response) return null;
  const d = axiosErr.response.data;
  if (d instanceof Blob) return null;
  return d ?? null;
}

function isBackendApiRequest(err: AxiosError): boolean {
  const url = String(err.config?.url ?? '');
  const base = String(err.config?.baseURL ?? '');
  if (url.includes('/api/reports/') || url.includes('/api/analyze')) {
    return true;
  }
  if (import.meta.env.DEV) {
    const devBackend = import.meta.env.VITE_API_BASE_URL ?? '';
    if (devBackend && base.includes(String(devBackend).replace(/\/$/, ''))) {
      return true;
    }
    if (!base || base === window.location.origin) {
      return url.startsWith('/api/reports') || url.startsWith('/api/analyze');
    }
  }
  const backendBase = import.meta.env.VITE_API_BASE_URL ?? '';
  if (backendBase && base.startsWith(String(backendBase).replace(/\/$/, ''))) {
    return true;
  }
  return false;
}

function formatApiError(
  d: { detail?: unknown; message?: string; error?: string } | null,
  fallback: string,
  err: unknown,
): string {
  const axiosErr = err as AxiosError;
  if (!axiosErr?.response) {
    if (axiosErr?.message === 'Network Error') {
      return import.meta.env.DEV
        ? 'Cannot reach the API. Ensure Auth (8002) and Backend (8000) are running, then refresh.'
        : 'Cannot reach the server. It may be waking up — wait 30 seconds and try again.';
    }
    if (axiosErr?.code === 'ECONNABORTED' || String(axiosErr?.message ?? '').includes('timeout')) {
      return import.meta.env.DEV
        ? 'Request timed out. Ensure backend services are running, then try again.'
        : 'Request timed out while the server was waking up. Wait 30 seconds and try again.';
    }
    return axiosErr?.message ?? fallback;
  }
  if (axiosErr.response.status === 401) {
    return 'Your session expired or could not be verified. Please sign in again.';
  }
  if (axiosErr.response.status === 503) {
    const detailText =
      typeof d?.detail === 'string'
        ? d.detail
        : typeof d?.message === 'string'
          ? d.message
          : null;
    if (detailText?.toLowerCase().includes('authentication service')) {
      return 'Sign-in service is waking up. Wait 30 seconds and try again.';
    }
  }
  if (axiosErr.response.status >= 500) {
    const detailText =
      typeof d?.detail === 'string'
        ? d.detail
        : typeof d?.message === 'string'
          ? d.message
          : typeof d?.error === 'string'
            ? d.error
            : null;
    if (detailText) return detailText;
    const backend = isBackendApiRequest(axiosErr);
    return import.meta.env.DEV
      ? backend
        ? `Server error (${axiosErr.response.status}). Check Backend logs on port 8000.`
        : `Server error (${axiosErr.response.status}). Check Authentication Service logs on port 8002.`
      : backend
        ? 'Server error — wait 30 seconds and try again.'
        : 'Sign-in server error — wait 30 seconds and try again. If it persists, use Forgot password or register again.';
  }
  if (axiosErr.response.status === 404 && (!d?.detail || d.detail === 'Not Found')) {
    const url = String(axiosErr.config?.url ?? '');
    if (url.includes('forgot-password')) {
      return 'Password reset is unavailable — restart the Authentication Service (port 8002) and try again.';
    }
  }
  if (!d) return axiosErr.message ?? fallback;
  const detail = d.detail ?? d.message ?? d.error;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const obj = detail as { message?: string; mismatches?: Array<{ message: string }> };
    if (obj.message) return obj.message;
    if (obj.mismatches?.length) {
      return obj.mismatches.map((m) => m.message).join(' ');
    }
  }
  if (Array.isArray(detail)) {
    return detail.map((x) => (x as { msg?: string })?.msg ?? String(x)).join('. ');
  }
  return fallback;
}

export interface UploadValidationResult {
  ok: boolean;
  slot_mismatches: Array<{ slot: string; filename: string; message: string }>;
  format_warnings?: Array<{ slot: string; filename: string; message: string; code?: string }>;
  period_mismatches: Array<{
    slot: string;
    filename: string;
    message: string;
    period_label?: string;
  }>;
  missing_period_warnings?: Array<{
    slot: string;
    filename: string;
    message: string;
  }>;
  stored_period_warnings?: Array<{
    slot: string;
    filename: string;
    message: string;
    period_label?: string;
    statement_id?: string | null;
  }>;
  detected_periods: Partial<Record<'bank' | 'pos' | 'ecommerce', string>>;
}

export interface StatementDuplicateInfo {
  message: string;
  periodLabel?: string | null;
  fileName?: string | null;
  uploadedAt?: string | null;
  statementId?: string | null;
}

export interface SavedReportSummaryApi {
  statement_id: string;
  period_label?: string | null;
  period_key?: string | null;
  business_name?: string | null;
  uploaded_at: string;
  file_name: string;
  parse_status: string;
  operation?: string | null;
  completeness?: string | null;
  total_gross?: number | null;
  net_to_bank?: number | null;
  difference?: number | null;
  has_pdf?: boolean;
}

export interface SavedReportListApi {
  reports: SavedReportSummaryApi[];
}

function unwrapErrorDetail(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.detail && typeof d.detail === 'object' && !Array.isArray(d.detail)) {
    return d.detail as Record<string, unknown>;
  }
  return d;
}

function duplicateDetailFromPayload(data: unknown): StatementDuplicateInfo | null {
  const d = unwrapErrorDetail(data);
  if (!d) return null;
  const code = String(d.code ?? '');
  const message = String(d.message ?? '');
  if (
    code !== 'statement_already_stored'
    && !isAlreadyStoredMessage(message)
    && !message
  ) {
    return null;
  }
  return {
    message: message || 'These statements are already stored in the database.',
    periodLabel: (d.periodLabel as string | undefined) ?? null,
    fileName: (d.fileName as string | undefined) ?? null,
    uploadedAt: (d.uploadedAt as string | undefined) ?? null,
    statementId: (d.statementId as string | undefined) ?? null,
  };
}

export function duplicateInfoFromValidation(
  result: UploadValidationResult | null,
): StatementDuplicateInfo | null {
  const warnings = result?.stored_period_warnings ?? [];
  if (!warnings.length) return null;
  const direct = warnings.find((w) => w.message?.trim())?.message?.trim();
  const periodLabel = warnings.find((w) => w.period_label)?.period_label ?? null;
  const fileName = warnings[0]?.filename ?? null;
  const statementId = warnings.find((w) => w.statement_id)?.statement_id ?? null;
  return {
    message: direct || formatStatementAlreadyStoredMessage(periodLabel),
    periodLabel,
    fileName,
    statementId,
  };
}

export function isAlreadyStoredMessage(message: string | null | undefined): boolean {
  return Boolean(message?.toLowerCase().includes('already stored in the database'));
}

export function extractStatementDuplicate(err: unknown): StatementDuplicateInfo | null {
  const axiosErr = err as AxiosError<{ detail?: unknown }>;
  if (axiosErr?.response?.status === 409) {
    return duplicateDetailFromPayload(axiosErr.response.data);
  }
  const wrapped = err as Error & { response?: { status?: number; data?: unknown } };
  if (wrapped?.response?.status === 409) {
    return duplicateDetailFromPayload(wrapped.response.data);
  }
  if (wrapped?.response?.data) {
    const fromData = duplicateDetailFromPayload(wrapped.response.data);
    if (fromData) return fromData;
  }
  if (isAlreadyStoredMessage(wrapped?.message)) {
    return duplicateDetailFromPayload(
      wrapped.response?.data ?? { message: wrapped.message },
    );
  }
  return null;
}

export function formatStatementAlreadyStoredMessage(periodLabel?: string | null): string {
  const period = periodLabel?.trim() || 'this reporting period';
  return (
    `These statements are already stored in the database (${period}). ` +
    'Upload a different month or updated files to analyze again.'
  );
}

export function storedPeriodMessage(result: UploadValidationResult | null): string | null {
  const warnings = result?.stored_period_warnings ?? [];
  if (!warnings.length) return null;
  const direct = warnings.find((w) => w.message?.trim())?.message?.trim();
  if (direct) return direct;
  const periodLabel = warnings.find((w) => w.period_label)?.period_label ?? null;
  return formatStatementAlreadyStoredMessage(periodLabel);
}

export function hasStoredPeriodConflict(result: UploadValidationResult | null): boolean {
  return Boolean((result?.stored_period_warnings?.length ?? 0) > 0);
}

/** Validation response received for the current files (ignores ok flag — used for duplicate UX). */
export function validationSettledForFiles(
  result: UploadValidationResult | null,
  fileKeysMatch: boolean,
  checking: boolean,
  validationError: boolean,
): boolean {
  return Boolean(result && fileKeysMatch && !checking && !validationError);
}

export type UploadSlotId = 'bank' | 'pos' | 'ecommerce';

/** Fast month hint from filename while server validation runs (matches backend name rules). */
export function periodLabelFromFilename(filename: string | null | undefined): string | null {
  if (!filename?.trim()) return null;
  const key = periodKeyFromLabel(filename);
  if (!key) return null;
  const [year, month] = key.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return null;
  const monthName = new Date(Number(year), monthIndex, 1).toLocaleString('en-US', { month: 'long' });
  return `${monthName} ${year}`;
}

/** One message per box: wrong statement type first, then month mismatch. */
export function primaryWarningForSlot(
  result: UploadValidationResult | null,
  slot: UploadSlotId,
): string {
  if (!result) return '';
  const pick = (list: Array<{ slot: string; message?: string }>) => {
    const row = list.find(
      (m) => m.slot === slot && m.message?.trim() && !isAlreadyStoredMessage(m.message),
    );
    return row?.message?.trim() ?? '';
  };
  return (
    pick(result.slot_mismatches)
    || pick(result.format_warnings ?? [])
    || pick(result.period_mismatches)
    || pick(result.missing_period_warnings ?? [])
  );
}

/** Already-stored month warning for a slot (shown in upload boxes, not only the header). */
export function storedPeriodWarningForSlot(
  result: UploadValidationResult | null,
  slot: UploadSlotId,
): string {
  if (!result?.stored_period_warnings?.length) return '';
  const warnings = result.stored_period_warnings;
  const direct = warnings.find(
    (w) => w.slot === slot && w.message?.trim(),
  )?.message?.trim();
  if (direct) return direct;
  const batch = warnings.find((w) => w.message?.trim())?.message?.trim();
  if (!batch) return '';
  if (warnings.some((w) => w.slot === slot)) return batch;
  if (result.detected_periods?.[slot]) return batch;
  return '';
}

/** Per-box upload warning: file type / month issues, then already-stored month. */
export function slotUploadWarning(
  result: UploadValidationResult | null,
  slot: UploadSlotId,
): string {
  return primaryWarningForSlot(result, slot) || storedPeriodWarningForSlot(result, slot);
}

export function warningsBySlot(result: UploadValidationResult | null) {
  return {
    bank: slotUploadWarning(result, 'bank'),
    pos: slotUploadWarning(result, 'pos'),
    ecommerce: slotUploadWarning(result, 'ecommerce'),
  };
}

function dedupeMismatchRows<T extends { slot: string; message?: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = `${row.slot}|${(row.message ?? '').trim()}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Merge live + analyze validation without repeating the same slot warning twice. */
export function mergeUploadValidationResults(
  live: UploadValidationResult | null,
  fromAnalyze: UploadValidationResult | null,
): UploadValidationResult | null {
  if (!live && !fromAnalyze) return null;
  if (!live) return fromAnalyze;
  if (!fromAnalyze) return live;
  return {
    ok: live.ok && fromAnalyze.ok,
    slot_mismatches: dedupeMismatchRows([
      ...live.slot_mismatches,
      ...fromAnalyze.slot_mismatches,
    ]),
    period_mismatches: dedupeMismatchRows([
      ...live.period_mismatches,
      ...fromAnalyze.period_mismatches,
    ]),
    missing_period_warnings: dedupeMismatchRows([
      ...(live.missing_period_warnings ?? []),
      ...(fromAnalyze.missing_period_warnings ?? []),
    ]),
    stored_period_warnings: (live.stored_period_warnings?.length ?? 0) > 0
      ? live.stored_period_warnings
      : (fromAnalyze.stored_period_warnings ?? []),
    format_warnings: dedupeMismatchRows([
      ...(live.format_warnings ?? []),
      ...(fromAnalyze.format_warnings ?? []),
    ]),
    detected_periods: { ...fromAnalyze.detected_periods, ...live.detected_periods },
  };
}

/** True when this upload box has a slot, period, or missing-month issue in the API payload. */
export function slotIssuesInResult(
  result: UploadValidationResult | null,
  slot: UploadSlotId,
): boolean {
  if (!result) return false;
  const lists = [
    result.slot_mismatches,
    result.format_warnings ?? [],
    result.period_mismatches,
    result.missing_period_warnings ?? [],
  ];
  return lists.some((arr) =>
    arr.some(
      (m) => m.slot === slot && m.message?.trim() && !isAlreadyStoredMessage(m.message),
    ),
  );
}

/** Safe gate for Continue — ok flag plus any per-box warning text. */
export function batchValidationPasses(result: UploadValidationResult | null): boolean {
  if (!result?.ok) return false;
  if (hasStoredPeriodConflict(result)) return false;
  const w = warningsBySlot(result);
  return !(w.bank || w.pos || w.ecommerce);
}

export function extractUploadMismatches(err: unknown): UploadValidationResult | null {
  const axiosErr = err as AxiosError<{
    detail?: {
      slot_mismatches?: UploadValidationResult['slot_mismatches'];
      period_mismatches?: UploadValidationResult['period_mismatches'];
      mismatches?: Array<{ slot: string; filename: string; message: string }>;
    };
  }>;
  if (axiosErr?.response?.status !== 422) return null;
  const detail = axiosErr.response.data?.detail;
  if (!detail || typeof detail !== 'object') return null;

  const slot_mismatches = detail.slot_mismatches ?? [];
  const period_mismatches = detail.period_mismatches ?? [];
  const combined = detail.mismatches ?? [];
  if (!slot_mismatches.length && !period_mismatches.length && !combined.length) {
    return null;
  }

  const known = new Set([...slot_mismatches, ...period_mismatches].map((m) => m.filename));
  const extra = combined.filter((m) => !known.has(m.filename));
  return {
    ok: false,
    slot_mismatches: [...slot_mismatches, ...extra.filter((m) => !period_mismatches.some((p) => p.slot === m.slot))],
    period_mismatches,
    missing_period_warnings: [],
    stored_period_warnings: [],
    detected_periods: {},
  };
}

export const validateUploads = (files: UploadFiles) => {
  const form = new FormData();
  if (files.bank) form.append('bank', files.bank, files.bank.name);
  if (files.pos) form.append('pos', files.pos, files.pos.name);
  if (files.ecommerce) form.append('ecommerce', files.ecommerce, files.ecommerce.name);
  return mainApi.post<UploadValidationResult>('/api/validate-uploads', form, {
    timeout: 120_000,
  });
};

/** Validate uploads; warm auth/backend first, retry once on cold-start auth failures. */
export async function validateUploadsWithRetry(files: UploadFiles) {
  warmupBackend();
  await ensureAuthServiceReady(8_000);

  const attempt = () => validateUploads(files);

  try {
    return await attempt();
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr?.response?.status;
    const retryable =
      axiosErr?.code === 'ECONNABORTED'
      || axiosErr?.message === 'Network Error'
      || !axiosErr?.response
      || status === 503
      || status === 401;
    if (!retryable) throw err;
    await ensureAuthServiceReady(45_000);
    warmupBackend();
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    return attempt();
  }
}

/** Wake Render services before login or upload (no-op when already warm). */
function serviceOrigin(envKey: 'VITE_API_BASE_URL' | 'VITE_AUTH_API_URL' | 'VITE_REGISTER_API_URL'): string {
  const raw = import.meta.env[envKey];
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '');
  }
  if (envKey === 'VITE_API_BASE_URL') return 'http://localhost:8000';
  if (envKey === 'VITE_AUTH_API_URL') return 'http://localhost:8002';
  return 'http://localhost:8003';
}

function isHealthyServicePayload(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'status' in data &&
      (data as { status?: string }).status === 'ok',
  );
}

async function probeServiceHealth(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const res = await axios.get(url, { timeout: timeoutMs });
    return res.status === 200 && isHealthyServicePayload(res.data);
  } catch {
    return false;
  }
}

export function warmupBackend() {
  void probeServiceHealth(`${serviceOrigin('VITE_API_BASE_URL')}/api/health`, 15_000);
}

async function probeAuthHealth(timeoutMs: number): Promise<boolean> {
  try {
    if (import.meta.env.DEV) {
      const res = await authApi.get('/health', { timeout: timeoutMs });
      return res.status === 200 && isHealthyServicePayload(res.data);
    }
    return probeServiceHealth(`${serviceOrigin('VITE_AUTH_API_URL')}/health`, timeoutMs);
  } catch {
    return false;
  }
}

export function warmupAuthService() {
  void probeAuthHealth(15_000);
}

const AUTH_WARM_TTL_MS = 3 * 60 * 1000;
let authWarmUntil = 0;
let authWarmupInFlight: Promise<boolean> | null = null;

export function isAuthServiceWarm(): boolean {
  return Date.now() < authWarmUntil;
}

function markAuthServiceWarm() {
  authWarmUntil = Date.now() + AUTH_WARM_TTL_MS;
}

/** Probe auth health; cache success so repeat sign-ins skip cold-start waits. */
export async function ensureAuthServiceReady(probeTimeoutMs = 4_000): Promise<boolean> {
  if (isAuthServiceWarm()) return true;
  if (authWarmupInFlight) return authWarmupInFlight;

  authWarmupInFlight = (async () => {
    try {
      const ok = await probeAuthHealth(probeTimeoutMs);
      if (ok) {
        markAuthServiceWarm();
        return true;
      }
      void probeAuthHealth(60_000).then((warm) => {
        if (warm) markAuthServiceWarm();
      });
      return false;
    } finally {
      authWarmupInFlight = null;
    }
  })();

  return authWarmupInFlight;
}

/** @deprecated Prefer ensureAuthServiceReady */
export async function warmupAuthServiceReady(timeoutMs = 4_000): Promise<boolean> {
  return ensureAuthServiceReady(timeoutMs);
}

export function warmupRegistrationService() {
  void probeServiceHealth(`${serviceOrigin('VITE_REGISTER_API_URL')}/health`, 15_000);
}

export function isLocalDevServices(): boolean {
  if (!import.meta.env.DEV) return false;
  const auth = serviceOrigin('VITE_AUTH_API_URL');
  return auth.includes('localhost') || auth.includes('127.0.0.1');
}

export function warmupServices() {
  warmupBackend();
  warmupAuthService();
  warmupRegistrationService();
  void ensureAuthServiceReady(4_000);
}

const attachBearer = (cfg: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    cfg.headers.set('Authorization', `Bearer ${token}`);
  }
  return cfg;
};

mainApi.interceptors.request.use(attachBearer);
authApi.interceptors.request.use(attachBearer);
attachAuthInterceptor(mainApi);
attachAuthInterceptor(authApi);

export function normalizeUser(data: unknown): AuthUser | null {
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const u = (root?.user ?? data) as Record<string, unknown> | null;
  if (!u || typeof u !== 'object') return null;
  const userId = (u.userId ?? u.user_id ?? u.id ?? u.sub) as string | undefined;
  if (!userId?.trim()) return null;
  const email = (u.email as string | undefined) ?? null;
  const businessName = (u.businessName ?? u.business_name) as string | undefined;
  const fullName = (u.fullName ?? u.full_name ?? u.name) as string | undefined;
  return {
    userId,
    email,
    name: fullName?.trim() || businessName?.trim() || null,
    businessName: businessName?.trim() || null,
    tier: u.tier as string | undefined,
    roles: u.roles as string[] | undefined,
    industry: (u.industry as string | undefined) ?? null,
    country: (u.country as string | undefined) ?? null,
    mfaEnabled: (u.mfaEnabled ?? u.mfa_enabled) as boolean | undefined,
    createdAt: (u.createdAt ?? u.created_at) as string | undefined ?? null,
  };
}

export const login = (email: string, password: string) =>
  authApi.post('/api/auth/login', { email, password });

export const clerkLogin = (sessionId: string) =>
  authApi.post('/api/auth/clerk-login', { sessionId }, { timeout: 12_000 });

const CLERK_LOGIN_MAX_ATTEMPTS = 4;
const CLERK_LOGIN_RETRY_MS = 1_200;

function isRetryableClerkLoginError(err: unknown): boolean {
  const axiosErr = err as AxiosError;
  if (!axiosErr.response) return true;
  const status = axiosErr.response.status;
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

/** Retry clerk-login while Auth Service cold-starts (common after Google redirect). */
export async function clerkLoginWithRetry(sessionId: string) {
  const localDev = isLocalDevServices();
  let lastErr: unknown;

  // Warm auth in parallel — do not block the first login on health probes.
  if (!isAuthServiceWarm()) {
    void ensureAuthServiceReady(localDev ? 8_000 : 10_000);
  }

  for (let attempt = 0; attempt < CLERK_LOGIN_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      warmupAuthService();
      await new Promise((resolve) =>
        window.setTimeout(resolve, (localDev ? 300 : CLERK_LOGIN_RETRY_MS) * attempt),
      );
      await ensureAuthServiceReady(localDev ? 8_000 : 6_000);
    }
    try {
      const response = await clerkLogin(sessionId);
      markAuthServiceWarm();
      return response;
    } catch (err) {
      lastErr = err;
      if (!isRetryableClerkLoginError(err) || attempt === CLERK_LOGIN_MAX_ATTEMPTS - 1) {
        throw err;
      }
    }
  }
  throw lastErr;
}

/** Remove Clerk OAuth identity when Google account never completed AskTill registration. */
export const clerkCleanupUnregistered = (sessionId: string) =>
  authApi.post<{ message: string }>('/api/auth/clerk/cleanup-unregistered', {
    sessionId,
  }, { timeout: 20_000 });

export const checkEmail = (email: string) =>
  authApi.post<{ registered: boolean; message?: string }>(
    '/api/auth/check-email',
    { email },
    { timeout: 10_000 },
  );

/** Sync AskTill DB password after Clerk forgot-password flow (Clerk emails the OTP). */
export const forgotPasswordCompleteClerk = (sessionId: string, newPassword: string) =>
  authApi.post<{ message: string }>('/api/auth/forgot-password/complete-clerk', {
    sessionId,
    newPassword,
  });

export interface NotRegisteredInfo {
  message: string;
  code?: string;
  googleEmail?: string;
}

function notRegisteredFromPayload(data: unknown): NotRegisteredInfo | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const detail = d.detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const obj = detail as Record<string, unknown>;
    if (obj.code === 'not_registered' || String(obj.message ?? '').toLowerCase().includes('register')) {
      return {
        code: 'not_registered',
        message: String(obj.message ?? 'No account for this email. Please register first.'),
        googleEmail:
          typeof obj.googleEmail === 'string' ? obj.googleEmail : undefined,
      };
    }
  }
  return null;
}

export function extractNotRegistered(err: unknown): NotRegisteredInfo | null {
  const axiosErr = err as AxiosError<{ detail?: unknown }>;
  if (axiosErr?.response?.status === 401 || axiosErr?.response?.status === 403) {
    const fromBody = notRegisteredFromPayload(axiosErr.response.data);
    if (fromBody) return fromBody;
  }
  const wrapped = err as Error & { response?: { status?: number; data?: unknown } };
  if (wrapped?.response?.status === 401 || wrapped?.response?.status === 403) {
    return notRegisteredFromPayload(wrapped.response.data);
  }
  return null;
}

/** Stateless JWT — client discards token; safe to call on sign-out. */
export const logoutApi = () => authApi.post('/api/auth/logout').catch(() => undefined);

export const fetchCurrentUser = () => authApi.get('/api/auth/me');

export const changePassword = (currentPassword: string, newPassword: string) =>
  authApi.post('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });

export const register = (payload: Record<string, unknown>) =>
  registerApi.post('/api/register', payload);

export interface UploadFiles {
  bank?: File;
  pos?: File;
  ecommerce?: File;
}

function analyzeFormData(bank?: File, pos?: File, ecommerce?: File): FormData {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return form;
}

function mainApiBaseUrl(): string {
  return import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL ?? '');
}

const analyze = (bank?: File, pos?: File, ecommerce?: File, force = false) =>
  mainApi.post('/api/analyze', analyzeFormData(bank, pos, ecommerce), {
    timeout: ANALYZE_TIMEOUT_MS,
    params: force ? { force: true } : undefined,
  });

function statementIdFromProgressEvent(event: AnalyzeProgressEvent): string | null {
  const raw = event.statement_id ?? event.statementId;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

export { statementIdFromProgressEvent };

export async function fetchSavedReportWithRetry(statementId: string): Promise<AnalyzeResult> {
  warmupBackend();
  await ensureAuthServiceReady(12_000);
  const id = statementId.trim();
  if (!id) {
    throw new Error('No saved statement id.');
  }
  const request = () =>
    mainApi.get<AnalyzeResult>(`/api/reports/${encodeURIComponent(id)}`, {
      timeout: 120_000,
    });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const { data } = await request();
      return data as AnalyzeResult;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr?.response?.status;
      const retryable =
        status === 503
        || status === 401
        || status === 404
        || axiosErr?.code === 'ECONNABORTED'
        || axiosErr?.message === 'Network Error'
        || !axiosErr?.response;
      if (!retryable || attempt >= 7) {
        throw err;
      }
      await ensureAuthServiceReady(attempt >= 2 ? 45_000 : 15_000);
      warmupBackend();
      await new Promise((resolve) => window.setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw new Error('Could not load saved report.');
}

async function recoverLatestSavedAnalyzeResult(): Promise<AnalyzeResult | null> {
  warmupBackend();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await ensureAuthServiceReady(attempt >= 2 ? 45_000 : 15_000);
    try {
      const { data: history } = await fetchReportHistory();
      const latestId = history.reports?.[0]?.statement_id;
      if (latestId) {
        return await fetchSavedReportWithRetry(latestId);
      }
    } catch {
      /* auth/history may be cold right after a long analyze stream */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 900 * (attempt + 1)));
  }
  return null;
}

/** Load newest saved report from history — used when analyze stream ends without inline result. */
export async function recoverSavedAnalyzeFromHistory(): Promise<AnalyzeResult | null> {
  return recoverLatestSavedAnalyzeResult();
}

function captureStatementIdFromEvent(
  event: AnalyzeProgressEvent,
  pending: { id: string | null },
): void {
  const sid = statementIdFromProgressEvent(event);
  if (sid) pending.id = sid;
}

async function recoverAnalyzeAfterStreamFailure(
  files: UploadFiles,
  onEvent: (event: AnalyzeProgressEvent) => void,
  force: boolean,
  allowClassicRetry = false,
): Promise<AnalyzeResult> {
  warmupBackend();
  await ensureAuthServiceReady(45_000);

  const fromHistory = await recoverLatestSavedAnalyzeResult();
  if (fromHistory) {
    onEvent({
      stage: 'complete',
      message: 'Opening your dashboard…',
      statement_id: fromHistory.statement_id ?? undefined,
    });
    return fromHistory;
  }

  if (!allowClassicRetry) {
    throw new Error('Analysis finished without a result.');
  }

  try {
    return await analyzeViaClassicEndpoint(files, onEvent, force);
  } catch (classicErr) {
    const duplicate = extractStatementDuplicate(classicErr);
    if (duplicate?.statementId) {
      const loaded = await fetchSavedReportWithRetry(duplicate.statementId);
      onEvent({
        stage: 'complete',
        message: 'Opening your dashboard…',
        statement_id: duplicate.statementId,
      });
      return loaded;
    }
    throw classicErr;
  }
}

async function analyzeViaStream(
  files: UploadFiles,
  onEvent: (event: AnalyzeProgressEvent) => void,
  force = false,
): Promise<AnalyzeResult> {
  const form = analyzeFormData(files.bank, files.pos, files.ecommerce);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  let timeoutId = window.setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  const bumpStreamTimeout = () => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  };

  const streamUrl = `${mainApiBaseUrl()}/api/analyze/stream${force ? '?force=true' : ''}`;

  let res: Response;
  try {
    res = await fetch(streamUrl, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        `Analysis timed out after ${Math.round(ANALYZE_TIMEOUT_MS / 1000)} seconds. Try again with smaller files.`,
      );
    }
    throw err;
  }

  if (res.status === 404 || res.status === 405) {
    window.clearTimeout(timeoutId);
    throw Object.assign(new Error('STREAM_UNAVAILABLE'), { code: 'STREAM_UNAVAILABLE' });
  }

  if (!res.ok) {
    window.clearTimeout(timeoutId);
    let payload: { detail?: unknown; message?: string } | null = null;
    try {
      payload = (await res.json()) as { detail?: unknown; message?: string };
    } catch {
      payload = null;
    }
    const duplicate = duplicateDetailFromPayload(payload);
    const err = new Error(
      duplicate?.message ?? formatApiError(payload, 'Analysis failed.', null),
    ) as Error & {
      response?: { status: number; data: unknown };
    };
    err.response = {
      status: res.status,
      data: payload?.detail ?? payload,
    };
    throw err;
  }

  if (!res.body) {
    window.clearTimeout(timeoutId);
    throw new Error('Analysis stream unavailable.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AnalyzeResult | null = null;
  const pending = { id: null as string | null };
  let persistFailed = false;

  const parseSseEvent = (line: string): AnalyzeProgressEvent | null => {
    if (!line.startsWith('data: ')) return null;
    try {
      return JSON.parse(line.slice(6).trim()) as AnalyzeProgressEvent;
    } catch {
      return null;
    }
  };

  const consumeLine = (line: string) => {
    const event = parseSseEvent(line);
    if (!event) return;
    bumpStreamTimeout();
    captureStatementIdFromEvent(event, pending);
    if (event.stage === 'complete') {
      if (event.persist_failed) persistFailed = true;
      if (event.result) {
        result = event.result as AnalyzeResult;
      }
      onEvent(event);
      return;
    }
    if (event.stage === 'error') {
      const msg =
        typeof event.message === 'string' ? event.message : 'Analysis failed.';
      const err = new Error(msg) as Error & { response?: { status: number; data: unknown } };
      if (event.status) {
        const detail =
          event.detail && typeof event.detail === 'object'
            ? (event.detail as Record<string, unknown>)
            : { message: msg, code: 'statement_already_stored' };
        err.response = { status: event.status, data: detail };
      }
      throw err;
    }
    onEvent(event);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bumpStreamTimeout();
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        const trimmed = line.trim();
        if (trimmed) consumeLine(trimmed);
      }
    }
    if (buffer.trim()) consumeLine(buffer.trim());
  } catch (readErr) {
    const readMessage = readErr instanceof Error ? readErr.message : String(readErr);
    const aborted =
      (readErr instanceof Error && readErr.name === 'AbortError')
      || /BodyStreamBuffer was aborted|aborted|network error/i.test(readMessage);
    if (!aborted) {
      throw readErr;
    }
    if (!pending.id && !result) {
      throw new Error(
        `Analysis connection closed before finishing${readMessage ? `: ${readMessage}` : ''}. `
        + 'The server may still have saved your report — check Previous reports or try again.',
      );
    }
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!result && pending.id) {
    onEvent({
      stage: 'complete',
      message: 'Opening your dashboard…',
      statement_id: pending.id,
    });
    try {
      result = await fetchSavedReportWithRetry(pending.id);
    } catch {
      /* fall through — history recovery below */
    }
  }

  if (!result) {
    result = await recoverLatestSavedAnalyzeResult();
  }

  if (!result) {
    throw new Error(
      persistFailed
        ? 'Analysis finished but saving failed. Open Previous reports or try again.'
        : 'Analysis finished without a result.',
    );
  }
  return result;
}

/** Fallback: POST /api/analyze with staged progress while the request runs. */
async function analyzeViaClassicEndpoint(
  files: UploadFiles,
  onEvent: (event: AnalyzeProgressEvent) => void,
  force = false,
): Promise<AnalyzeResult> {
  const timeline = buildFallbackPipelineEvents();
  let stepIndex = 0;
  onEvent(timeline[0]);
  const tick = window.setInterval(() => {
    if (stepIndex >= timeline.length - 1) return;
    stepIndex += 1;
    onEvent(timeline[stepIndex]);
  }, CLASSIC_PIPELINE_STEP_MS);

  try {
    const { data } = await analyze(files.bank, files.pos, files.ecommerce, force);
    onEvent({ stage: 'done', message: 'All set — opening your dashboard…' });
    onEvent({ stage: 'complete', message: 'Opening your dashboard…' });
    return data as AnalyzeResult;
  } finally {
    window.clearInterval(tick);
  }
}

/**
 * Analyze with live Server-Sent Events; fall back to classic POST if the stream fails.
 */
export async function analyzeWithProgress(
  files: UploadFiles,
  onEvent: (event: AnalyzeProgressEvent) => void,
  options?: { force?: boolean },
): Promise<AnalyzeResult> {
  const force = Boolean(options?.force);
  try {
    return await analyzeViaStream(files, onEvent, force);
  } catch (err) {
    if (extractStatementDuplicate(err)) {
      throw err;
    }
    const code = (err as { code?: string }).code;
    if (
      err instanceof Error
      && (
        err.message === 'Analysis finished without a result.'
        || err.message === 'Analysis finished but saving failed. Open Previous reports or try again.'
        || /Analysis connection closed before finishing/i.test(err.message)
        || /BodyStreamBuffer was aborted/i.test(err.message)
      )
    ) {
      return recoverAnalyzeAfterStreamFailure(files, onEvent, force);
    }
    if (code === 'STREAM_UNAVAILABLE') {
      return recoverAnalyzeAfterStreamFailure(files, onEvent, force, true);
    }
    throw err;
  }
}

export const fetchWeekReports = (bank?: File, pos?: File, ecommerce?: File) => {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return mainApi.post<WeekReportsViewApi>('/api/reports/weeks', form, { timeout: 120_000 });
};

export const fetchSavedWeekReports = (statementId: string) =>
  mainApi.get<WeekReportsViewApi>(`/api/reports/${statementId}/weeks`, { timeout: 120_000 });

export const ask = (question: string, files: UploadFiles = {}) => {
  const form = new FormData();
  form.append('question', question);
  if (files.bank) form.append('bank', files.bank, files.bank.name);
  if (files.pos) form.append('pos', files.pos, files.pos.name);
  if (files.ecommerce) form.append('ecommerce', files.ecommerce, files.ecommerce.name);
  return mainApi.post('/api/ask', form);
};

export const fetchReportHistory = async () => {
  warmupBackend();
  await ensureAuthServiceReady(8_000);
  const request = () =>
    mainApi.get<SavedReportListApi>('/api/reports/history', { timeout: 120_000 });

  try {
    return await request();
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr?.response?.status;
    const retryable =
      status === 503
      || status === 401
      || axiosErr?.code === 'ECONNABORTED'
      || axiosErr?.message === 'Network Error'
      || !axiosErr?.response;
    if (!retryable) throw err;
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
    await ensureAuthServiceReady(45_000);
    warmupBackend();
    try {
      return await request();
    } catch (retryErr) {
      if (isSessionUnauthorized(retryErr as AxiosError)) {
        throw retryErr;
      }
      throw err;
    }
  }
};

export const fetchSavedReport = async (statementId: string) => ({
  data: await fetchSavedReportWithRetry(statementId),
});

async function blobErrorFromAxiosResponse(data: Blob, status: number): Promise<Error> {
  const err = new Error('Download failed.') as Error & {
    response?: { status: number; data: unknown };
  };
  err.response = { status, data: null };
  try {
    const json = JSON.parse(await data.text()) as {
      detail?: unknown;
      message?: string;
      error?: string;
    };
    err.response.data = json;
    const detail = json.detail ?? json.message ?? json.error;
    if (typeof detail === 'string' && detail.trim()) {
      err.message = detail.trim();
    }
  } catch {
    /* ignore parse errors */
  }
  return err;
}

async function blobLooksLikePdf(data: Blob): Promise<boolean> {
  const head = new Uint8Array(await data.slice(0, 4).arrayBuffer());
  return (
    head.length >= 4
    && head[0] === 0x25
    && head[1] === 0x50
    && head[2] === 0x44
    && head[3] === 0x46
  );
}

/** Pre-built compact reconciliation PDF (same file saved at analyze — instant download). */
export async function downloadMonthlyReportPdf(statementId: string) {
  const id = statementId.trim();
  if (!id) {
    throw new Error('No saved statement to download.');
  }
  const path = `/api/reports/${encodeURIComponent(id)}/compact`;
  const request = () =>
    mainApi.get(path, {
      responseType: 'blob',
      timeout: 45_000,
      validateStatus: () => true,
    });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt === 0) {
      warmupBackend();
      await ensureAuthServiceReady(12_000);
    }
    const res = await request();
    if (res.status === 401) {
      await ensureAuthServiceReady(45_000);
      warmupBackend();
      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      throw await blobErrorFromAxiosResponse(res.data as Blob, res.status);
    }
    if (res.status < 400 && await blobLooksLikePdf(res.data as Blob)) {
      return { data: res.data as Blob, headers: res.headers };
    }
    if ((res.status === 404 || res.status >= 500) && attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
      continue;
    }
    throw await blobErrorFromAxiosResponse(res.data as Blob, res.status);
  }
  throw new Error('Could not download reconciliation PDF.');
}

export const downloadSavedReportCompact = (statementId: string) =>
  downloadMonthlyReportPdf(statementId);

/** @deprecated Use downloadSavedReportCompact — legacy fpdf export */
export const downloadSavedReportPdf = (statementId: string) =>
  mainApi.get(`/api/reports/${statementId}/pdf`, { responseType: 'blob' });

/** Compact reconciliation PDF (Postman layout) from saved statement or fresh uploads. */
export const downloadCompactReconciliation = (bank?: File, pos?: File, ecommerce?: File) => {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return mainApi.post('/api/analyze/export/compact', form, {
    responseType: 'blob',
    timeout: 120_000,
  });
};

/** @deprecated Use downloadCompactReconciliation */
export const downloadReconciliation = (bank?: File, pos?: File, ecommerce?: File) => {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return mainApi.post('/api/analyze/export', form, { responseType: 'blob' });
};

/** HTML preview of the full backend AT Letter template (?preview=1). */
export const fetchAtLetterHtmlPreview = (
  statementId: string,
  opts?: { monthOnly?: boolean },
) =>
  mainApi.get<string>(`/api/reports/${encodeURIComponent(statementId)}/at-letter`, {
    params: { preview: 1, ...(opts?.monthOnly ? { monthOnly: 1 } : {}) },
    responseType: 'text',
    transformResponse: [(data) => data],
    timeout: 120_000,
  });

export interface AtLetterLandingMeta {
  source: 'sample' | 'user';
  period_label?: string | null;
  business_name?: string | null;
  user_id?: string;
  statement_id?: string;
}

function atLetterLandingHeaders(userId?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const id = userId?.trim();
  if (id) headers['X-User-Id'] = id;
  return headers;
}

/** Public landing metadata — user's latest letter or Brookline sample. */
export const fetchAtLetterLandingMeta = (opts?: { userId?: string; email?: string }) => {
  const userId = opts?.userId?.trim();
  const email = opts?.email?.trim();
  return mainApi.get<AtLetterLandingMeta>('/api/at-letter/landing', {
    params: email ? { email } : userId ? { userId } : undefined,
    headers: atLetterLandingHeaders(userId),
  });
};

export const downloadWeekReports = (bank?: File, pos?: File, ecommerce?: File) => {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return mainApi.post('/api/reports/weeks/export', form, { responseType: 'blob' });
};
