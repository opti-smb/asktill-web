import React, { createContext, useContext, useState } from 'react';
import type { Period } from '../types';

interface PeriodContextValue {
  period: Period;
  setPeriod: (p: Period) => void;
}

const PeriodContext = createContext<PeriodContextValue>({
  period: 'Month',
  setPeriod: () => undefined,
});

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>('Month');
  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  return useContext(PeriodContext);
}
