const PENDING_PDF_KEY = 'asktill:pending-pdf-download';

export function setPendingPdfDownload(statementId: string): void {
  if (!statementId.trim()) return;
  try {
    sessionStorage.setItem(PENDING_PDF_KEY, statementId.trim());
  } catch {
    /* ignore */
  }
}

export function peekPendingPdfDownload(): string | null {
  try {
    return sessionStorage.getItem(PENDING_PDF_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function consumePendingPdfDownload(): string | null {
  const id = peekPendingPdfDownload();
  if (!id) return null;
  try {
    sessionStorage.removeItem(PENDING_PDF_KEY);
  } catch {
    /* ignore */
  }
  return id;
}
