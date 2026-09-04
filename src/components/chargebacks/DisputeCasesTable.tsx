import { useState } from 'react';
import { Link } from 'react-router-dom';
import { approveCaseDecision, type DisputeCaseRow } from '../../lib/chargebacksClient';
import { reasonLabel } from '@asktill/chargebacks';
import styles from './DisputeCasesTable.module.css';

function money(amount?: number | null, currency?: string | null): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  const code = (currency || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

function shortId(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw) return '—';
  return raw.length > 18 ? `${raw.slice(0, 16)}…` : raw;
}

function pretty(value?: string | null, fallback = '—'): string {
  const raw = (value || '').trim();
  if (!raw) return fallback;
  return raw.replace(/_/g, ' ');
}

function isLocked(row: DisputeCaseRow): boolean {
  const status = (row.decision_status || '').toLowerCase();
  return status === 'accepted' || status === 'fight_approved';
}

function canFight(row: DisputeCaseRow): boolean {
  if (isLocked(row)) return false;
  return row.fight_allowed !== false;
}

function canAccept(row: DisputeCaseRow): boolean {
  if (isLocked(row)) return false;
  return row.accept_allowed !== false;
}

function gateNote(row: DisputeCaseRow): string | null {
  if (isLocked(row)) return null;
  const blockers = Array.isArray(row.decision_blockers) ? row.decision_blockers : [];
  if (!canFight(row) && !canAccept(row)) return blockers[0] || 'This case is closed.';
  if (!canFight(row) && blockers[0]) return blockers[0];
  return null;
}

function isManualReview(row: DisputeCaseRow): boolean {
  return (row.decision_recommendation || '').trim().toLowerCase().replace(/\s+/g, '_') === 'manual_review';
}

export default function DisputeCasesTable({
  cases,
  loading = false,
  onChanged,
}: {
  cases: DisputeCaseRow[];
  loading?: boolean;
  onChanged?: (next: DisputeCaseRow) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(row: DisputeCaseRow, action: 'accept' | 'fight') {
    if (busyId || isLocked(row)) return;
    if (action === 'fight' && !canFight(row)) return;
    if (action === 'accept' && !canAccept(row)) return;
    setBusyId(row.case_id);
    setError(null);
    try {
      const body = await approveCaseDecision(row.case_id, action);
      onChanged?.(body.case);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that choice.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Disputes</div>
          <div className={styles.sub}>
            Stripe chargeback plus matched Shopify order. Accept or Fight once — then it stays.
          </div>
        </div>
        <div className={styles.sub} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/dashboard/chargebacks/queue">Decision queue</Link>
          <Link to="/dashboard/chargebacks/settings">Decision settings</Link>
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Reason</th>
              <th>Stripe</th>
              <th>Shopify</th>
              <th>Match</th>
              <th>Suggested</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  {loading
                    ? 'Loading disputes…'
                    : 'No disputes yet. After a payment is disputed, it shows here with Stripe and Shopify data.'}
                </td>
              </tr>
            ) : (
              cases.map((row) => {
                const locked = isLocked(row);
                const busy = busyId === row.case_id;
                const shopify =
                  row.shopify_order_name ||
                  (row.shopify_order_number ? `#${row.shopify_order_number}` : null);
                return (
                  <tr key={row.case_id}>
                    <td className={styles.amount}>{money(row.amount, row.currency)}</td>
                    <td>{reasonLabel(row.reason || undefined)}</td>
                    <td>
                      <div className={styles.primary}>{shortId(row.stripe_dispute_id)}</div>
                      <div className={styles.meta}>{pretty(row.status)}</div>
                    </td>
                    <td>
                      <div className={styles.primary}>{shopify || '—'}</div>
                      <div className={styles.meta}>
                        {pretty(row.shopify_fulfillment_status || row.fulfillment_claim, 'no order')}
                      </div>
                    </td>
                    <td>
                      <div
                        className={
                          (row.match_status || '').toLowerCase() === 'matched' ? styles.matchOk : styles.primary
                        }
                      >
                        {pretty(row.match_status)}
                      </div>
                      <div className={styles.meta}>{pretty(row.match_method, '')}</div>
                    </td>
                    <td>
                      {isManualReview(row) ? (
                        <Link
                          to={`/dashboard/chargebacks/decision/${encodeURIComponent(row.case_id)}`}
                          className={styles.reviewLink}
                          title="Open CB4 recommendation form"
                        >
                          {pretty(row.decision_recommendation)}
                        </Link>
                      ) : (
                        <div className={styles.primary}>{pretty(row.decision_recommendation, '—')}</div>
                      )}
                    </td>
                    <td>
                      {locked ? (
                        <span
                          className={
                            row.decision_status === 'fight_approved' ? styles.badgeFight : styles.badgeAccept
                          }
                        >
                          {row.decision_status === 'fight_approved' ? 'Fight' : 'Accept'}
                        </span>
                      ) : (
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.fight}
                            disabled={busy || !canFight(row)}
                            title={!canFight(row) ? gateNote(row) || 'Fight is not available' : undefined}
                            onClick={() => void decide(row, 'fight')}
                          >
                            {busy ? 'Saving…' : 'Fight'}
                          </button>
                          <button
                            type="button"
                            className={styles.accept}
                            disabled={busy || !canAccept(row)}
                            title={!canAccept(row) ? gateNote(row) || 'Accept is not available' : undefined}
                            onClick={() => void decide(row, 'accept')}
                          >
                            Accept
                          </button>
                          {gateNote(row) ? <div className={styles.blocker}>{gateNote(row)}</div> : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
