import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getCb4DerivedEvidence,
  getCb4ReasonPolicy,
  getCb4Recommendation,
  getCb4Decision,
  listCb4ReasonPolicies,
  listDisputeCases,
  runCb4Case,
  type Cb4DecisionWorkflow,
  type Cb4EvidenceItem,
  type Cb4EvidenceReference,
  type Cb4EvidenceStatus,
  type Cb4ReasonPolicy,
  type Cb4Recommendation,
  type DisputeCaseRow,
} from '../lib/chargebacksClient';
import EnhancedEvidenceView from '../components/cb4/EnhancedEvidenceView';
import OverrideDecision from '../components/cb4/OverrideDecision';
import ReReviewRequired from '../components/cb4/ReReviewRequired';
import ReviewDecision from '../components/cb4/ReviewDecision';
import styles from './AtChargebacksPage.module.css';
import cb4 from './Cb4Pages.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

const SERVER_OWNED = new Set([
  'payment_authentication',
  'three_d_secure',
  'avs_cvc',
  'order_details',
  'order_matched',
  'order_or_service_record',
  'fulfillment',
  'delivery_or_usage',
  'tracking_number',
  'transaction_record',
  'payment_records',
  'refund_state',
  'refund_transaction',
]);

const STATUSES: Cb4EvidenceStatus[] = [
  'VERIFIED',
  'FOUND_NOT_VERIFIED',
  'MISSING',
  'CONFLICTING',
  'NOT_APPLICABLE',
];

type EvidenceRefDraft = {
  source: string;
  source_reference: string;
  notes: string;
};

type EvidenceRowDraft = {
  status: Cb4EvidenceStatus;
  refs: EvidenceRefDraft[];
  systemDerived: boolean;
  open: boolean;
};

function emptyRef(): EvidenceRefDraft {
  return { source: '', source_reference: '', notes: '' };
}

function refsFromItem(item: {
  source?: string | null;
  source_reference?: string | null;
  notes?: string | null;
  references?: Cb4EvidenceReference[];
}): EvidenceRefDraft[] {
  const listed = Array.isArray(item.references) ? item.references : [];
  if (listed.length) {
    return listed.map((ref: Cb4EvidenceReference) => ({
      source: ref.source || '',
      source_reference: ref.source_reference || '',
      notes: ref.notes || '',
    }));
  }
  if (item.source || item.source_reference || item.notes) {
    return [
      {
        source: item.source || '',
        source_reference: item.source_reference || '',
        notes: item.notes || '',
      },
    ];
  }
  return [emptyRef()];
}

function hasReferenceable(row: EvidenceRowDraft): boolean {
  if (row.systemDerived) return true;
  return row.refs.some((ref) => ref.source.trim() && ref.source_reference.trim());
}

function draftsFromPolicy(policy: Cb4ReasonPolicy): Record<string, EvidenceRowDraft> {
  const next: Record<string, EvidenceRowDraft> = {};
  for (const req of policy.requirements || []) {
    next[req.evidence_code] = {
      status: 'MISSING',
      refs: [emptyRef()],
      systemDerived: false,
      open: false,
    };
  }
  return next;
}

function applyEvidenceItems(
  next: Record<string, EvidenceRowDraft>,
  items: Array<Pick<Cb4EvidenceItem, 'evidence_code' | 'status' | 'source' | 'source_reference' | 'notes' | 'system_derived' | 'references'>>,
  codes?: Set<string>,
): void {
  for (const item of items) {
    if (codes && !codes.has(item.evidence_code)) continue;
    next[item.evidence_code] = {
      status: item.status,
      refs: refsFromItem(item as Cb4EvidenceItem),
      systemDerived: Boolean(item.system_derived) || SERVER_OWNED.has(item.evidence_code),
      open: false,
    };
  }
}

function money(amount?: number | null, currency?: string | null): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  const code = (currency || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

export default function Cb4DecisionPage() {
  const { caseId = '' } = useParams();
  const caseKey = caseId.trim();
  const [row, setRow] = useState<DisputeCaseRow | null>(
    caseKey ? { case_id: caseKey, stripe_dispute_id: caseKey } : null,
  );
  const [policy, setPolicy] = useState<Cb4ReasonPolicy | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EvidenceRowDraft>>({});
  const [fee, setFee] = useState('15.00');
  const [ops, setOps] = useState('8.00');
  const [winRate, setWinRate] = useState('0.64');
  const [source, setSource] = useState('pilot_default');
  const [cogs, setCogs] = useState('');
  const [riskValue, setRiskValue] = useState('MEDIUM');
  const [result, setResult] = useState<Cb4Recommendation | null>(null);
  const [workflow, setWorkflow] = useState<Cb4DecisionWorkflow | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingChecklist(true);
      setError(null);
      try {
        const policies = await listCb4ReasonPolicies();
        if (cancelled) return;
        const fallback = policies.find((item) => item.reason_code === 'general') || policies[0] || null;
        if (fallback) {
          setPolicy(fallback);
          setDrafts(draftsFromPolicy(fallback));
        }
        if (!caseKey) {
          setError('Case not found. The checklist below is the general reason policy.');
          return;
        }

        const nextByPolicy: Record<string, Cb4ReasonPolicy> = Object.fromEntries(
          (policies || []).map((item) => [item.reason_code, item]),
        );
        let next = fallback ? draftsFromPolicy(fallback) : {};

        try {
          const derived = await getCb4DerivedEvidence(caseKey);
          if (cancelled) return;
          const reason = derived.reason_code || 'general';
          const loaded = nextByPolicy[reason] || (await getCb4ReasonPolicy(reason));
          if (cancelled) return;
          setPolicy(loaded);
          next = draftsFromPolicy(loaded);
          applyEvidenceItems(next, derived.items || [], SERVER_OWNED);
          setRow((prev) => ({
            case_id: derived.case_id || caseKey,
            stripe_dispute_id: prev?.stripe_dispute_id || caseKey,
            reason: derived.reason_code || prev?.reason,
            match_status: derived.match_status ?? prev?.match_status,
            match_method: derived.match_method ?? prev?.match_method,
            shopify_order_name: derived.shopify_order_name ?? prev?.shopify_order_name,
            amount: derived.amount ?? prev?.amount,
            currency: derived.currency ?? prev?.currency,
            status: derived.status ?? prev?.status,
          }));
        } catch {
          /* Derived snapshot is optional until Generate recommendation. */
        }
        try {
          const existing = await getCb4Recommendation(caseKey);
          if (!cancelled && existing) {
            if (existing.evidence?.items) {
              applyEvidenceItems(
                next,
                existing.evidence.items,
                new Set(
                  existing.evidence.items
                    .map((item) => item.evidence_code)
                    .filter((code) => !SERVER_OWNED.has(code)),
                ),
              );
            }
            setResult(existing);
            if (existing.decision_id) {
              void getCb4Decision(existing.decision_id)
                .then(setWorkflow)
                .catch(() => undefined);
            }
          }
        } catch {
          /* No prior CB4 recommendation is fine. */
        }
        if (!cancelled) setDrafts(next);

        void listDisputeCases()
          .then((cases) => {
            if (cancelled) return;
            const found = cases.find((item) => item.case_id === caseKey) || null;
            if (found) setRow(found);
          })
          .catch(() => undefined);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load CB4 decision.');
      } finally {
        if (!cancelled) setLoadingChecklist(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseKey]);

  const evidencePayload = useMemo(
    () =>
      Object.entries(drafts).map(([evidence_code, draft]) => {
        const filled = draft.refs.filter((ref) => ref.source.trim() || ref.source_reference.trim() || ref.notes.trim());
        const primary = filled[0] || emptyRef();
        return {
          evidence_code,
          status: draft.status,
          source: primary.source.trim() || undefined,
          source_reference: primary.source_reference.trim() || undefined,
          notes: primary.notes.trim() || undefined,
          system_derived: draft.systemDerived,
          references: filled.map((ref) => ({
            source: ref.source.trim() || undefined,
            source_reference: ref.source_reference.trim() || undefined,
            notes: ref.notes.trim() || undefined,
          })),
        };
      }),
    [drafts],
  );

  function patchDraft(code: string, update: Partial<EvidenceRowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [code]: { ...(prev[code] || { status: 'MISSING', refs: [emptyRef()], systemDerived: false, open: false }), ...update },
    }));
  }

  function patchRef(code: string, index: number, update: Partial<EvidenceRefDraft>) {
    setDrafts((prev) => {
      const current = prev[code] || { status: 'MISSING' as Cb4EvidenceStatus, refs: [emptyRef()], systemDerived: false, open: false };
      const refs = current.refs.length ? [...current.refs] : [emptyRef()];
      refs[index] = { ...refs[index], ...update };
      return { ...prev, [code]: { ...current, refs } };
    });
  }

  async function run() {
    if (!caseKey || busy) return;
    const missing = (policy?.requirements || []).filter((req) => {
      if (SERVER_OWNED.has(req.evidence_code)) return false;
      const draft = drafts[req.evidence_code];
      return req.mandatory && (draft?.status || 'MISSING') === 'VERIFIED' && !hasReferenceable(draft);
    });
    if (missing.length) {
      setError(
        `Mark ${missing.map((item) => item.display_name).join(', ')} VERIFIED only after adding a source and source reference.`,
      );
      patchDraft(missing[0].evidence_code, { open: true });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const rec = await runCb4Case(caseKey, {
        evidence: evidencePayload,
        estimated_dispute_fee: fee,
        estimated_operations_cost: ops,
        merchant_win_rate_cohort: winRate,
        win_rate_source: source || 'pilot_default',
        cogs: cogs.trim() || undefined,
        risk_value: riskValue || 'MEDIUM',
      });
      setResult(rec);
      if (rec.decision_id) {
        void getCb4Decision(rec.decision_id).then(setWorkflow).catch(() => undefined);
      }
      if (rec.evidence?.items) {
        setDrafts((prev) => {
          const next = { ...prev };
          applyEvidenceItems(next, rec.evidence!.items);
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate recommendation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cb4.page}>
      <div className={cb4.main}>
        <Link to="/dashboard/chargebacks" className={cb4.back}>
          ← Money Reclaimed
        </Link>
        <div className={styles.titleChrome}>
          <h1 className={headerStyles.h1}>CB4 recommendation</h1>
        </div>
        <p className={cb4.lead}>
          AskTill recommends FIGHT, ACCEPT, or MANUAL_REVIEW. Stripe 3DS/AVS/CVC and Shopify match
          or tracking are filled from the case and cannot be marked VERIFIED by typing a source.
          Customer communication stays reviewer-entered. This does not submit a Stripe dispute.
          AskTill recommendation stays separate from human approval and from any later Stripe action.
        </p>
        <p className={cb4.meta} style={{ marginBottom: 14 }}>
          <Link to="/dashboard/chargebacks/queue" className={cb4.policiesLink}>
            Decision queue
          </Link>
          {' · '}
          <Link to="/dashboard/chargebacks/settings" className={cb4.policiesLink}>
            Decision settings
          </Link>
        </p>
        {row ? (
          <div className={cb4.meta} style={{ marginBottom: 14 }}>
            {money(row.amount, row.currency)} · {(row.reason || 'general').replace(/_/g, ' ')} · match{' '}
            {(row.match_status || 'pending').replace(/_/g, ' ')}
            {row.match_method ? ` (${row.match_method.replace(/_/g, ' ')})` : ''}
            {row.shopify_order_name ? ` · Shopify ${row.shopify_order_name}` : ''}
            {' · Stripe '}
            {row.status || '—'}
            {policy ? ` · ${policy.reason_code} threshold ${policy.minimum_score_to_fight}` : ''}
          </div>
        ) : null}
        {error ? <p className={cb4.error}>{error}</p> : null}
        <div className={cb4.grid}>
          <section className={cb4.card}>
            <div className={cb4.cardTitle}>Evidence readiness</div>
            <div className={cb4.meta}>
              Evidence readiness score is completeness 0–100, not win probability. Stripe and Shopify
              items are system-derived. Reviewer VERIFIED still needs a source and source reference.
              Missing mandatory or CONFLICTING evidence blocks an automatic FIGHT recommendation.
            </div>
            {loadingChecklist && !(policy?.requirements || []).length ? (
              <p className={cb4.meta}>Loading evidence checklist…</p>
            ) : null}
            {!(policy?.requirements || []).length && !loadingChecklist ? (
              <p className={cb4.error}>Could not load the evidence checklist for this reason.</p>
            ) : null}
            {policy?.requirements.map((req) => {
              const draft = drafts[req.evidence_code] || {
                status: 'MISSING' as Cb4EvidenceStatus,
                refs: [emptyRef()],
                systemDerived: false,
                open: false,
              };
              const locked = SERVER_OWNED.has(req.evidence_code);
              const captured = draft.refs.filter(
                (ref) => ref.source.trim() || ref.source_reference.trim() || ref.notes.trim(),
              );
              return (
                <div key={req.evidence_code} className={cb4.item}>
                  <div className={cb4.row}>
                    <div>
                      {req.display_name}
                      {req.mandatory ? ' *' : ''}
                      <div className={cb4.meta}>
                        {req.weight} pts · {req.preferred_source || '—'}
                        {locked ? ' · Stripe/Shopify' : ''}
                        {draft.systemDerived ? ' · system-derived' : ''}
                      </div>
                    </div>
                    <select
                      className={cb4.select}
                      value={draft.status}
                      disabled={locked}
                      onChange={(event) => {
                        if (locked) return;
                        const status = event.target.value as Cb4EvidenceStatus;
                        patchDraft(req.evidence_code, {
                          status,
                          open: status === 'VERIFIED' || status === 'CONFLICTING' || draft.open,
                        });
                      }}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={cb4.evidenceBtn}
                      onClick={() => patchDraft(req.evidence_code, { open: !draft.open })}
                    >
                      {captured.length || draft.systemDerived || locked ? 'View evidence' : 'Add evidence'}
                    </button>
                    <div className={cb4.meta}>{req.mandatory ? 'Required' : 'Optional'}</div>
                  </div>
                  {captured.map((ref, index) => (
                    <div key={`${req.evidence_code}-shown-${index}`} className={cb4.refLine}>
                      {ref.source || 'Source'} · {ref.source_reference || 'no reference'}
                      {ref.notes ? ` — ${ref.notes}` : ''}
                    </div>
                  ))}
                  {draft.open ? (
                    <div className={cb4.panel}>
                      {(draft.status === 'CONFLICTING' ? draft.refs : draft.refs.slice(0, 1)).map((ref, index) => (
                        <div key={`${req.evidence_code}-edit-${index}`} className={cb4.refBlock}>
                          <label className={cb4.label} htmlFor={`${req.evidence_code}-source-${index}`}>
                            Evidence source
                          </label>
                          <input
                            id={`${req.evidence_code}-source-${index}`}
                            className={cb4.input}
                            value={ref.source}
                            readOnly={locked}
                            placeholder={req.preferred_source || 'Commerce, Carrier, Stripe'}
                            onChange={(event) => {
                              if (locked) return;
                              patchRef(req.evidence_code, index, { source: event.target.value });
                            }}
                          />
                          <label className={cb4.label} htmlFor={`${req.evidence_code}-ref-${index}`}>
                            Source reference / URL / record id
                          </label>
                          <input
                            id={`${req.evidence_code}-ref-${index}`}
                            className={cb4.input}
                            value={ref.source_reference}
                            readOnly={locked}
                            placeholder="#1004, tracking number, or URL"
                            onChange={(event) => {
                              if (locked) return;
                              patchRef(req.evidence_code, index, { source_reference: event.target.value });
                            }}
                          />
                          <label className={cb4.label} htmlFor={`${req.evidence_code}-notes-${index}`}>
                            Reviewer notes
                          </label>
                          <input
                            id={`${req.evidence_code}-notes-${index}`}
                            className={cb4.input}
                            value={ref.notes}
                            readOnly={locked}
                            onChange={(event) => {
                              if (locked) return;
                              patchRef(req.evidence_code, index, { notes: event.target.value });
                            }}
                          />
                        </div>
                      ))}
                      {draft.status === 'CONFLICTING' && !locked ? (
                        <button
                          type="button"
                          className={cb4.evidenceBtn}
                          onClick={() => patchDraft(req.evidence_code, { refs: [...draft.refs, emptyRef()] })}
                        >
                          Add another reference
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className={cb4.cardTitle} style={{ marginTop: 18 }}>
              Economic inputs
            </div>
            <label className={cb4.label} htmlFor="cb4-fee">
              Estimated dispute fee
            </label>
            <input id="cb4-fee" className={cb4.input} value={fee} onChange={(e) => setFee(e.target.value)} />
            <label className={cb4.label} htmlFor="cb4-ops">
              Estimated operations cost
            </label>
            <input id="cb4-ops" className={cb4.input} value={ops} onChange={(e) => setOps(e.target.value)} />
            <label className={cb4.label} htmlFor="cb4-win-rate">
              Historical win-rate input (0–1)
            </label>
            <input
              id="cb4-win-rate"
              className={cb4.input}
              value={winRate}
              onChange={(e) => setWinRate(e.target.value)}
            />
            <label className={cb4.label} htmlFor="cb4-win-source">
              Win-rate source
            </label>
            <input
              id="cb4-win-source"
              className={cb4.input}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <label className={cb4.label} htmlFor="cb4-cogs">
              COGS (context only)
            </label>
            <input id="cb4-cogs" className={cb4.input} value={cogs} onChange={(e) => setCogs(e.target.value)} />
            <div className={cb4.meta}>
              COGS is stored for context. v1 expected net value does not subtract COGS.
            </div>
            <label className={cb4.label} htmlFor="cb4-fulfillment">
              Fulfillment status
            </label>
            <input
              id="cb4-fulfillment"
              className={cb4.input}
              value={row?.fulfillment_claim || row?.shopify_fulfillment_status || 'UNKNOWN'}
              readOnly
            />
            <label className={cb4.label} htmlFor="cb4-risk">
              Risk value
            </label>
            <input
              id="cb4-risk"
              className={cb4.input}
              value={riskValue}
              onChange={(e) => setRiskValue(e.target.value)}
            />
            <button type="button" className={cb4.run} disabled={busy || !caseKey} onClick={() => void run()}>
              {busy ? 'Running…' : 'Generate recommendation'}
            </button>
          </section>
          <aside className={cb4.card}>
            <div className={cb4.cardTitle}>Recommendation</div>
            {result ? (
              <>
                <div className={cb4.label}>Recommendation result</div>
                <div className={cb4.result}>{result.recommendation.replace(/_/g, ' ')}</div>
                <div className={cb4.label}>Recommendation reason codes</div>
                <div className={cb4.codes}>{result.recommendation_reason_codes.join(', ') || '—'}</div>
                <div className={cb4.label}>Final decision</div>
                <div className={cb4.pending}>
                  {(result.final_decision || 'PENDING_APPROVAL').replace(/_/g, ' ')}
                </div>
                <div className={cb4.label}>Evidence readiness score</div>
                <div className={cb4.meta}>
                  {result.evidence ? `${result.evidence.score}/100 completeness` : '—'}
                </div>
                <div className={cb4.label}>Blockers</div>
                {result.evidence?.blockers?.length ? (
                  <ul className={cb4.blockers}>
                    {result.evidence.blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className={cb4.meta}>None</div>
                )}
                <div className={cb4.label}>Expected recovery</div>
                <div className={cb4.money}>
                  {result.economics ? `$${result.economics.expected_recovery}` : '—'}
                </div>
                <div className={cb4.label}>Expected net value</div>
                <div className={cb4.money}>
                  {result.economics ? `$${result.economics.expected_net_value}` : '—'}
                </div>
                <div className={cb4.label}>COGS (not subtracted in v1)</div>
                <div className={cb4.meta}>
                  {result.economics?.cogs ? `$${result.economics.cogs}` : '—'}
                </div>
                <div className={cb4.label}>Fulfillment status</div>
                <div className={cb4.meta}>
                  {(result.economics?.fulfillment_status || row?.fulfillment_claim || 'UNKNOWN').replace(/_/g, ' ')}
                </div>
                <div className={cb4.label}>Risk value</div>
                <div className={cb4.meta}>{result.economics?.risk_value || riskValue}</div>
              </>
            ) : (
              <div className={cb4.meta}>
                Generate a recommendation to see FIGHT / ACCEPT / MANUAL_REVIEW. Human approval is a
                separate internal CB4 step and does not call Stripe.
              </div>
            )}
            <p className={cb4.note}>
              Merchant Fight/Accept on the disputes table is still the Stripe action. CB4 approval
              only writes an internal command for a later module.
            </p>
          </aside>
        </div>
        {caseKey ? <EnhancedEvidenceView disputeId={caseKey} /> : null}
        {workflow?.re_review_required ? (
          <ReReviewRequired decisionId={workflow.decision_id} onChanged={setWorkflow} />
        ) : null}
        {result && workflow && !showOverride && !workflow.re_review_required ? (
          <ReviewDecision
            decisionId={workflow.decision_id}
            onOverride={() => setShowOverride(true)}
            onChanged={setWorkflow}
          />
        ) : null}
        {result && workflow && showOverride ? (
          <OverrideDecision
            decision={workflow}
            onDone={(next) => {
              setWorkflow(next);
              setShowOverride(false);
            }}
            onCancel={() => setShowOverride(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
