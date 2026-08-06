import { fetchAtLetterHtmlPreview, USER_LOGOUT_EVENT } from './api';
import { LETTER_WIPED_EVENT } from './atLetterCache';

/**
 * Bump when AT Letter HTML layout/CSS changes so the dashboard
 * drops stale in-memory HTML (hard refresh alone is not enough
 * if the SPA tab stayed open).
 * Keep in sync with backend AT_LETTER_HTML_BUILD_VERSION.
 */
export const AT_LETTER_HTML_CLIENT_VERSION = 66;

const VERSION_STORAGE_KEY = 'asktill:at-letter-html-client-v';

function cacheKey(statementId: string, monthOnly: boolean): string {
  return `${AT_LETTER_HTML_CLIENT_VERSION}:${statementId.trim()}:${monthOnly ? 'month' : 'rolling'}`;
}

const htmlByKey = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function dropStaleClientVersion(): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = window.sessionStorage.getItem(VERSION_STORAGE_KEY);
    const next = String(AT_LETTER_HTML_CLIENT_VERSION);
    if (prev !== next) {
      htmlByKey.clear();
      inflight.clear();
      window.sessionStorage.setItem(VERSION_STORAGE_KEY, next);
    }
  } catch {
    /* private mode / blocked storage */
  }
}

dropStaleClientVersion();

export function getCachedAtLetterHtml(
  statementId?: string | null,
  monthOnly = false,
): string | null {
  dropStaleClientVersion();
  const id = statementId?.trim();
  if (!id) return null;
  return htmlByKey.get(cacheKey(id, monthOnly)) ?? null;
}

export function clearAtLetterHtmlCache(): void {
  htmlByKey.clear();
  inflight.clear();
}

/** Fetch AT Letter HTML once; reuse in-memory for instant tab switches. */
export async function prefetchAtLetterHtml(
  statementId: string,
  opts?: { monthOnly?: boolean; force?: boolean },
): Promise<string | null> {
  dropStaleClientVersion();
  const id = statementId.trim();
  if (!id) return null;
  const monthOnly = Boolean(opts?.monthOnly);
  const key = cacheKey(id, monthOnly);

  if (!opts?.force) {
    const cached = htmlByKey.get(key);
    if (cached) return cached;

    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const task = (async () => {
    const maxAttempts = monthOnly ? 6 : 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const { data } = await fetchAtLetterHtmlPreview(id, {
          monthOnly,
          buildVersion: AT_LETTER_HTML_CLIENT_VERSION,
        });
        const html = typeof data === 'string' ? data : String(data ?? '');
        if (html) {
          htmlByKey.set(key, html);
          return html;
        }
      } catch {
        /* cache may not be ready yet after analyze — retry */
      }
      if (attempt + 1 < maxAttempts) {
        const delayMs = monthOnly ? 600 * (attempt + 1) : 1500 * (attempt + 1);
        await new Promise((resolve) => {
          window.setTimeout(resolve, delayMs);
        });
      }
    }
    return null;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, task);
  return task;
}

if (typeof window !== 'undefined') {
  window.addEventListener(USER_LOGOUT_EVENT, () => clearAtLetterHtmlCache());
  window.addEventListener(LETTER_WIPED_EVENT, () => clearAtLetterHtmlCache());
}
