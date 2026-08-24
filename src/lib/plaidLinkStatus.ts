export type PlaidLinkStatusKind = 'success' | 'pending' | 'error';

/** Classify Plaid link UI messages — avoid showing in-progress text as errors. */
export function plaidLinkStatusKind(message: string): PlaidLinkStatusKind {
  const lower = message.trim().toLowerCase();
  if (!lower) return 'error';

  if (
    lower.includes('linked') ||
    lower.includes('imported') ||
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
