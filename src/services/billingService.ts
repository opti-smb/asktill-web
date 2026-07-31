/** Billing / Stripe checkout — re-exported from lib/api until httpClients split lands. */
export {
  createCheckoutSession,
  confirmCheckoutSession,
  fetchBillingInvoices,
  createBillingPortalSession,
  setAutoRenewalEnabled,
  type CheckoutSessionResponse,
  type ConfirmCheckoutResponse,
  type AutoRenewalResponse,
  type BillingInvoice,
  type BillingInvoicesResponse,
} from '../lib/api';
