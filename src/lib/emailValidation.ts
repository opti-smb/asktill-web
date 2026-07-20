export interface EmailValidationResult {
  ok: boolean;
  message?: string;
  suggestion?: string;
}

const GMAIL_DOMAIN = 'gmail.com';

/** Domains that are almost always a mistyped @gmail.com */
const GMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gail.com': GMAIL_DOMAIN,
  'gamil.com': GMAIL_DOMAIN,
  'gmil.com': GMAIL_DOMAIN,
  'gmal.com': GMAIL_DOMAIN,
  'gmali.com': GMAIL_DOMAIN,
  'gmai.com': GMAIL_DOMAIN,
  'gnail.com': GMAIL_DOMAIN,
  'gmaill.com': GMAIL_DOMAIN,
  'gmailcom': GMAIL_DOMAIN,
  'gmail.co': GMAIL_DOMAIN,
  'gmail.con': GMAIL_DOMAIN,
  'gmail.cm': GMAIL_DOMAIN,
  'gmail.comm': GMAIL_DOMAIN,
  'gmail.om': GMAIL_DOMAIN,
  'gmail.cpm': GMAIL_DOMAIN,
  'gmailcom.com': GMAIL_DOMAIN,
  'mail.com': GMAIL_DOMAIN,
  'googlemail.com': GMAIL_DOMAIN,
};

/** Common misspellings of popular providers (login / register). */
const DOMAIN_TYPOS: Record<string, string> = {
  ...GMAIL_DOMAIN_TYPOS,
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outllook.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'icloud.con': 'icloud.com',
  'icloud.co': 'icloud.com',
};

const EMAIL_FORMAT =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function parseEmailParts(email: string): { local: string; domain: string } | null {
  if (!email.includes('@')) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || !domain) return null;
  return { local, domain };
}

function baseFormatValidation(raw: string, email: string): EmailValidationResult | null {
  if (!email) {
    return { ok: false, message: 'Email is required' };
  }
  if (/\s/.test(raw)) {
    return { ok: false, message: 'Email cannot contain spaces' };
  }
  if (!email.includes('@')) {
    return {
      ok: false,
      message: 'Enter your email like name@company.com',
    };
  }
  const parts = parseEmailParts(email);
  if (!parts) {
    return {
      ok: false,
      message: 'Enter one @ symbol, like name@company.com',
    };
  }
  if (!EMAIL_FORMAT.test(email)) {
    return {
      ok: false,
      message: 'Enter a valid email address (example: you@company.com)',
    };
  }
  if (!parts.domain.includes('.')) {
    return {
      ok: false,
      message: 'Enter the full domain (example: @company.com)',
    };
  }
  const tld = parts.domain.split('.').pop() ?? '';
  if (tld.length < 2) {
    return {
      ok: false,
      message: 'Enter a valid email address (example: you@company.com)',
    };
  }
  return null;
}

/** Validates format and common domain typos; accepts Gmail, company, and other domains. */
export function validateEmailInput(raw: string): EmailValidationResult {
  const email = normalizeEmail(raw);
  const formatError = baseFormatValidation(raw, email);
  if (formatError) return formatError;

  const parts = parseEmailParts(email)!;
  const { local, domain } = parts;

  const typoFix = DOMAIN_TYPOS[domain];
  if (typoFix && typoFix !== domain) {
    const suggestion = `${local}@${typoFix}`;
    return {
      ok: false,
      message: `That domain looks misspelled. Did you mean ${suggestion}?`,
      suggestion,
    };
  }

  return { ok: true };
}

/** Register flow — same rules as login (any valid business or personal email). */
export const validateRegisterEmail = validateEmailInput;

/** @deprecated Use validateRegisterEmail */
export const validateRegisterGmailEmail = validateRegisterEmail;

export function getEmailSuggestion(raw: string): string | null {
  const result = validateEmailInput(raw);
  return result.suggestion ?? null;
}

export function emailFieldRules() {
  return {
    required: 'Email is required',
    validate: (value: string) => {
      const result = validateEmailInput(value);
      if (!result.ok) return result.message ?? 'Enter a valid email address';
      return true;
    },
  } as const;
}

export function isLoginEmailFailure(err: unknown): boolean {
  // Only treat structured "not registered" / missing account as an email problem.
  // Wrong password is also 401 — do not map that to an email-typo message.
  const notRegistered = (err as { response?: { data?: unknown } })?.response?.data;
  if (notRegistered && typeof notRegistered === 'object') {
    const detail = (notRegistered as { detail?: unknown }).detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const code = String((detail as { code?: string }).code ?? '');
      if (code === 'not_registered') return true;
    }
  }
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 404;
}

export function isInvalidPasswordFailure(err: unknown): boolean {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown }).detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      return String((detail as { code?: string }).code ?? '') === 'invalid_password';
    }
    if (typeof detail === 'string' && /invalid email or password/i.test(detail)) {
      return true;
    }
  }
  return false;
}

/** Friendly message for failed password login (not "session expired"). */
export function loginCredentialErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number; data?: unknown } })?.response?.status;
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (status === 401 || status === 400) {
    if (data && typeof data === 'object') {
      const detail = (data as { detail?: unknown }).detail;
      if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        const obj = detail as { code?: string; message?: string };
        const code = String(obj.code ?? '');
        if (code === 'invalid_password') {
          return obj.message?.trim() || 'Wrong password. Try again.';
        }
        if (code === 'not_registered') {
          return obj.message?.trim() || 'No account for this email. Please register first.';
        }
        if (obj.message?.trim()) return obj.message.trim();
      }
      if (typeof detail === 'string' && detail.trim()) {
        if (/invalid email or password/i.test(detail)) {
          return 'Wrong password. Try again.';
        }
        return detail.trim();
      }
    }
    return 'Wrong password. Try again.';
  }
  return 'Sign in failed. Check your email and password, then try again.';
}
