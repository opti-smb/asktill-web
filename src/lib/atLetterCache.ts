import type { AtLetterPreview } from './atLetterPreview';

const PREFIX = 'asktill:at-letter:';
const HAS_LETTER_KEY = 'asktill:has-saved-letter';

export const LETTER_UPDATED_EVENT = 'asktill:letter-updated';

interface CachedAtLetter {
  letter: AtLetterPreview;
  savedAt: string;
  userId: string;
}

function storageKey(userId: string): string {
  return `${PREFIX}${userId.trim()}`;
}

/** Set after a successful analyze so logged-out landing skips the Sarah demo. */
export function markUserHasSavedLetter(userId: string): void {
  if (!userId.trim()) return;
  try {
    localStorage.setItem(HAS_LETTER_KEY, userId.trim());
  } catch {
    /* ignore */
  }
}

export function userHasSavedLetterHint(): boolean {
  try {
    return Boolean(localStorage.getItem(HAS_LETTER_KEY)?.trim());
  } catch {
    return false;
  }
}

export function savedLetterUserId(): string | null {
  try {
    return localStorage.getItem(HAS_LETTER_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

/** Persist the user's latest letter so it survives logout and page reload. */
export function saveAtLetterCache(userId: string, letter: AtLetterPreview): void {
  if (!userId.trim() || letter.mode !== 'live') return;
  try {
    const payload: CachedAtLetter = {
      letter,
      savedAt: new Date().toISOString(),
      userId: userId.trim(),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(payload));
    markUserHasSavedLetter(userId);
  } catch {
    /* quota / private mode */
  }
}

export function loadAtLetterCache(userId: string): AtLetterPreview | null {
  if (!userId.trim()) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAtLetter;
    if (parsed?.letter?.mode === 'live') return parsed.letter;
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

export function clearAtLetterCache(userId?: string): void {
  if (!userId?.trim()) return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

/** Drop the "has saved letter" flag when history is empty or user logs out. */
export function clearSavedLetterHint(userId?: string): void {
  try {
    const current = localStorage.getItem(HAS_LETTER_KEY)?.trim();
    if (!userId?.trim() || current === userId.trim()) {
      localStorage.removeItem(HAS_LETTER_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Clear cached letter card + saved hint (e.g. after DB wipe or empty report history). */
export function clearUserAtLetterState(userId: string): void {
  clearAtLetterCache(userId);
  clearSavedLetterHint(userId);
  window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
}

/**
 * Logout: keep cached letter on this device so landing still shows your last upload;
 * session token is cleared separately. Hint stays so we skip the Sarah demo.
 */
export function clearUserAtLetterOnLogout(userId: string): void {
  void userId;
  window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
}
