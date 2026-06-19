import { SESSION_TTL_MS } from './session';

const REGISTER_DRAFT_KEY = 'asktill:register-draft';

export type RegisterDraftStep = 0 | 1 | 2;

export type RegisterDraft = {
  email: string;
  step: RegisterDraftStep;
  emailVerified: boolean;
  fullName: string;
  companyName: string;
  savedAt: number;
};

export function loadRegisterDraft(): RegisterDraft | null {
  try {
    const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RegisterDraft;
    if (!draft.email?.trim()) return null;
    if (Date.now() - draft.savedAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(REGISTER_DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveRegisterDraft(draft: Omit<RegisterDraft, 'savedAt'>) {
  try {
    sessionStorage.setItem(
      REGISTER_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearRegisterDraft() {
  try {
    sessionStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
