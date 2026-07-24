import { createContext, useContext, type ReactNode } from 'react';

import type { TaxAdvisor } from './data/advisors';

export type PartnersCallbacks = {
  onBookAdvisor?: (advisor: TaxAdvisor) => void;
};

const PartnersCallbacksContext = createContext<PartnersCallbacks>({});

export function PartnersCallbacksProvider({
  value,
  children,
}: {
  value: PartnersCallbacks;
  children: ReactNode;
}) {
  return (
    <PartnersCallbacksContext.Provider value={value}>{children}</PartnersCallbacksContext.Provider>
  );
}

export function usePartnersCallbacks(): PartnersCallbacks {
  return useContext(PartnersCallbacksContext);
}
