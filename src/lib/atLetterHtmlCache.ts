import { fetchAtLetterHtmlPreview, USER_LOGOUT_EVENT } from './api';

const htmlByStatementId = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export function getCachedAtLetterHtml(statementId?: string | null): string | null {
  const id = statementId?.trim();
  if (!id) return null;
  return htmlByStatementId.get(id) ?? null;
}

export function clearAtLetterHtmlCache(): void {
  htmlByStatementId.clear();
  inflight.clear();
}

/** Fetch AT Letter HTML once; reuse in-memory for instant tab switches. */
export async function prefetchAtLetterHtml(statementId: string): Promise<string | null> {
  const id = statementId.trim();
  if (!id) return null;

  const cached = htmlByStatementId.get(id);
  if (cached) return cached;

  const pending = inflight.get(id);
  if (pending) return pending;

  const task = fetchAtLetterHtmlPreview(id)
    .then(({ data }) => {
      const html = typeof data === 'string' ? data : String(data ?? '');
      if (html) htmlByStatementId.set(id, html);
      return html || null;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(id);
    });

  inflight.set(id, task);
  return task;
}

if (typeof window !== 'undefined') {
  window.addEventListener(USER_LOGOUT_EVENT, () => clearAtLetterHtmlCache());
}
