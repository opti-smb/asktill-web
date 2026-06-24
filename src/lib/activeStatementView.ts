/** Statement the user is explicitly viewing (analyze result or opened saved report). */
let activeViewStatementId: string | null = null;

export function pinActiveStatementView(statementId: string | null | undefined): void {
  activeViewStatementId = statementId?.trim() || null;
}

export function getActiveStatementViewId(): string | null {
  return activeViewStatementId;
}

export function clearActiveStatementView(): void {
  activeViewStatementId = null;
}
