import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  evaluateRisk,
  RISK_THRESHOLDS,
  type CalculatorId,
  type RiskReading,
  type RiskThresholdOverride,
} from '@asktill/calculators';

import { useAuth } from './AuthContext';
import {
  clearRiskThresholdPrefs,
  loadRiskThresholdPrefs,
  overrideFor,
  saveRiskThresholdPrefs,
  type RiskThresholdPrefs,
} from '../lib/riskThresholdPrefs';

type Ctx = {
  prefs: RiskThresholdPrefs;
  evaluate: (
    id: CalculatorId,
    value: number,
    callOverrides?: RiskThresholdOverride,
  ) => RiskReading | null;
  setThreshold: (id: CalculatorId, highRisk: number, lowRisk: number) => void;
  resetThreshold: (id: CalculatorId) => void;
  resetAll: () => void;
  isCustom: (id: CalculatorId) => boolean;
  customCount: number;
};

const RiskThresholdContext = createContext<Ctx | null>(null);

export function RiskThresholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.userId?.trim() || 'anon';
  const [prefs, setPrefs] = useState<RiskThresholdPrefs>(() =>
    loadRiskThresholdPrefs(userId),
  );

  useEffect(() => {
    setPrefs(loadRiskThresholdPrefs(userId));
  }, [userId]);

  const evaluate = useCallback(
    (
      id: CalculatorId,
      value: number,
      callOverrides?: RiskThresholdOverride,
    ): RiskReading | null => {
      const userOv = overrideFor(prefs, id);
      return evaluateRisk(id, value, { ...userOv, ...callOverrides });
    },
    [prefs],
  );

  const setThreshold = useCallback(
    (id: CalculatorId, highRisk: number, lowRisk: number) => {
      if (!RISK_THRESHOLDS[id]) return;
      if (!Number.isFinite(highRisk) || !Number.isFinite(lowRisk)) return;
      setPrefs((prev) => {
        const next = { ...prev, [id]: { highRisk, lowRisk } };
        saveRiskThresholdPrefs(userId, next);
        return next;
      });
    },
    [userId],
  );

  const resetThreshold = useCallback(
    (id: CalculatorId) => {
      setPrefs((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        saveRiskThresholdPrefs(userId, next);
        return next;
      });
    },
    [userId],
  );

  const resetAll = useCallback(() => {
    clearRiskThresholdPrefs(userId);
    setPrefs({});
  }, [userId]);

  const isCustom = useCallback((id: CalculatorId) => Boolean(prefs[id]), [prefs]);

  const customCount = useMemo(() => Object.keys(prefs).length, [prefs]);

  const value = useMemo(
    () => ({
      prefs,
      evaluate,
      setThreshold,
      resetThreshold,
      resetAll,
      isCustom,
      customCount,
    }),
    [prefs, evaluate, setThreshold, resetThreshold, resetAll, isCustom, customCount],
  );

  return (
    <RiskThresholdContext.Provider value={value}>{children}</RiskThresholdContext.Provider>
  );
}

export function useRiskThresholds(): Ctx {
  const ctx = useContext(RiskThresholdContext);
  if (!ctx) throw new Error('useRiskThresholds must be used within RiskThresholdProvider');
  return ctx;
}
