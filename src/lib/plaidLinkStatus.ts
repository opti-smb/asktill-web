export type PlaidLinkStatusKind = 'success' | 'pending' | 'error';

/** Classify Plaid link UI messages — avoid showing in-progress text as errors. */
export function plaidLinkStatusKind(message: string): PlaidLinkStatusKind {
  const lower = message.trim().toLowerCase();
  if (!lower) return 'error';

  if (
    lower.includes('linked') ||
    lower.includes('imported') ||
    lower.includes('pulled') ||
    lower.includes('synced') ||
    lower.includes('nothing new') ||
    (lower.includes('saved') && lower.includes('statement'))
  ) {
    return 'success';
  }

  if (
    lower.includes('connecting') ||
    lower.includes('parsing') ||
    lower.includes('syncing') ||
    lower.includes('fetching') ||
    lower.includes('pulling') ||
    lower.includes('loading') ||
    lower.includes('waking') ||
    lower.includes('checking') ||
    lower.includes('…') ||
    lower.includes('...')
  ) {
    return 'pending';
  }

  if (
    lower.includes('failed') ||
    lower.includes('error') ||
    lower.includes('could not') ||
    lower.includes('closed before') ||
    lower.includes('not configured') ||
    lower.includes('sign in')
  ) {
    return 'error';
  }

  return 'error';
}

export function plaidLinkStatusText(eventName: string | undefined): string | null {
  switch (eventName) {
    case 'OPEN':
      return 'Opening your bank login…';
    case 'SELECT_INSTITUTION':
      return 'Bank selected…';
    case 'SUBMIT_CREDENTIALS':
      return 'Signing in…';
    case 'OPEN_OAUTH':
      return 'Continue in the bank window…';
    case 'HANDOFF':
      return 'Finishing connection…';
    case 'TRANSITION_VIEW':
      return 'Continue in Plaid…';
    default:
      return null;
  }
}
