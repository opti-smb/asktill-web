import { useCallback, useEffect, useState } from 'react';
import type { TaxAdvisor } from '@asktill/channel-partners';
import { isAxiosError } from 'axios';

import {
  fetchRewardsBalance,
  fetchRewardsCatalog,
  redeemRewards,
  type RewardsBalance,
} from '../../lib/api';

import styles from './BookConsultationModal.module.css';

const DEFAULT_REDEEM_CODE = 'CFO_CONSULT';
const DEFAULT_REDEEM_POINTS = 3000;

function formatMoney(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

function formatPoints(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(n)));
}

type Props = {
  advisor: TaxAdvisor | null;
  open: boolean;
  onClose: () => void;
  onRedeemed?: (balance: RewardsBalance) => void;
};

/** Book CPA consultation — fee / rewards / final amount, then Pay now & book. */
export default function BookConsultationModal({ advisor, open, onClose, onRedeemed }: Props) {
  const [balance, setBalance] = useState<RewardsBalance | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [redeemPtsCost, setRedeemPtsCost] = useState(DEFAULT_REDEEM_POINTS);
  const [redeemCode, setRedeemCode] = useState(DEFAULT_REDEEM_CODE);
  const [useWallet, setUseWallet] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [paidBreakdown, setPaidBreakdown] = useState<{
    fee: number;
    rewardsUsd: number;
    rewardsPts: number;
    due: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoadingBal(true);
    setError(null);
    try {
      const [bal, catalog] = await Promise.all([fetchRewardsBalance(), fetchRewardsCatalog()]);
      setBalance(bal);
      let cost = DEFAULT_REDEEM_POINTS;
      const spend = catalog.spend_actions?.find((a) => a.code === DEFAULT_REDEEM_CODE);
      if (spend?.points_cost && spend.points_cost > 0) {
        cost = spend.points_cost;
        setRedeemPtsCost(spend.points_cost);
        setRedeemCode(spend.code);
      }
      // Only pre-check rewards if the wallet can cover the redeem cost.
      setUseWallet((bal.points ?? 0) >= cost);
    } catch {
      setBalance(null);
      setUseWallet(false);
      setError('Could not load your AT Rewards wallet.');
    } finally {
      setLoadingBal(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !advisor) return;
    setDone(false);
    setError(null);
    setPaidBreakdown(null);
    setUseWallet(false);
    void load();
  }, [open, advisor, load]);

  const rate = Math.max(1, balance?.conversion_rate ?? 100);
  const points = balance?.points ?? 0;
  const walletUsd = balance?.usd_value ?? points / rate;
  const fee = advisor?.consultationFeeUsd ?? 0;

  /** Credit from catalog redeem, capped at the consultation fee. */
  const catalogCreditUsd = Math.min(fee, redeemPtsCost / rate);
  const canAffordRedeem = points >= redeemPtsCost;
  const applyingRewards = useWallet && canAffordRedeem;
  const rewardsUsd = applyingRewards ? catalogCreditUsd : 0;
  const rewardsPts = applyingRewards ? redeemPtsCost : 0;
  const due = Math.max(0, fee - rewardsUsd);

  if (!open || !advisor) return null;

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (applyingRewards) {
        const result = await redeemRewards({
          redemption_code: redeemCode,
          source_ref: `advisor-consult:${advisor.id}:${Date.now()}`,
          notes: `CPA consultation with ${advisor.name} (${advisor.firm}) — fee ${formatMoney(fee)}, due ${formatMoney(due)}`,
        });
        setBalance(result.balance);
        onRedeemed?.(result.balance);
      }
      setPaidBreakdown({ fee, rewardsUsd, rewardsPts, due });
      setDone(true);
    } catch (err) {
      let msg = 'Could not complete booking.';
      if (isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') msg = detail;
        else if (detail && typeof detail === 'object' && 'message' in detail) {
          msg = String((detail as { message: string }).message);
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const receipt = paidBreakdown ?? { fee, rewardsUsd, rewardsPts, due };

  return (
    <div className={styles.backdrop} onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-consult-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="book-consult-title" className={styles.title}>
          {done ? 'Booked' : 'Book consultation'}
        </h2>

        <p className={styles.advisorLine}>
          {advisor.name}, {advisor.credential} · {advisor.firm}
        </p>
        <p className={styles.meta}>{advisor.availability}</p>

        {done ? (
          <>
            <div className={styles.breakdown} aria-label="Payment summary">
              <div className={styles.row}>
                <span>Consultation fee</span>
                <span>{formatMoney(receipt.fee)}</span>
              </div>
              <div className={`${styles.row} ${styles.rowDiscount}`}>
                <span>
                  AT Rewards
                  {receipt.rewardsPts > 0 ? ` (−${formatPoints(receipt.rewardsPts)} pts)` : ''}
                </span>
                <span>
                  {receipt.rewardsUsd > 0 ? `−${formatMoney(receipt.rewardsUsd)}` : formatMoney(0)}
                </span>
              </div>
              <div className={`${styles.row} ${styles.rowTotal}`}>
                <span>Final amount paid</span>
                <span>{formatMoney(receipt.due)}</span>
              </div>
            </div>
            <p className={styles.success}>
              You’re booked with {advisor.name}. We’ll confirm the session shortly.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.confirmBtn} onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.walletCard}>
              <span className={styles.walletEyebrow}>Your AT Rewards wallet</span>
              {loadingBal && !balance ? (
                <p className={styles.hint}>Loading balance…</p>
              ) : (
                <div className={styles.walletStats}>
                  <div>
                    <span className={styles.lbl}>Points</span>
                    <span className={styles.val}>{formatPoints(points)}</span>
                  </div>
                  <div>
                    <span className={styles.lbl}>Wallet value</span>
                    <span className={styles.val}>{formatMoney(walletUsd)}</span>
                  </div>
                </div>
              )}
              <p className={styles.hint}>{rate} pts = $1</p>
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={applyingRewards}
                onChange={(e) => {
                  if (e.target.checked && !canAffordRedeem) {
                    setError(
                      `Not enough rewards. Need ${formatPoints(redeemPtsCost)} pts (you have ${formatPoints(points)}). You can still pay the full fee.`,
                    );
                    setUseWallet(false);
                    return;
                  }
                  setError(null);
                  setUseWallet(e.target.checked);
                }}
                disabled={submitting || loadingBal || !balance}
              />
              <span>
                Apply AT Rewards
                {loadingBal && !balance
                  ? ' (loading wallet…)'
                  : canAffordRedeem
                    ? ` (−${formatMoney(catalogCreditUsd)} / ${formatPoints(redeemPtsCost)} pts)`
                    : ` (need ${formatPoints(redeemPtsCost)} pts; you have ${formatPoints(points)})`}
              </span>
            </label>

            <div className={styles.breakdown} aria-label="Amount due">
              <div className={styles.row}>
                <span>Consultation fee</span>
                <span>{formatMoney(fee)}</span>
              </div>
              <div className={`${styles.row} ${styles.rowDiscount}`}>
                <span>
                  AT Rewards deducted
                  {applyingRewards ? ` (−${formatPoints(rewardsPts)} pts)` : ''}
                </span>
                <span>
                  {rewardsUsd > 0 ? `−${formatMoney(rewardsUsd)}` : formatMoney(0)}
                </span>
              </div>
              <div className={`${styles.row} ${styles.rowTotal}`}>
                <span>Final amount to pay</span>
                <span>{formatMoney(due)}</span>
              </div>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => void confirm()}
                disabled={submitting || fee <= 0}
                title={fee <= 0 ? 'Consultation fee unavailable' : undefined}
              >
                {submitting
                  ? 'Processing…'
                  : due > 0
                    ? `Pay ${formatMoney(due)} & book`
                    : 'Pay now & book'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
