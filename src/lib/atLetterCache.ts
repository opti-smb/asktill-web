import type { AtLetterPreview } from './atLetterPreview';

const PREFIX = 'asktill:at-letter:';
const HAS_LETTER_KEY = 'asktill:has-saved-letter';

export const LETTER_UPDATED_EVENT = 'asktill:letter-updated';
export const LETTER_WIPED_EVENT = 'asktill:letter-wiped';

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

/** Cached live letter for logged-out landing (same account the user uploaded with). */
export function loadLandingAtLetterCache(): AtLetterPreview | null {
  const hinted = savedLetterUserId();
  if (hinted) {
    const fromHint = loadAtLetterCache(hinted);
    if (fromHint) return fromHint;
  }
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as CachedAtLetter;
      if (parsed?.letter?.mode === 'live') return parsed.letter;
    }
  } catch {
    /* ignore */
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
  window.dispatchEvent(new CustomEvent(LETTER_WIPED_EVENT));
}

/** Drop this user's landing letter when the server has no saved reports (needs auth token). */
export async function syncAtLetterCacheIfHistoryEmpty(userId: string): Promise<boolean> {
  if (!userId.trim()) return false;
  const { fetchReportHistory } = await import('./api');
  try {
    const { data } = await fetchReportHistory();
    if ((data.reports ?? []).length === 0) {
      clearUserAtLetterState(userId);
      return true;
    }
  } catch {
    /* offline / auth — keep cached letter */
  }
  return false;
}

/** Remove all AT letter keys from localStorage (logged-out landing / after server wipe). */
export function clearAllAtLetterDeviceCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX) || key === HAS_LETTER_KEY) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
    window.dispatchEvent(new CustomEvent(LETTER_WIPED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Logout keeps the letter card on landing so users see their last upload until sign-in. */
export function clearUserAtLetterOnLogout(_userId: string): void {
  /* intentionally no-op — cache cleared only on empty history / DB wipe */
}
