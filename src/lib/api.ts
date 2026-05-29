import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import {
  buildFallbackPipelineEvents,
  PIPELINE_TICK_MS,
  type AnalyzeProgressEvent,
} from './analyzeProgress';
import type { AnalyzeResult, WeekReportsViewApi } from './analyzeResponse';

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

function attachAuthInterceptor(client: ReturnType<typeof axios.create>) {
  client.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      if (err.response?.status === 401) {
        const url = String(err.config?.url ?? '');
        const isLogin = url.includes('/api/auth/login');
        if (!isLogin && getToken()) {
          clearToken();
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
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
  if (axiosErr.response.status >= 500) {
    return import.meta.env.DEV
      ? `Server error (${axiosErr.response.status}). Check Authentication Service logs on port 8002.`
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
  return {
    message: direct || formatStatementAlreadyStoredMessage(periodLabel),
    periodLabel,
    fileName,
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

export function warningsBySlot(result: UploadValidationResult | null) {
  const out = { bank: '', pos: '', ecommerce: '' };
  if (!result) return out;
  for (const m of [
    ...result.slot_mismatches,
    ...result.period_mismatches,
    ...(result.missing_period_warnings ?? []),
  ]) {
    if (!m.message?.trim() || isAlreadyStoredMessage(m.message)) continue;
    if (m.slot in out) {
      out[m.slot as keyof typeof out] = out[m.slot as keyof typeof out]
        ? `${out[m.slot as keyof typeof out]} ${m.message}`
        : m.message;
    }
  }
  return out;
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

/** Wake Render services before login or upload (no-op when already warm). */
export function warmupBackend() {
  void mainApi.get('/api/health', { timeout: 20_000 }).catch(() => {});
}

export function warmupAuthService() {
  void authApi.get('/api/auth/me', { timeout: 20_000 }).catch(() => {});
}

export function warmupServices() {
  warmupBackend();
  warmupAuthService();
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
  const userId = (u.userId ?? u.user_id) as string | undefined;
  if (!userId) return null;
  const email = (u.email as string | undefined) ?? null;
  const businessName = (u.businessName ?? u.business_name) as string | undefined;
  return {
    userId,
    email,
    name: businessName || (u.name as string | undefined) || null,
    businessName: businessName ?? null,
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
  authApi.post('/api/auth/clerk-login', { sessionId });

/** Remove Clerk OAuth identity when Google account never completed AskTill registration. */
export const clerkCleanupUnregistered = (sessionId: string) =>
  authApi.post<{ message: string }>('/api/auth/clerk/cleanup-unregistered', {
    sessionId,
  });

export const checkEmail = (email: string) =>
  authApi.post<{ registered: boolean; message?: string }>('/api/auth/check-email', { email });

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

const analyze = (bank?: File, pos?: File, ecommerce?: File) =>
  mainApi.post('/api/analyze', analyzeFormData(bank, pos, ecommerce));

async function analyzeViaStream(
  files: UploadFiles,
  onEvent: (event: AnalyzeProgressEvent) => void,
): Promise<AnalyzeResult> {
  const form = analyzeFormData(files.bank, files.pos, files.ecommerce);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${mainApiBaseUrl()}/api/analyze/stream`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (res.status === 404 || res.status === 405) {
    throw Object.assign(new Error('STREAM_UNAVAILABLE'), { code: 'STREAM_UNAVAILABLE' });
  }

  if (!res.ok) {
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
    throw new Error('Analysis stream unavailable.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AnalyzeResult | null = null;

  const consumeLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const event = JSON.parse(line.slice(6)) as AnalyzeProgressEvent;
    if (event.stage === 'complete' && event.result) {
      result = event.result as AnalyzeResult;
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (trimmed) consumeLine(trimmed);
    }
  }
  if (buffer.trim()) consumeLine(buffer.trim());

  if (!result) {
    throw new Error('Analysis finished without a result.');
  }
  return result;
}

/** Fallback: POST /api/analyze with one pipeline step at a time while the request runs. */
async function analyzeViaClassicEndpoint(
  files: UploadFiles,
  onEvent: (event: AnalyzeProgressEvent) => void,
): Promise<AnalyzeResult> {
  const timeline = buildFallbackPipelineEvents();
  let stepIndex = 0;
  onEvent(timeline[0]);
  const tick = window.setInterval(() => {
    stepIndex += 1;
    if (stepIndex < timeline.length) {
      onEvent(timeline[stepIndex]);
    }
  }, PIPELINE_TICK_MS + 400);

  try {
    const { data } = await analyze(files.bank, files.pos, files.ecommerce);
    onEvent({ stage: 'views', message: 'Preparing your dashboard' });
    onEvent({ stage: 'complete', message: 'Opening your dashboard…' });
    return data as AnalyzeResult;
  } finally {
    window.clearInterval(tick);
  }
}

/**
 * Analyze with live Server-Sent Events when supported; otherwise classic POST /api/analyze.
 */
export async function analyzeWithProgress(
  files: UploadFiles,
  onEvent: (event: AnalyzeProgressEvent) => void,
): Promise<AnalyzeResult> {
  try {
    return await analyzeViaStream(files, onEvent);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'STREAM_UNAVAILABLE') {
      return analyzeViaClassicEndpoint(files, onEvent);
    }
    throw err;
  }
}

export const fetchWeekReports = (bank?: File, pos?: File, ecommerce?: File) => {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return mainApi.post<WeekReportsViewApi>('/api/reports/weeks', form);
};

export const ask = (question: string, files: UploadFiles = {}) => {
  const form = new FormData();
  form.append('question', question);
  if (files.bank) form.append('bank', files.bank, files.bank.name);
  if (files.pos) form.append('pos', files.pos, files.pos.name);
  if (files.ecommerce) form.append('ecommerce', files.ecommerce, files.ecommerce.name);
  return mainApi.post('/api/ask', form);
};

/** Same uploads as analyze; reconciliation PDF (POST /api/analyze/export). */
export const downloadReconciliation = (bank?: File, pos?: File, ecommerce?: File) => {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return mainApi.post('/api/analyze/export', form, { responseType: 'blob' });
};

export const downloadWeekReports = (bank?: File, pos?: File, ecommerce?: File) => {
  const form = new FormData();
  if (bank) form.append('bank', bank, bank.name);
  if (pos) form.append('pos', pos, pos.name);
  if (ecommerce) form.append('ecommerce', ecommerce, ecommerce.name);
  return mainApi.post('/api/reports/weeks/export', form, { responseType: 'blob' });
};
