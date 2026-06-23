import { fetchAtLetterHtmlPreview, USER_LOGOUT_EVENT } from './api';

function cacheKey(statementId: string, monthOnly: boolean): string {
  return `${statementId.trim()}:${monthOnly ? 'month' : 'rolling'}`;
}

const htmlByKey = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export function getCachedAtLetterHtml(
  statementId?: string | null,
  monthOnly = false,
): string | null {
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
  opts?: { monthOnly?: boolean },
): Promise<string | null> {
  const id = statementId.trim();
  if (!id) return null;
  const monthOnly = Boolean(opts?.monthOnly);
  const key = cacheKey(id, monthOnly);

  const cached = htmlByKey.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = fetchAtLetterHtmlPreview(id, { monthOnly })
    .then(({ data }) => {
      const html = typeof data === 'string' ? data : String(data ?? '');
      if (html) htmlByKey.set(key, html);
      return html || null;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, task);
  return task;
}

if (typeof window !== 'undefined') {
  window.addEventListener(USER_LOGOUT_EVENT, () => clearAtLetterHtmlCache());
}
