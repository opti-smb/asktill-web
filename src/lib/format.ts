/** Shared currency / points formatting (rewards, partners, wallet). */

export function formatMoney(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

export function formatPoints(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(n)));
}
