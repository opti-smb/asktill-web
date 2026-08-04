/**
 * Per-user AskTill risk threshold customization.
 * AskTill defaults stay in RISK_THRESHOLDS; overrides merge on evaluate.
 */

import {
  RISK_THRESHOLDS,
  type CalculatorId,
  type RiskThresholdOverride,
} from '@asktill/calculators';

export type RiskThresholdPrefs = Partial<
  Record<CalculatorId, { highRisk: number; lowRisk: number }>
>;

const KEY_PREFIX = 'asktill.riskThresholds.v1:';

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId.trim() || 'anon'}`;
}

export function loadRiskThresholdPrefs(userId: string): RiskThresholdPrefs {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RiskThresholdPrefs;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: RiskThresholdPrefs = {};
    for (const [id, row] of Object.entries(parsed)) {
      if (!row || typeof row !== 'object') continue;
      const highRisk = Number((row as { highRisk?: unknown }).highRisk);
      const lowRisk = Number((row as { lowRisk?: unknown }).lowRisk);
      if (!Number.isFinite(highRisk) || !Number.isFinite(lowRisk)) continue;
      if (!RISK_THRESHOLDS[id as CalculatorId]) continue;
      out[id as CalculatorId] = { highRisk, lowRisk };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveRiskThresholdPrefs(userId: string, prefs: RiskThresholdPrefs): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

export function clearRiskThresholdPrefs(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function overrideFor(
  prefs: RiskThresholdPrefs,
  id: CalculatorId,
): RiskThresholdOverride | undefined {
  const row = prefs[id];
  if (!row) return undefined;
  return { highRisk: row.highRisk, lowRisk: row.lowRisk };
}

export function isCustomThreshold(prefs: RiskThresholdPrefs, id: CalculatorId): boolean {
  return Boolean(prefs[id]);
}

/** Editable calculators (exclude forecast dynamic / N/A). */
export const CUSTOMIZABLE_RISK_IDS: CalculatorId[] = (
  Object.keys(RISK_THRESHOLDS) as CalculatorId[]
).filter((id) => id !== 'cash-flow-forecast');
