import { getToken, stashAccessTokenForExternalRedirect } from './api';

export type StripeConnectionView = {
  connection_id?: string;
  merchant_id: string;
  stripe_account_id: string;
  environment: string;
  status: string;
  scope?: string;
  connected_at?: string;
};

export type ChargebacksConnectionResponse = {
  ok: boolean;
  status: string;
  connection: StripeConnectionView | null;
  detail?: string;
};

export type StripeDisputeRow = {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  reason?: string;
  created?: number;
  charge?: string;
  payment_intent?: string;
  has_evidence?: boolean;
  card_brand?: string;
  fought?: boolean;
};

export type DisputeCaseRow = {
  case_id: string;
  merchant_id?: string;
  stripe_account_id?: string;
  stripe_dispute_id: string;
  amount?: number | null;
  currency?: string | null;
  reason?: string | null;
  status?: string | null;
  response_deadline?: string | null;
  source_event_id?: string;
  created_at?: string | null;
  stripe_charge_id?: string | null;
  stripe_payment_intent_id?: string | null;
  shopify_shop_domain?: string | null;
  shopify_order_id?: string | null;
  shopify_order_name?: string | null;
  shopify_order_number?: string | null;
  shopify_fulfillment_status?: string | null;
  match_status?: string | null;
  match_method?: string | null;
  payment_status?: string | null;
  payment_intent_status?: string | null;
  amount_refunded?: number | null;
  refund_reconciliation?: string | null;
  fulfillment_claim?: string | null;
  fulfillment_count?: number | null;
  avs_line1_check?: string | null;
  avs_postal_check?: string | null;
  cvc_check?: string | null;
  three_d_secure_result?: string | null;
  tracking_numbers?: string | null;
  evidence_status?: string | null;
  evidence_outcome?: string | null;
  snapshot_refreshed_at?: string | null;
  environment?: string | null;
  challenge_eligible?: boolean | null;
  evidence_score?: number | null;
  win_likelihood?: string | null;
  decision_recommendation?: string | null;
  decision_reason?: string | null;
  decision_status?: string | null;
  decision_approved_at?: string | null;
  payload_ready?: boolean | null;
  decision_allowed?: boolean | null;
  fight_allowed?: boolean | null;
  accept_allowed?: boolean | null;
  decision_blockers?: string[] | null;
};

export type StripeChargeRow = {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  disputed?: boolean;
  paid?: boolean;
  description?: string;
  payment_intent?: string;
};

export type ShopifyOrderRow = {
  id?: string | null;
  name?: string | null;
  order_number?: string | null;
  total_price?: string | null;
  currency?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  created_at?: string | null;
  payment_ids?: string[];
  gateway_ids?: string[];
  card_last4?: string | null;
  card_brand?: string | null;
  matched_case_id?: string | null;
  stripe_dispute_id?: string | null;
  match_status?: string | null;
  line_items?: Array<{
    title?: string | null;
    quantity?: number | null;
    amount?: string | null;
    currency?: string | null;
  }>;
};

export type ShopifyConnectionView = {
  connection_id?: string;
  merchant_id: string;
  shop_domain: string;
  environment: string;
  status: string;
  scope?: string;
  connected_at?: string;
};

export type ShopifyConnectionResponse = {
  ok: boolean;
  status: string;
  connection: ShopifyConnectionView | null;
  cases?: DisputeCaseRow[];
  detail?: string;
};

const STRIPE_CONNECT_RETURN_KEY = 'asktill:stripe-connect-return';

export function peekStripeConnectReturn(): string | null {
  try {
    return sessionStorage.getItem(STRIPE_CONNECT_RETURN_KEY);
  } catch {
    return null;
  }
}

export function consumeStripeConnectReturn(): string | null {
  const next = peekStripeConnectReturn();
  try {
    sessionStorage.removeItem(STRIPE_CONNECT_RETURN_KEY);
  } catch {
    /* ignore */
  }
  return next;
}

async function chargebacksJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()?.trim();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as T & { detail?: string };
  if (!res.ok) {
    const err = new Error(body.detail || `Chargebacks request failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function getChargebacksHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/chargebacks-health');
    const data = (await res.json().catch(() => ({}))) as { status?: string; service?: string };
    return res.ok && (data.status === 'ok' || data.service === 'chargebacks');
  } catch {
    return false;
  }
}

export async function getStripeConnection(): Promise<ChargebacksConnectionResponse> {
  return chargebacksJson<ChargebacksConnectionResponse>('/integrations/stripe/connection');
}

export async function disconnectStripe(): Promise<ChargebacksConnectionResponse> {
  return chargebacksJson<ChargebacksConnectionResponse>('/integrations/stripe/disconnect', {
    method: 'POST',
  });
}

export async function listStripeDisputes(): Promise<StripeDisputeRow[]> {
  try {
    const body = await chargebacksJson<{ items?: StripeDisputeRow[] }>('/integrations/stripe/disputes?limit=100');
    return body.items || [];
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 409) return [];
    throw err;
  }
}

export async function listStripeCharges(): Promise<StripeChargeRow[]> {
  try {
    const body = await chargebacksJson<{ items?: StripeChargeRow[] }>('/integrations/stripe/charges?limit=100');
    return body.items || [];
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 409) return [];
    throw err;
  }
}

export async function listShopifyOrders(): Promise<ShopifyOrderRow[]> {
  const body = await chargebacksJson<{ items?: ShopifyOrderRow[] }>('/integrations/shopify/orders?limit=50');
  return body.items || [];
}

const CASES_CACHE_PREFIX = 'asktill.chargebacks.cases.v1:';

export function readCachedDisputeCases(userId?: string | null): DisputeCaseRow[] {
  const id = (userId || '').trim();
  if (!id) return [];
  try {
    const raw = sessionStorage.getItem(CASES_CACHE_PREFIX + id);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is DisputeCaseRow =>
        Boolean(row) && typeof row === 'object' && typeof (row as DisputeCaseRow).case_id === 'string',
    );
  } catch {
    return [];
  }
}

export function writeCachedDisputeCases(userId: string | null | undefined, rows: DisputeCaseRow[]): void {
  const id = (userId || '').trim();
  if (!id || rows.length === 0) return;
  try {
    sessionStorage.setItem(CASES_CACHE_PREFIX + id, JSON.stringify(rows));
  } catch {
    /* ignore quota */
  }
}

const STRIPE_CONN_CACHE = 'asktill.chargebacks.stripe.conn.v1';
const SHOPIFY_CONN_CACHE = 'asktill.chargebacks.shopify.conn.v1';

export function readCachedStripeConnection(): ChargebacksConnectionResponse | null {
  try {
    const raw = sessionStorage.getItem(STRIPE_CONN_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChargebacksConnectionResponse;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedStripeConnection(body: ChargebacksConnectionResponse | null): void {
  try {
    if (!body || body.status !== 'active' || !body.connection) {
      sessionStorage.removeItem(STRIPE_CONN_CACHE);
      return;
    }
    sessionStorage.setItem(STRIPE_CONN_CACHE, JSON.stringify({ ok: true, status: body.status, connection: body.connection }));
  } catch {
    /* ignore */
  }
}

export function readCachedShopifyConnection(): ShopifyConnectionResponse | null {
  try {
    const raw = sessionStorage.getItem(SHOPIFY_CONN_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShopifyConnectionResponse;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedShopifyConnection(body: ShopifyConnectionResponse | null): void {
  try {
    if (!body || body.status !== 'active' || !body.connection) {
      sessionStorage.removeItem(SHOPIFY_CONN_CACHE);
      return;
    }
    sessionStorage.setItem(
      SHOPIFY_CONN_CACHE,
      JSON.stringify({ ok: true, status: body.status, connection: body.connection }),
    );
  } catch {
    /* ignore */
  }
}

export async function listDisputeCases(): Promise<DisputeCaseRow[]> {
  const body = await chargebacksJson<{ cases?: DisputeCaseRow[] }>('/integrations/stripe/cases');
  return body.cases || [];
}

export async function startSandboxCheckout(amount: number): Promise<string> {
  const returnTo = `${window.location.origin}/dashboard/chargebacks`;
  const body = await chargebacksJson<{ url?: string }>('/integrations/stripe/sandbox-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ return_to: returnTo, amount }),
  });
  const url = body.url?.trim() || '';
  if (!url.startsWith('https://')) {
    throw new Error('Stripe did not return a payment page.');
  }
  return url;
}

export async function startStripeConnect(): Promise<'oauth' | 'sandbox'> {
  const token = getToken()?.trim();
  const returnTo = `${window.location.origin}/dashboard/chargebacks`;
  const url = `/integrations/stripe/connect?link_type=sandbox&return_to=${encodeURIComponent(returnTo)}&as_json=true`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401) {
    throw new Error('Sign in to connect Stripe.');
  }
  if (res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || 'Stripe App client id is not configured for local OAuth yet.');
  }
  const body = (await res.json().catch(() => ({}))) as {
    authorize_url?: string;
    status?: string;
    connection?: StripeConnectionView | null;
    linked?: string;
    detail?: string;
  };
  if (res.ok && body.linked === 'cli_sandbox' && body.connection) {
    return 'sandbox';
  }
  if (res.ok && body.authorize_url) {
    stashAccessTokenForExternalRedirect();
    try {
      sessionStorage.setItem(STRIPE_CONNECT_RETURN_KEY, '/dashboard/chargebacks');
    } catch {
      /* ignore */
    }
    window.location.assign(body.authorize_url);
    return 'oauth';
  }
  throw new Error(body.detail || 'Could not start Stripe connect.');
}

export async function getShopifyConnection(): Promise<ShopifyConnectionResponse> {
  return chargebacksJson<ShopifyConnectionResponse>('/integrations/shopify/connection');
}

export async function connectShopify(shop?: string): Promise<ShopifyConnectionResponse> {
  return chargebacksJson<ShopifyConnectionResponse>('/integrations/shopify/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shop ? { shop } : {}),
  });
}

export async function disconnectShopify(): Promise<ShopifyConnectionResponse> {
  return chargebacksJson<ShopifyConnectionResponse>('/integrations/shopify/disconnect', {
    method: 'POST',
  });
}

export async function rematchShopifyCases(caseId?: string): Promise<DisputeCaseRow[]> {
  const body = await chargebacksJson<{ cases?: DisputeCaseRow[] }>('/integrations/shopify/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(caseId ? { case_id: caseId } : {}),
  });
  return body.cases || [];
}

export async function refreshDisputeCase(caseId: string): Promise<DisputeCaseRow> {
  const body = await chargebacksJson<{ case?: DisputeCaseRow }>(
    `/integrations/stripe/cases/${encodeURIComponent(caseId)}/refresh`,
    { method: 'POST' },
  );
  if (!body.case) {
    throw new Error('Case refresh returned no case.');
  }
  return body.case;
}

export async function submitTestEvidence(caseId: string, outcome: 'win' | 'lose'): Promise<DisputeCaseRow> {
  const body = await chargebacksJson<{ case?: DisputeCaseRow }>(
    `/integrations/stripe/cases/${encodeURIComponent(caseId)}/test-evidence`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    },
  );
  if (!body.case) {
    throw new Error('Test evidence returned no case.');
  }
  return body.case;
}

export async function approveCaseDecision(
  caseId: string,
  action: 'accept' | 'fight',
): Promise<{ case: DisputeCaseRow; payload?: Record<string, unknown> }> {
  const body = await chargebacksJson<{ case?: DisputeCaseRow; payload?: Record<string, unknown> }>(
    `/integrations/stripe/cases/${encodeURIComponent(caseId)}/decision`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    },
  );
  if (!body.case) {
    throw new Error('Decision returned no case.');
  }
  return { case: body.case, payload: body.payload };
}

export type Cb4EvidenceStatus =
  | 'VERIFIED'
  | 'FOUND_NOT_VERIFIED'
  | 'MISSING'
  | 'CONFLICTING'
  | 'NOT_APPLICABLE';

export type Cb4Requirement = {
  evidence_code: string;
  display_name: string;
  mandatory: boolean;
  weight: number;
  preferred_source?: string | null;
  description?: string | null;
};

export type Cb4ReasonPolicy = {
  reason_policy_id: string;
  reason_code: string;
  display_name: string;
  policy_version: number;
  minimum_score_to_fight: number;
  missing_mandatory_action: string;
  active?: boolean;
  requirements: Cb4Requirement[];
};

export type Cb4EvidenceReference = {
  source?: string | null;
  source_reference?: string | null;
  notes?: string | null;
};

export type Cb4EvidenceItem = {
  evidence_code: string;
  display_name: string;
  mandatory: boolean;
  weight: number;
  status: Cb4EvidenceStatus;
  points_awarded: number;
  source?: string | null;
  source_reference?: string | null;
  notes?: string | null;
  system_derived?: boolean;
  references?: Cb4EvidenceReference[];
};

export type Cb4EvidenceReadiness = {
  evidence_readiness_id: string;
  dispute_id: string;
  reason_policy_id: string;
  reason_policy_version?: number | null;
  computed_at?: string | null;
  score: number;
  mandatory_missing_count: number;
  has_conflict: boolean;
  blockers: string[];
  items: Cb4EvidenceItem[];
};

export type Cb4Economics = {
  economics_id: string;
  dispute_id: string;
  dispute_amount: string;
  currency: string;
  estimated_dispute_fee: string;
  estimated_operations_cost: string;
  merchant_win_rate_cohort: string;
  win_rate_source: string;
  cogs?: string | null;
  fulfillment_status?: string | null;
  risk_value?: string | null;
  expected_recovery: string;
  expected_net_value: string;
};

export type Cb4Recommendation = {
  decision_id: string;
  dispute_id: string;
  merchant_id: string;
  recommendation: 'FIGHT' | 'ACCEPT' | 'MANUAL_REVIEW';
  recommendation_reason_codes: string[];
  ruleset_version: string;
  final_decision: string;
  evidence?: Cb4EvidenceReadiness | null;
  economics?: Cb4Economics | null;
};

export async function listCb4ReasonPolicies(): Promise<Cb4ReasonPolicy[]> {
  return chargebacksJson<Cb4ReasonPolicy[]>('/api/cb4/reason-policies');
}

export async function getCb4ReasonPolicy(reasonCode: string): Promise<Cb4ReasonPolicy> {
  return chargebacksJson<Cb4ReasonPolicy>(`/api/cb4/reason-policies/${encodeURIComponent(reasonCode)}`);
}

export type Cb4DerivedEvidence = {
  case_id: string;
  reason_code: string;
  items: Cb4EvidenceItem[];
  match_status?: string | null;
  match_method?: string | null;
  shopify_order_name?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
};

export async function getCb4DerivedEvidence(caseId: string): Promise<Cb4DerivedEvidence> {
  return chargebacksJson<Cb4DerivedEvidence>(`/api/cb4/cases/${encodeURIComponent(caseId)}/evidence`);
}

export async function runCb4Case(
  caseId: string,
  body: {
    evidence?: Array<{
      evidence_code: string;
      status: Cb4EvidenceStatus;
      source?: string;
      source_reference?: string;
      notes?: string;
      system_derived?: boolean;
      references?: Cb4EvidenceReference[];
    }>;
    estimated_dispute_fee?: string;
    estimated_operations_cost?: string;
    merchant_win_rate_cohort?: string;
    win_rate_source?: string;
    cogs?: string;
    risk_value?: string;
  },
): Promise<Cb4Recommendation> {
  return chargebacksJson<Cb4Recommendation>(`/api/cb4/cases/${encodeURIComponent(caseId)}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getCb4Recommendation(disputeId: string): Promise<Cb4Recommendation | null> {
  try {
    return await chargebacksJson<Cb4Recommendation>(
      `/api/cb4/recommendations/${encodeURIComponent(disputeId)}`,
    );
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) return null;
    throw err;
  }
}
