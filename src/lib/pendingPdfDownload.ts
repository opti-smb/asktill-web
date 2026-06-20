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

export function clearPendingPdfDownload(): void {
  try {
    sessionStorage.removeItem(PENDING_PDF_KEY);
  } catch {
    /* ignore */
  }
}

/** After sign-in: return to AT Letter when a download was queued; else honor explicit from or upload. */
export function getPostLoginRedirect(explicitFrom?: string | null): string {
  if (peekPendingPdfDownload()) {
    return '/#at-letter';
  }
  const from = explicitFrom?.trim();
  return from || '/onboarding';
}
