/** Statement the user is explicitly viewing (analyze result or opened saved report). */
const ACTIVE_VIEW_KEY = 'asktill:active-statement-view';

let activeViewStatementId: string | null = null;

function readPersistedActiveView(): string | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_VIEW_KEY)?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

function writePersistedActiveView(statementId: string | null): void {
  try {
    if (statementId) sessionStorage.setItem(ACTIVE_VIEW_KEY, statementId);
    else sessionStorage.removeItem(ACTIVE_VIEW_KEY);
  } catch {
    /* ignore */
  }
}

export function pinActiveStatementView(statementId: string | null | undefined): void {
  activeViewStatementId = statementId?.trim() || null;
  writePersistedActiveView(activeViewStatementId);
}

export function getActiveStatementViewId(): string | null {
  if (activeViewStatementId) return activeViewStatementId;
  activeViewStatementId = readPersistedActiveView();
  return activeViewStatementId;
}

export function clearActiveStatementView(): void {
  activeViewStatementId = null;
  writePersistedActiveView(null);
}
