import type { CaseEvidenceRead } from './chargebackEvidenceCollect';
import { getToken, stashAccessTokenForExternalRedirect } from './api';
import { stashCheckoutAccessBridge } from './checkoutSessionBridge';

export type StripeConnectionView = {
  connection_id?: string;
  merchant_id: string;
  stripe_account_id: string;
  environment: string;
  status: string;
  scope?: string;
  connected_at?: string | null;
  last_pay_at?: string | null;
  last_dispute_at?: string | null;
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
  provider?: string | null;
  response_deadline?: string | null;
  internal_due_by?: string | null;
  source_event_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
  stripe_charge_id?: string | null;
  stripe_payment_intent_id?: string | null;
  shopify_shop_domain?: string | null;
  shopify_order_id?: string | null;
  shopify_order_name?: string | null;
  shopify_order_number?: string | null;
  shopify_customer_email?: string | null;
  shopify_fulfillment_status?: string | null;
  shopify_financial_status?: string | null;
  match_status?: string | null;
  match_method?: string | null;
  matched_at?: string | null;
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
  payment_created_at?: string | null;
  stripe_refund_id?: string | null;
  refund_created_at?: string | null;
  tracking_carrier?: string | null;
  fulfilled_at?: string | null;
  shopify_order_amount?: number | null;
  shopify_order_created_at?: string | null;
  shopify_order_products?: string | null;
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
  messages?: Array<{ at?: string | null; type?: string; actor?: string; text?: string }> | null;
  timeline?: Array<{ at?: string | null; type?: string; actor?: string; text?: string }> | null;
};

export type PayPalCaseWorkspace = {
  case_id: string;
  overall_status?: string;
  amount?: number | null;
  currency?: string | null;
  reason?: string | null;
  status?: string | null;
  payment_created_at?: string | null;
  order_number?: string | null;
  capture_id?: string | null;
  dispute_id?: string | null;
  timeline?: Array<{ at?: string | null; type?: string; actor?: string; text?: string }>;
  messages?: Array<{ at?: string | null; type?: string; actor?: string; text?: string }>;
  next_action?: { type?: string; message?: string } | null;
  provider?: {
    name?: string;
    native_status?: string | null;
    native_stage?: string | null;
    last_sync_at?: string | null;
    freshness?: string | null;
  };
};

export type StripeChargeRow = {
  id: string;
  amount?: number;
  amount_refunded?: number;
  currency?: string;
  status?: string;
  disputed?: boolean;
  paid?: boolean;
  refunded?: boolean;
  description?: string;
  payment_intent?: string;
  created?: number;
  provider?: string;
};

/** Live Stripe refund. `amount` is Stripe minor units (cents). */
export type StripeRefundRow = {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  created?: number;
  charge?: string;
  payment_intent?: string;
  reason?: string;
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
  connected_at?: string | null;
  last_order_at?: string | null;
};

export type ShopifyConnectionResponse = {
  ok: boolean;
  status: string;
  connection: ShopifyConnectionView | null;
  cases?: DisputeCaseRow[];
  detail?: string;
};

export type PayPalConnectionView = {
  connection_id?: string;
  merchant_id: string;
  account_id: string;
  environment: string;
  status: string;
  connected_at?: string | null;
  last_pay_at?: string | null;
  payer_id?: string | null;
  capabilities?: string[];
  account_kind?: string;
  health?: string;
  sandbox_personal_buyer_configured?: boolean;
};

export type PayPalConnectionResponse = {
  ok: boolean;
  status: string;
  connection: PayPalConnectionView | null;
  detail?: string;
};

const STRIPE_CONNECT_RETURN_KEY = 'asktill:stripe-connect-return';
const STRIPE_PAY_RETURN_KEY = 'asktill:stripe-pay-return';

export function peekStripeConnectReturn(): string | null {
  try {
    return sessionStorage.getItem(STRIPE_CONNECT_RETURN_KEY);
  } catch {
    return null;
  }
}

/** True when returning from Stripe Checkout (sandbox pay). */
export function peekChargebacksPayReturn(): boolean {
  try {
    const pay = new URLSearchParams(window.location.search).get('pay');
    if (pay === 'success' || pay === 'cancel') return true;
  } catch {
    /* ignore */
  }
  try {
    return sessionStorage.getItem(STRIPE_PAY_RETURN_KEY) === '1';
  } catch {
    return false;
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

export type AgentCaseView = {
  case_id: string;
  merchant_id?: string;
  agent_state?: string | null;
  requires_human?: boolean;
  current_task?: string | null;
  workflow_execution_id?: string | null;
  orchestration_enabled?: boolean;
};

export async function getAgentCase(caseId: string): Promise<AgentCaseView | null> {
  const token = getToken()?.trim();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`/api/agent/cases/${encodeURIComponent(caseId)}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { case?: AgentCaseView };
  return body.case || null;
}

export type CustomerIdentityView = {
  status?: string | null;
  confidence?: number | null;
  customer_key?: string | null;
  identity_source?: string | null;
};

export type CustomerHistoryView = {
  snapshot_version?: string | null;
  lookback_start?: string | null;
  lookback_end?: string | null;
  lookback_months?: number | null;
  insufficient_history?: boolean;
  first_time_customer?: boolean;
  facts?: {
    successful_orders?: number;
    previous_disputes?: number;
    previous_refunds?: number;
    successful_payments?: number;
    total_payments?: number;
  };
  recent_orders?: Array<{
    name?: string | null;
    created_at?: string | null;
    amount?: string | null;
    currency?: string | null;
    status?: string | null;
    products?: string | null;
    current?: boolean;
  }>;
  customer_since?: string | null;
};

export type CustomerScoreView = {
  score?: number | null;
  band?: string | null;
  score_version?: string | null;
  status?: string | null;
  insufficient_history?: boolean;
  created_at?: string | null;
  snapshot_version?: string | null;
  component_scores?: {
    relationship_history?: number | null;
    payment_history?: number | null;
    order_or_usage_consistency?: number | null;
    identity_consistency?: number | null;
    refund_dispute_behavior?: number | null;
  };
};

async function getAgentJson<T>(path: string): Promise<T | null> {
  const token = getToken()?.trim();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(path, { headers });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json().catch(() => ({}))) as T;
}

export async function getCustomerContext(caseId: string): Promise<{
  identity: CustomerIdentityView | null;
  history: CustomerHistoryView | null;
  score: CustomerScoreView | null;
}> {
  try {
    const body = await chargebacksJson<{
      ok?: boolean;
      identity?: CustomerIdentityView | null;
      snapshot?: CustomerHistoryView | null;
      history?: CustomerHistoryView | null;
      score?: CustomerScoreView | null;
    }>(`/integrations/stripe/cases/${encodeURIComponent(caseId)}/customer-context`);
    const snapshot = body?.snapshot || body?.history || null;
    if (body?.ok || body?.identity || snapshot || body?.score) {
      return {
        identity: body.identity || null,
        history: snapshot,
        score: body.score || null,
      };
    }
  } catch {
    /* Backend AgentCase may still have it. */
  }
  const [identity, history, score] = await Promise.all([
    getAgentJson<{ identity?: CustomerIdentityView | null }>(
      `/api/agent/cases/${encodeURIComponent(caseId)}/customer-identity`,
    ),
    getAgentJson<{ snapshot?: CustomerHistoryView | null }>(
      `/api/agent/cases/${encodeURIComponent(caseId)}/customer-history`,
    ),
    getAgentJson<{ score?: CustomerScoreView | null }>(
      `/api/agent/cases/${encodeURIComponent(caseId)}/customer-score`,
    ),
  ]);
  return {
    identity: identity?.identity || null,
    history: history?.snapshot || null,
    score: score?.score || null,
  };
}

export async function getCustomerIdentity(caseId: string): Promise<CustomerIdentityView | null> {
  const body = await getCustomerContext(caseId);
  return body.identity;
}

export async function getCustomerHistory(caseId: string): Promise<CustomerHistoryView | null> {
  const body = await getCustomerContext(caseId);
  return body.history;
}

export async function getCustomerScore(caseId: string): Promise<CustomerScoreView | null> {
  const body = await getCustomerContext(caseId);
  return body.score;
}

export type HumanQuestionView = {
  id: string;
  case_id?: string;
  dispute_case_id?: string;
  question_type?: string;
  title?: string;
  question_text?: string;
  allowed_options?: string[];
  allowed_options_json?: string[];
  source_refs?: Array<string | { label?: string; source_object_id?: string; source_system?: string }>;
  source_refs_json?: Array<string | { label?: string; source_object_id?: string; source_system?: string }>;
  status?: string;
  answer_json?: { answer?: string; user_role?: string } | null;
  created_at?: string | null;
};

export async function getOpenHumanQuestions(): Promise<HumanQuestionView[]> {
  const body = await getAgentJson<{ questions?: HumanQuestionView[] }>('/api/agent/human-questions/open');
  return body?.questions || [];
}

export async function getCaseHumanQuestion(caseId: string): Promise<HumanQuestionView | null> {
  const body = await getAgentJson<{ question?: HumanQuestionView | null }>(
    `/api/agent/cases/${encodeURIComponent(caseId)}/human-question`,
  );
  return body?.question || null;
}

export async function answerHumanQuestion(questionId: string, answer: string): Promise<HumanQuestionView> {
  const token = getToken()?.trim();
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`/api/agent/human-questions/${encodeURIComponent(questionId)}/answer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answer, user_role: 'merchant' }),
  });
  const body = (await res.json().catch(() => ({}))) as { question?: HumanQuestionView; detail?: string };
  if (!res.ok) {
    const err = new Error(body.detail || `Could not save answer (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body.question as HumanQuestionView;
}

export type DevOrderMatchQuestion = {
  question_id: string;
  case_id: string;
  question_type: string;
  status: string;
  reused: boolean;
  agent_state: string;
  requires_human: boolean;
};

export function isAgentDevHelperEnabled(): boolean {
  const flag = String(import.meta.env.VITE_AGENT_DEV_HELPERS || '').trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off' || flag === 'no') return false;
  if (flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on') return true;
  return Boolean(import.meta.env.DEV);
}

export async function createDevOrderMatchQuestion(caseId: string): Promise<DevOrderMatchQuestion> {
  const token = getToken()?.trim();
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(
    `/api/agent/cases/${encodeURIComponent(caseId)}/human-questions/dev-create-order-match`,
    { method: 'POST', headers },
  );
  const body = (await res.json().catch(() => ({}))) as DevOrderMatchQuestion & { detail?: string };
  if (!res.ok) {
    const err = new Error(body.detail || `Could not create test question (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function collectCaseEvidence(caseId: string): Promise<{ ok?: boolean; status?: string; message?: string }> {
  return chargebacksJson(`/api/chargebacks/cases/${encodeURIComponent(caseId)}/evidence/collect`, {
    method: 'POST',
  });
}

export async function getCaseEvidence(caseId: string): Promise<CaseEvidenceRead> {
  return chargebacksJson<CaseEvidenceRead>(`/api/chargebacks/cases/${encodeURIComponent(caseId)}/evidence`);
}

export async function fetchCaseEvidenceFile(caseId: string, evidenceId: string): Promise<Response> {
  const token = getToken()?.trim();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(
    `/api/chargebacks/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/file`,
    { headers },
  );
}

export type EvidenceRecipeRequirement = {
  code?: string;
  priority?: string;
  display_name?: string;
  provider_lock?: boolean;
  rule_id?: string;
  mandatory?: boolean;
  expected_strength?: string;
};

export type EvidenceRecipe = {
  recipe_id: string;
  recipe_version?: string;
  provider?: string;
  dispute_reason?: string;
  merchant_category?: string;
  requirements?: EvidenceRecipeRequirement[];
  status?: string;
  created_at?: string | null;
  activated_at?: string | null;
  change_reason?: string;
};

export type EvidencePriorityRule = {
  rule_id: string;
  applies_to?: string;
  evidence_type?: string;
  priority?: string;
  mandatory?: boolean;
  expected_strength?: string;
  provider_lock?: boolean;
  status?: string;
  dynamic_watch?: string | string[];
  agent_mode?: string;
};

export type EvidenceChange = {
  event: string;
  subject: string;
  details?: Record<string, unknown>;
  at?: string;
};

export async function getEvidenceRulebookCatalog(): Promise<{
  recipes: EvidenceRecipe[];
  rules: EvidencePriorityRule[];
  changes: EvidenceChange[];
}> {
  const [recipes, rules, history] = await Promise.all([
    chargebacksJson<{ recipes?: EvidenceRecipe[] }>('/api/chargebacks/admin/evidence/recipes'),
    chargebacksJson<{ rules?: EvidencePriorityRule[] }>('/api/chargebacks/admin/evidence/priority-rules'),
    chargebacksJson<{ changes?: EvidenceChange[] }>('/api/chargebacks/admin/evidence/change-history'),
  ]);
  return {
    recipes: recipes.recipes || [],
    rules: rules.rules || [],
    changes: history.changes || [],
  };
}

export async function postEvidenceRuleAdmin(
  action: 'draft' | 'test' | 'approve' | 'activate' | 'rollback' | 'impact',
  input: { draftId?: string; ruleId?: string; priority?: string },
): Promise<{ ok?: boolean; draft?: { draft_id?: string }; detail?: string; submits?: boolean }> {
  const draftId = encodeURIComponent(input.draftId || '');
  const ruleId = encodeURIComponent(input.ruleId || '');
  const path =
    action === 'draft'
      ? '/api/chargebacks/admin/evidence/rules/drafts'
      : action === 'rollback'
        ? `/api/chargebacks/admin/evidence/rules/${ruleId}/rollback`
        : `/api/chargebacks/admin/evidence/rules/${draftId}/${action}`;
  return chargebacksJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      action === 'draft' ? { rule_id: input.ruleId, priority: input.priority || 'P2' } : {},
    ),
  });
}

export async function submitEvidenceHumanReview(
  caseId: string,
  evidenceId: string,
  decision: string,
  reason: string,
): Promise<{ ok?: boolean; human_review_status?: string; human_decision?: string }> {
  return chargebacksJson(
    `/api/chargebacks/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/human-review`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    },
  );
}

export async function uploadCaseEvidenceFile(
  caseId: string,
  file: File,
  evidenceType: string,
  requirementId?: string,
  evidenceSubtype?: string,
  details?: { sourceCategory?: string; sourceProvider?: string; proves?: string; eventAt?: string; notes?: string },
): Promise<{ ok?: boolean; status?: string; message?: string; artifact?: Record<string, unknown> | null }> {
  const body = new FormData();
  body.set('file', file);
  body.set('evidence_type', evidenceType);
  body.set('mime_type', file.type || 'application/octet-stream');
  if (requirementId) body.set('requirement_id', requirementId);
  if (evidenceSubtype) body.set('evidence_subtype', evidenceSubtype);
  if (details?.sourceCategory) body.set('source_category', details.sourceCategory);
  if (details?.sourceProvider) body.set('source_provider', details.sourceProvider);
  if (details?.proves) body.set('proves', details.proves);
  if (details?.eventAt) body.set('event_at', details.eventAt);
  if (details?.notes) body.set('notes', details.notes);
  return chargebacksJson(`/api/chargebacks/cases/${encodeURIComponent(caseId)}/evidence/upload-file`, {
    method: 'POST',
    body,
  });
}

export async function enterCaseEvidence(
  caseId: string,
  body: Record<string, unknown>,
): Promise<{ ok?: boolean; evidence?: Record<string, unknown> }> {
  return chargebacksJson(`/api/chargebacks/cases/${encodeURIComponent(caseId)}/evidence/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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

export async function listStripeRefunds(): Promise<StripeRefundRow[]> {
  try {
    const body = await chargebacksJson<{ items?: StripeRefundRow[] }>('/integrations/stripe/refunds?limit=100');
    return body.items || [];
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 409) return [];
    throw err;
  }
}

export async function listPayPalCharges(): Promise<StripeChargeRow[]> {
  try {
    const body = await chargebacksJson<{ items?: StripeChargeRow[] }>('/integrations/paypal/charges?limit=100');
    return body.items || [];
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404 || status === 409) return [];
    throw err;
  }
}

export async function listPayPalRefunds(): Promise<StripeRefundRow[]> {
  try {
    const body = await chargebacksJson<{ items?: StripeRefundRow[] }>('/integrations/paypal/refunds?limit=100');
    return body.items || [];
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404 || status === 409) return [];
    throw err;
  }
}

export async function createPayPalRefund(input: {
  charge_id: string;
  amount?: number;
}): Promise<StripeRefundRow> {
  const body = await chargebacksJson<{ refund?: StripeRefundRow }>('/integrations/paypal/refunds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!body.refund?.id) {
    throw new Error('PayPal did not return a refund.');
  }
  return body.refund;
}

export async function createStripeRefund(input: {
  payment_intent_id?: string;
  charge_id?: string;
  amount?: number;
}): Promise<StripeRefundRow> {
  const body = await chargebacksJson<{ refund?: StripeRefundRow }>('/integrations/stripe/refunds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!body.refund?.id) {
    throw new Error('Stripe did not return a refund.');
  }
  return body.refund;
}

export async function listShopifyOrders(): Promise<ShopifyOrderRow[]> {
  const body = await chargebacksJson<{ items?: ShopifyOrderRow[] }>('/integrations/shopify/orders?limit=50');
  return body.items || [];
}

const CASES_CACHE_PREFIX = 'asktill.chargebacks.cases.v2:';

export function readCachedDisputeCases(userId?: string | null): DisputeCaseRow[] {
  const id = (userId || '').trim();
  if (!id) return [];
  try {
    const raw = localStorage.getItem(CASES_CACHE_PREFIX + id) || sessionStorage.getItem(CASES_CACHE_PREFIX + id);
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
  if (!id) return;
  try {
    if (rows.length === 0) {
      localStorage.removeItem(CASES_CACHE_PREFIX + id);
      sessionStorage.removeItem(CASES_CACHE_PREFIX + id);
      return;
    }
    const payload = JSON.stringify(rows);
    localStorage.setItem(CASES_CACHE_PREFIX + id, payload);
    sessionStorage.setItem(CASES_CACHE_PREFIX + id, payload);
  } catch {
    /* ignore quota */
  }
}

export function patchCachedDisputeCase(userId: string | null | undefined, row: DisputeCaseRow): void {
  const rows = readCachedDisputeCases(userId);
  const next = rows.some((item) => item.case_id === row.case_id)
    ? rows.map((item) => (item.case_id === row.case_id ? row : item))
    : [row, ...rows];
  writeCachedDisputeCases(userId, next);
}

const STRIPE_CONN_CACHE = 'asktill.chargebacks.stripe.conn.v1';
const SHOPIFY_CONN_CACHE = 'asktill.chargebacks.shopify.conn.v1';
const PAYPAL_CONN_CACHE = 'asktill.chargebacks.paypal.conn.v1';
const STRIPE_STATUS_CACHE = 'asktill.chargebacks.stripe.status.v1';
const SHOPIFY_STATUS_CACHE = 'asktill.chargebacks.shopify.status.v1';
const PAYPAL_STATUS_CACHE = 'asktill.chargebacks.paypal.status.v1';

export type KnownStripeStatus = {
  status: string;
  connection: StripeConnectionView | null;
};

export type KnownShopifyStatus = {
  status: string;
  connection: ShopifyConnectionView | null;
};

export type KnownPayPalStatus = {
  status: string;
  connection: PayPalConnectionView | null;
};

function readStatus<T extends { status: string }>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    if (!parsed || typeof parsed.status !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStatus(key: string, value: unknown): void {
  const payload = JSON.stringify(value);
  try {
    sessionStorage.setItem(key, payload);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(key, payload);
  } catch {
    /* ignore */
  }
}

/** Last Stripe answer, including "disconnected". Active-only cache cannot paint a return visit. */
export function readKnownStripeStatus(): KnownStripeStatus | null {
  const active = readCachedStripeConnection();
  if (active?.status) {
    return { status: active.status, connection: active.connection };
  }
  return readStatus<KnownStripeStatus>(STRIPE_STATUS_CACHE);
}

export function readKnownShopifyStatus(): KnownShopifyStatus | null {
  const active = readCachedShopifyConnection();
  if (active?.status) {
    return { status: active.status, connection: active.connection };
  }
  return readStatus<KnownShopifyStatus>(SHOPIFY_STATUS_CACHE);
}

export function readKnownPayPalStatus(): KnownPayPalStatus | null {
  const active = readCachedPayPalConnection();
  if (active?.status) {
    return { status: active.status, connection: active.connection };
  }
  return readStatus<KnownPayPalStatus>(PAYPAL_STATUS_CACHE);
}

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
    const status = body?.status || 'disconnected';
    const connection = status === 'active' ? body?.connection ?? null : null;
    writeStatus(STRIPE_STATUS_CACHE, { status, connection });
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
    const status = body?.status || 'disconnected';
    const connection = status === 'active' ? body?.connection ?? null : null;
    writeStatus(SHOPIFY_STATUS_CACHE, { status, connection });
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

export function readCachedPayPalConnection(): PayPalConnectionResponse | null {
  try {
    const raw = sessionStorage.getItem(PAYPAL_CONN_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PayPalConnectionResponse;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedPayPalConnection(body: PayPalConnectionResponse | null): void {
  try {
    const status = body?.status || 'disconnected';
    const connection = status === 'active' ? body?.connection ?? null : null;
    writeStatus(PAYPAL_STATUS_CACHE, { status, connection });
    if (!body || body.status !== 'active' || !body.connection) {
      sessionStorage.removeItem(PAYPAL_CONN_CACHE);
      return;
    }
    sessionStorage.setItem(
      PAYPAL_CONN_CACHE,
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

export async function listPayPalDisputeCases(): Promise<DisputeCaseRow[]> {
  const body = await chargebacksJson<{ cases?: DisputeCaseRow[] }>('/integrations/paypal/disputes');
  return (body.cases || []).map((row) => ({ ...row, provider: row.provider || 'paypal' }));
}

export async function getPayPalCaseWorkspace(caseId: string): Promise<PayPalCaseWorkspace> {
  const body = await chargebacksJson<{ workspace?: PayPalCaseWorkspace }>(
    `/integrations/paypal/cases/${encodeURIComponent(caseId)}/workspace`,
  );
  if (!body.workspace) {
    throw new Error('PayPal case workspace not found.');
  }
  return body.workspace;
}

export async function rematchPayPalCases(): Promise<DisputeCaseRow[]> {
  const body = await chargebacksJson<{ cases?: DisputeCaseRow[] }>('/integrations/paypal/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return (body.cases || []).map((row) => ({ ...row, provider: row.provider || 'paypal' }));
}

export async function createPayPalSandboxDispute(chargeId?: string): Promise<{
  dispute_id?: string;
  case?: DisputeCaseRow | null;
  cases?: DisputeCaseRow[];
}> {
  const body = await chargebacksJson<{
    dispute_id?: string;
    case?: DisputeCaseRow | null;
    cases?: DisputeCaseRow[];
  }>('/integrations/paypal/sandbox/disputes/from-charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chargeId ? { charge_id: chargeId } : {}),
  });
  return body;
}

export async function submitPayPalTestOutcome(caseId: string, outcome: 'win' | 'lose'): Promise<DisputeCaseRow> {
  const body = await chargebacksJson<{ case?: DisputeCaseRow }>(
    `/integrations/paypal/cases/${encodeURIComponent(caseId)}/test-outcome`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    },
  );
  if (!body.case) {
    throw new Error('PayPal test outcome returned no case.');
  }
  return { ...body.case, provider: body.case.provider || 'paypal' };
}

export async function submitPayPalManualEvidence(
  caseId: string,
  notes?: string,
): Promise<{ evidence_id: string }> {
  return chargebacksJson<{ evidence_id: string }>(
    `/integrations/paypal/cases/${encodeURIComponent(caseId)}/manual-evidence`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence_type: 'other', notes: notes || 'Sandbox manual evidence' }),
    },
  );
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
  // Memory JWT dies on the Stripe full-page leave; restore it on /dashboard/chargebacks.
  stashAccessTokenForExternalRedirect();
  stashCheckoutAccessBridge();
  try {
    sessionStorage.setItem(STRIPE_PAY_RETURN_KEY, '1');
  } catch {
    /* ignore */
  }
  return url;
}

export async function startPayPalSandboxCheckout(
  amount: number,
  checkout: 'redirect' | 'card' = 'redirect',
): Promise<{ url: string; order_id: string }> {
  const returnTo = `${window.location.origin}/chargebacks/paid`;
  const body = await chargebacksJson<{ url?: string; order_id?: string }>('/integrations/paypal/sandbox-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ return_to: returnTo, amount, checkout }),
  });
  const orderId = body.order_id?.trim() || '';
  const url = body.url?.trim() || '';
  if (checkout === 'card') {
    if (!orderId) throw new Error('PayPal did not return an order.');
  } else if (!url.startsWith('https://')) {
    throw new Error('PayPal did not return a payment page.');
  }
  stashAccessTokenForExternalRedirect();
  stashCheckoutAccessBridge();
  try {
    sessionStorage.setItem(STRIPE_PAY_RETURN_KEY, '1');
  } catch {
    /* ignore */
  }
  return { url, order_id: orderId };
}

export async function capturePayPalSandboxOrder(orderId: string): Promise<{ url: string }> {
  const returnTo = `${window.location.origin}/chargebacks/paid`;
  const body = await chargebacksJson<{ url?: string }>('/integrations/paypal/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, return_to: returnTo }),
  });
  const url = body.url?.trim() || '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('PayPal did not finish the payment.');
  }
  return { url };
}

export async function getPayPalCheckoutConfig(): Promise<{ client_id: string; sandbox: boolean }> {
  const body = await chargebacksJson<{ client_id?: string; sandbox?: boolean }>('/integrations/paypal/checkout-config');
  const clientId = body.client_id?.trim() || '';
  if (!clientId) throw new Error('PayPal checkout is not configured.');
  return { client_id: clientId, sandbox: body.sandbox !== false };
}

export async function getPayPalConnection(): Promise<PayPalConnectionResponse> {
  return chargebacksJson<PayPalConnectionResponse>('/integrations/paypal/connection');
}

export async function connectPayPal(): Promise<PayPalConnectionResponse> {
  return chargebacksJson<PayPalConnectionResponse>('/integrations/paypal/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function disconnectPayPal(): Promise<PayPalConnectionResponse> {
  return chargebacksJson<PayPalConnectionResponse>('/integrations/paypal/disconnect', {
    method: 'POST',
  });
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
  input_snapshot?: {
    customer_history_score?: number | null;
    customer_history_band?: string | null;
    customer_history_score_version?: string | null;
    customer_history_component_scores?: Record<string, unknown> | null;
    customer_history_insufficient?: boolean;
    customer_history_relevance?: string | null;
    customer_history_status?: string | null;
  } | null;
  evidence?: Cb4EvidenceReadiness | null;
  economics?: Cb4Economics | null;
};

export function customerHistoryRelevance(reasonCode?: string | null): 'HIGH' | 'MEDIUM' | 'LOW' {
  const reason = (reasonCode || '').trim().toLowerCase();
  if (['fraud', 'fraudulent', 'unrecognized', 'card_not_present', 'cnp'].includes(reason)) return 'HIGH';
  if (['duplicate', 'subscription', 'subscription_canceled', 'credit_not_processed'].includes(reason)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export async function listCb4ReasonPolicies(): Promise<Cb4ReasonPolicy[]> {
  return chargebacksJson<Cb4ReasonPolicy[]>('/api/cb4/reason-policies');
}

export async function getCb4ReasonPolicy(reasonCode: string): Promise<Cb4ReasonPolicy> {
  return chargebacksJson<Cb4ReasonPolicy>(`/api/cb4/reason-policies/${encodeURIComponent(reasonCode)}`);
}

export type Cb4DerivedEvidence = {
  case_id: string;
  reason_code: string;
  items: Array<{
    evidence_code: string;
    status: Cb4EvidenceStatus;
    source?: string | null;
    source_reference?: string | null;
    notes?: string | null;
    system_derived?: boolean;
    display_name?: string | null;
  }>;
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

export type Cb4DecisionValue = 'FIGHT' | 'ACCEPT' | 'MANUAL_REVIEW';

export type Cb4EnhancedEligibility = {
  enhanced_eligibility_id: string;
  dispute_id: string;
  eligibility_type: string;
  eligible: boolean;
  source: string;
  supporting_transactions: Array<Record<string, unknown>>;
  details: Record<string, unknown>;
  observed_at?: string | null;
};

export type Cb4MerchantDecisionPolicy = {
  merchant_policy_id: string;
  merchant_id: string;
  version: number;
  min_evidence_score_to_fight: number;
  auto_accept_ceiling: string;
  mandatory_review_amount: string;
  maker_checker_amount: string;
  minimum_expected_net_value: string;
  operational_buffer_hours: number;
  timezone: string;
  active: boolean;
  inherited_from_global: boolean;
};

export type Cb4DecisionWorkflow = {
  decision_id: string;
  dispute_id: string;
  merchant_id: string;
  recommendation: string;
  proposed_final_decision: string | null;
  final_decision: string;
  approval_status: string;
  proposer_user_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  override_flag: boolean;
  re_review_required: boolean;
  decision_version: number;
  handoff_status: string;
  maker_checker_required?: boolean;
  amount?: string | null;
};

export type Cb4QueueItem = {
  decision_id: string;
  dispute_id: string;
  reason_code: string;
  amount: string;
  currency: string;
  internal_due_by: string;
  hours_remaining: number;
  evidence_score: number;
  recommendation: string;
  final_decision: string;
  approval_status: string;
  readiness_status: string;
  priority: 'CRITICAL' | 'URGENT' | 'HIGH' | 'NORMAL';
  re_review_required: boolean;
};

export type Cb4ReReviewPayload = {
  workflow: Cb4DecisionWorkflow;
  rereview: {
    rereview_id: string;
    previous_final_decision: string;
    previous_recommendation: string;
    new_recommendation: string;
    changed_fields: string[];
    created_at?: string | null;
  } | null;
};

export async function getCb4EnhancedEligibility(disputeId: string): Promise<Cb4EnhancedEligibility[]> {
  return chargebacksJson<Cb4EnhancedEligibility[]>(
    `/api/cb4/disputes/${encodeURIComponent(disputeId)}/enhanced-eligibility`,
  );
}

export async function getCb4MerchantPolicy(): Promise<Cb4MerchantDecisionPolicy> {
  return chargebacksJson<Cb4MerchantDecisionPolicy>('/api/cb4/merchant/decision-policy');
}

export async function saveCb4MerchantPolicy(
  payload: Omit<
    Cb4MerchantDecisionPolicy,
    'merchant_policy_id' | 'merchant_id' | 'version' | 'active' | 'inherited_from_global'
  >,
): Promise<Cb4MerchantDecisionPolicy> {
  return chargebacksJson<Cb4MerchantDecisionPolicy>('/api/cb4/merchant/decision-policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getCb4Decision(decisionId: string): Promise<Cb4DecisionWorkflow> {
  return chargebacksJson<Cb4DecisionWorkflow>(`/api/cb4/decisions/${encodeURIComponent(decisionId)}`);
}

export async function proposeCb4Decision(
  decisionId: string,
  proposedDecision: string,
  notes?: string,
): Promise<Cb4DecisionWorkflow> {
  return chargebacksJson<Cb4DecisionWorkflow>(`/api/cb4/decisions/${encodeURIComponent(decisionId)}/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposed_decision: proposedDecision, notes }),
  });
}

export async function approveCb4Decision(decisionId: string, notes?: string): Promise<Cb4DecisionWorkflow> {
  return chargebacksJson<Cb4DecisionWorkflow>(`/api/cb4/decisions/${encodeURIComponent(decisionId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

export async function overrideCb4Decision(
  decisionId: string,
  newDecision: string,
  reasonCode: string,
  notes?: string,
): Promise<Cb4DecisionWorkflow> {
  return chargebacksJson<Cb4DecisionWorkflow>(`/api/cb4/decisions/${encodeURIComponent(decisionId)}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_decision: newDecision, reason_code: reasonCode, notes }),
  });
}

export async function getCb4DecisionQueue(priority?: string): Promise<Cb4QueueItem[]> {
  const query = priority ? `?priority=${encodeURIComponent(priority)}` : '';
  return chargebacksJson<Cb4QueueItem[]>(`/api/cb4/decision-queue${query}`);
}

export async function getCb4ReReview(decisionId: string): Promise<Cb4ReReviewPayload> {
  return chargebacksJson<Cb4ReReviewPayload>(`/api/cb4/decisions/${encodeURIComponent(decisionId)}/rereview`);
}
