/** Statement the user is explicitly viewing (analyze result or opened saved report). */
const ACTIVE_VIEW_KEY = 'asktill:active-statement-view';

type ActiveViewPersisted = {
  id: string;
  /** User picked an older month from Previous Reports — do not auto-jump to newest. */
  historical?: boolean;
};

let activeViewStatementId: string | null = null;
let activeViewHistorical = false;

function parsePersisted(raw: string | null): ActiveViewPersisted | null {
  if (!raw?.trim()) return null;
  const text = raw.trim();
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as ActiveViewPersisted;
      const id = parsed?.id?.trim();
      if (id) return { id, historical: Boolean(parsed.historical) };
    } catch {
      /* fall through — legacy plain id */
    }
  }
  return { id: text, historical: false };
}

function readPersistedActiveView(): ActiveViewPersisted | null {
  try {
    return parsePersisted(sessionStorage.getItem(ACTIVE_VIEW_KEY));
  } catch {
    return null;
  }
}

function writePersistedActiveView(state: ActiveViewPersisted | null): void {
  try {
    if (state?.id) {
      sessionStorage.setItem(
        ACTIVE_VIEW_KEY,
        JSON.stringify({ id: state.id, historical: Boolean(state.historical) }),
      );
    } else {
      sessionStorage.removeItem(ACTIVE_VIEW_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function pinActiveStatementView(
  statementId: string | null | undefined,
  options?: { historical?: boolean },
): void {
  const id = statementId?.trim() || null;
  activeViewStatementId = id;
  activeViewHistorical = id ? Boolean(options?.historical) : false;
  writePersistedActiveView(id ? { id, historical: activeViewHistorical } : null);
}

export function getActiveStatementViewId(): string | null {
  if (activeViewStatementId) return activeViewStatementId;
  const persisted = readPersistedActiveView();
  activeViewStatementId = persisted?.id ?? null;
  activeViewHistorical = Boolean(persisted?.historical);
  return activeViewStatementId;
}

/** True when the user explicitly opened an older saved month (Previous Reports). */
export function isHistoricalStatementView(): boolean {
  if (activeViewStatementId) return activeViewHistorical;
  const persisted = readPersistedActiveView();
  activeViewStatementId = persisted?.id ?? null;
  activeViewHistorical = Boolean(persisted?.historical);
  return activeViewHistorical;
}

export function clearActiveStatementView(): void {
  activeViewStatementId = null;
  activeViewHistorical = false;
  writePersistedActiveView(null);
}
