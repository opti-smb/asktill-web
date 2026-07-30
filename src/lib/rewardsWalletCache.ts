import type { RewardsBalance, RewardsLedgerEntry } from './api';

const SS_KEY = 'asktill:rewards-wallet';

export type RewardsWalletCache = {
  balance: RewardsBalance;
  entries: RewardsLedgerEntry[];
  updatedAt: number;
};

let memory: RewardsWalletCache | null = null;

export function getCachedRewardsWallet(): RewardsWalletCache | null {
  if (memory?.balance) return memory;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RewardsWalletCache;
    if (!parsed?.balance) return null;
    memory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function putCachedRewardsWallet(
  balance: RewardsBalance,
  entries: RewardsLedgerEntry[],
): void {
  memory = { balance, entries, updatedAt: Date.now() };
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(memory));
  } catch {
    /* ignore */
  }
}

export function clearCachedRewardsWallet(): void {
  memory = null;
  try {
    sessionStorage.removeItem(SS_KEY);
  } catch {
    /* ignore */
  }
}
