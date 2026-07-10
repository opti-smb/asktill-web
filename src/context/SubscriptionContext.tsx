import {

  createContext,

  useCallback,

  useContext,

  useMemo,

  useState,

  type ReactNode,

} from 'react';



import SubscriptionPaywallModal from '../components/subscription/SubscriptionPaywallModal';

import { useAuth } from './AuthContext';

import {

  isPaidOnlyPath,

  isPaidTier,

  normalizeTier,

  tierDisplayLabel,

  type SubscriptionTier,

} from '../lib/subscription';



interface SubscriptionContextValue {

  tier: SubscriptionTier;

  tierLabel: string;

  isPaid: boolean;

  isFree: boolean;

  requestPaidAccess: (featureLabel?: string) => boolean;

  openPaywall: (featureLabel?: string) => void;

  closePaywall: () => void;

}



const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);



export function SubscriptionProvider({ children }: { children: ReactNode }) {

  const { user } = useAuth();

  const [paywallOpen, setPaywallOpen] = useState(false);

  const [paywallFeature, setPaywallFeature] = useState<string | undefined>();



  const tier = useMemo(() => normalizeTier(user?.tier), [user?.tier]);

  const isPaid = isPaidTier(tier);

  const isFree = !isPaid;



  const openPaywall = useCallback((featureLabel?: string) => {

    setPaywallFeature(featureLabel);

    setPaywallOpen(true);

  }, []);



  const closePaywall = useCallback(() => {

    setPaywallOpen(false);

    setPaywallFeature(undefined);

  }, []);



  const requestPaidAccess = useCallback(

    (featureLabel?: string) => {

      if (isPaid) return true;

      openPaywall(featureLabel);

      return false;

    },

    [isPaid, openPaywall],

  );



  const value = useMemo<SubscriptionContextValue>(

    () => ({

      tier,

      tierLabel: tierDisplayLabel(tier),

      isPaid,

      isFree,

      requestPaidAccess,

      openPaywall,

      closePaywall,

    }),

    [tier, isPaid, isFree, requestPaidAccess, openPaywall, closePaywall],

  );



  return (

    <SubscriptionContext.Provider value={value}>

      {children}

      <SubscriptionPaywallModal

        open={paywallOpen}

        onClose={closePaywall}

        featureLabel={paywallFeature}

      />

    </SubscriptionContext.Provider>

  );

}



export function useSubscription(): SubscriptionContextValue {

  const ctx = useContext(SubscriptionContext);

  if (!ctx) {

    throw new Error('useSubscription must be used within SubscriptionProvider');

  }

  return ctx;

}



/** Gate a dashboard path — returns false and opens paywall when the route is paid-only. */

export function usePaidPathAccess(path: string): boolean {

  const { requestPaidAccess } = useSubscription();

  if (!isPaidOnlyPath(path)) return true;

  return requestPaidAccess('This section');

}

