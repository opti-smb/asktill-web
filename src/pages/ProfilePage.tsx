import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SectionHeader from '../components/layout/SectionHeader';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  changePassword,
  createBillingPortalSession,
  fetchBillingInvoices,
  getApiError,
  setAutoRenewalEnabled,
  type BillingInvoice,
} from '../lib/api';
import { PASSWORD_HINT, validatePassword } from '../lib/passwordPolicy';
import { isPaidTier, tierDisplayLabel } from '../lib/subscription';
import styles from './ProfilePage.module.css';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function formatMemberSince(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatPlanName(planId: string | null | undefined, tier: string | null | undefined): string {
  const plan = (planId || '').trim().toLowerCase();
  if (plan === 'starter') return 'Starter';
  if (plan === 'growth') return 'Growth';
  if (plan === 'pro') return 'Pro';
  return tierDisplayLabel(tier);
}

function formatCardLabel(
  brand: string | null | undefined,
  last4: string | null | undefined,
): string | null {
  const digits = (last4 || '').trim();
  if (!digits) return null;
  const brandLabel = (brand || 'Card').trim();
  const nice = brandLabel ? brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1).toLowerCase() : 'Card';
  return `${nice} •••• ${digits}`;
}

function formatInvoiceAmount(cents: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

function formatInvoiceDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function invoiceStatusLabel(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === 'paid') return 'Paid';
  if (s === 'open') return 'Open';
  if (s === 'draft') return 'Draft';
  if (s === 'uncollectible') return 'Uncollectible';
  if (s === 'void') return 'Void';
  return status || '—';
}

function invoiceStatusTone(status: string): 'paid' | 'open' | 'muted' {
  const s = status.trim().toLowerCase();
  if (s === 'paid') return 'paid';
  if (s === 'open') return 'open';
  return 'muted';
}

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="1"
          y1="1"
          x2="23"
          y2="23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { isPaid } = useSubscription();
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingMessage, setBillingMessage] = useState('');
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword') ?? '';
  // Prefer live /me tier so Billing does not stay hidden after payment.
  const paid = isPaid || isPaidTier(user?.tier);
  const renewalsOn = paid && user?.autoRenewalEnabled !== false;

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!paid) {
      setInvoices([]);
      setInvoicesError('');
      setInvoicesLoading(false);
      return;
    }
    let cancelled = false;
    setInvoicesLoading(true);
    setInvoicesError('');
    void fetchBillingInvoices()
      .then((rows) => {
        if (!cancelled) setInvoices(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setInvoices([]);
          setInvoicesError(getApiError(err, 'Could not load invoices.'));
        }
      })
      .finally(() => {
        if (!cancelled) setInvoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paid, user?.stripeCustomerId, user?.stripeSubscriptionId]);

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordError('');
    setPasswordMessage('');
    if (data.newPassword !== data.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    const policyError = validatePassword(data.newPassword, {
      email: user?.email ?? undefined,
      businessName: user?.businessName ?? undefined,
      fullName: user?.name ?? undefined,
    });
    if (policyError) {
      setPasswordError(policyError);
      return;
    }
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setPasswordMessage('Password updated successfully.');
      reset();
    } catch (err) {
      setPasswordError(getApiError(err, 'Could not update password.'));
    }
  };

  const handleCancelRenewal = async () => {
    setBillingBusy(true);
    setBillingError('');
    setBillingMessage('');
    try {
      const result = await setAutoRenewalEnabled(false);
      await refreshUser();
      setCancelOpen(false);
      setBillingMessage(
        result.message ||
          'Auto-renewal turned off. You keep access until the current period ends.',
      );
    } catch (err) {
      setBillingError(getApiError(err, 'Could not cancel renewal. Try again.'));
    } finally {
      setBillingBusy(false);
    }
  };

  const handleResumeRenewal = async () => {
    setBillingBusy(true);
    setBillingError('');
    setBillingMessage('');
    try {
      const result = await setAutoRenewalEnabled(true);
      await refreshUser();
      setBillingMessage(
        result.message || 'Auto-renewal enabled. Your plan will renew each billing period.',
      );
    } catch (err) {
      setBillingError(getApiError(err, 'Could not resume renewal. Try again.'));
    } finally {
      setBillingBusy(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    setPortalBusy(true);
    setBillingError('');
    try {
      const url = await createBillingPortalSession('/dashboard/profile');
      window.location.assign(url);
    } catch (err) {
      setBillingError(getApiError(err, 'Could not open payment settings. Try again.'));
      setPortalBusy(false);
    }
  };

  const displayName = user?.businessName || user?.name || user?.email || 'Your account';

  return (
    <>
      <SectionHeader periodMeta="Account" title="Profile" />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.shellCard}>
            <div className={styles.scrollViewport}>
              <div className={styles.stack}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Account details</h2>
          <dl className={styles.fieldList}>
            <div className={styles.fieldRow}>
              <dt>Name</dt>
              <dd>{displayName}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Email</dt>
              <dd>{user?.email ?? '—'}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Business</dt>
              <dd>{user?.businessName ?? '—'}</dd>
            </div>
            {user?.industry ? (
              <div className={styles.fieldRow}>
                <dt>Role</dt>
                <dd>{user.industry}</dd>
              </div>
            ) : null}
            {user?.country ? (
              <div className={styles.fieldRow}>
                <dt>Country</dt>
                <dd>{user.country}</dd>
              </div>
            ) : null}
            <div className={styles.fieldRow}>
              <dt>Plan</dt>
              <dd>{tierDisplayLabel(user?.tier)}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Member since</dt>
              <dd>{formatMemberSince(user?.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Billing</h2>

          {!renewalsOn && paid ? (
            <div className={styles.cancelBanner} role="status">
              <div>
                <strong>Your subscription will stop renewing.</strong>
                <p>You keep Paid access until the end of the current billing period.</p>
              </div>
              <button
                type="button"
                className={styles.bannerBtn}
                disabled={billingBusy}
                onClick={() => {
                  void handleResumeRenewal();
                }}
              >
                {billingBusy ? 'Saving…' : 'Resubscribe'}
              </button>
            </div>
          ) : null}

          {billingError ? <p className={styles.formError}>{billingError}</p> : null}
          {billingMessage ? <p className={styles.formSuccess}>{billingMessage}</p> : null}

          <div className={styles.billingBlock}>
            <div className={styles.billingBlockHead}>
              <h3 className={styles.billingBlockTitle}>Current plan</h3>
            </div>
            <div className={styles.billingRow}>
              <div>
                <div className={styles.planTitleRow}>
                  <span className={styles.billingPrimary}>
                    {paid ? formatPlanName(user?.subscriptionPlanId, user?.tier) : 'Free'}
                  </span>
                  {paid ? (
                    <span
                      className={
                        renewalsOn ? styles.statusBadgeActive : styles.statusBadgeCanceling
                      }
                    >
                      {renewalsOn ? 'Active' : 'Canceling'}
                    </span>
                  ) : null}
                </div>
                <div className={styles.billingSecondary}>
                  {paid
                    ? renewalsOn
                      ? 'Monthly · Auto-renews each billing period'
                      : 'Monthly · Cancellation scheduled at period end'
                    : 'One statement month included'}
                </div>
              </div>
              {!paid ? (
                <button
                  type="button"
                  className={styles.billingLinkBtn}
                  onClick={() => navigate('/pricing?from=/dashboard/profile')}
                >
                  Upgrade
                </button>
              ) : null}
            </div>
          </div>

          {paid ? (
            <div className={styles.billingBlock}>
              <div className={styles.billingBlockHead}>
                <h3 className={styles.billingBlockTitle}>Payment method</h3>
              </div>
              <div className={styles.billingRow}>
                <div>
                  <div className={styles.billingPrimary}>
                    {formatCardLabel(user?.cardBrand, user?.cardLast4) || 'Card on file via Stripe'}
                  </div>
                  <div className={styles.billingSecondary}>
                    {user?.cardExpMonth && user?.cardExpYear
                      ? `Expires ${String(user.cardExpMonth).padStart(2, '0')}/${String(user.cardExpYear).slice(-2)}`
                      : 'Updated automatically after checkout'}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.billingLinkBtn}
                  disabled={portalBusy || billingBusy}
                  onClick={() => {
                    void handleUpdatePaymentMethod();
                  }}
                >
                  {portalBusy ? 'Opening…' : 'Update'}
                </button>
              </div>
            </div>
          ) : null}

          {paid ? (
            <div className={styles.billingBlock}>
              <div className={styles.billingBlockHead}>
                <h3 className={styles.billingBlockTitle}>Invoices</h3>
              </div>
              {invoicesLoading ? (
                <p className={styles.billingSecondary}>Loading invoices…</p>
              ) : null}
              {invoicesError ? <p className={styles.formError}>{invoicesError}</p> : null}
              {!invoicesLoading && !invoicesError && invoices.length === 0 ? (
                <p className={styles.billingSecondary}>No invoices yet.</p>
              ) : null}
              {invoices.length > 0 ? (
                <div className={styles.invoiceTableWrap}>
                  <table className={styles.invoiceTable}>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Amount</th>
                        <th scope="col">Status</th>
                        <th scope="col" className={styles.invoiceActionsCol}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => {
                        const viewUrl = invoice.hostedInvoiceUrl || invoice.invoicePdfUrl;
                        const tone = invoiceStatusTone(invoice.status);
                        return (
                          <tr key={invoice.id}>
                            <td>
                              <div className={styles.invoiceDate}>
                                {formatInvoiceDate(invoice.createdAt)}
                              </div>
                              {invoice.description || invoice.number ? (
                                <div className={styles.invoiceDesc}>
                                  {invoice.description || invoice.number}
                                </div>
                              ) : null}
                            </td>
                            <td className={styles.invoiceAmount}>
                              {formatInvoiceAmount(invoice.amountCents, invoice.currency)}
                            </td>
                            <td>
                              <span
                                className={
                                  tone === 'paid'
                                    ? styles.invoiceStatusPaid
                                    : tone === 'open'
                                      ? styles.invoiceStatusOpen
                                      : styles.invoiceStatusMuted
                                }
                              >
                                {invoiceStatusLabel(invoice.status)}
                              </span>
                            </td>
                            <td className={styles.invoiceActionsCol}>
                              {viewUrl ? (
                                <a
                                  className={styles.invoiceActionLink}
                                  href={viewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View
                                </a>
                              ) : (
                                <span className={styles.billingSecondary}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {paid && renewalsOn ? (
            <div className={styles.billingBlock}>
              <div className={styles.billingBlockHead}>
                <h3 className={styles.billingBlockTitle}>Cancellation</h3>
              </div>
              <div className={styles.billingRow}>
                <div className={styles.billingPrimary}>Cancel plan</div>
                <button
                  type="button"
                  className={styles.cancelPlanBtn}
                  disabled={billingBusy}
                  onClick={() => {
                    setBillingError('');
                    setBillingMessage('');
                    setCancelOpen(true);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Change password</h2>
          <p className={styles.cardSub}>{PASSWORD_HINT}</p>
          <form className={styles.form} onSubmit={handleSubmit(onPasswordSubmit)} noValidate autoComplete="off">
            <label className={styles.label}>
              Current password
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className={`${styles.input} ${styles.inputWithIcon} ${
                    showCurrentPassword ? '' : styles.passwordMasked
                  }`}
                  {...register('currentPassword', { required: 'Current password is required.' })}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  <PasswordEyeIcon visible={showCurrentPassword} />
                </button>
              </div>
              {errors.currentPassword ? (
                <span className={styles.fieldError}>{errors.currentPassword.message}</span>
              ) : null}
            </label>
            <label className={styles.label}>
              New password
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className={`${styles.input} ${styles.inputWithIcon} ${
                    showNewPassword ? '' : styles.passwordMasked
                  }`}
                  {...register('newPassword', {
                    required: 'New password is required.',
                    validate: (value) =>
                      validatePassword(value, {
                        email: user?.email ?? undefined,
                        businessName: user?.businessName ?? undefined,
                        fullName: user?.name ?? undefined,
                      }) ?? true,
                  })}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  <PasswordEyeIcon visible={showNewPassword} />
                </button>
              </div>
              {errors.newPassword ? (
                <span className={styles.fieldError}>{errors.newPassword.message}</span>
              ) : null}
            </label>
            <label className={styles.label}>
              Confirm new password
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className={`${styles.input} ${styles.inputWithIcon} ${
                    showConfirmPassword ? '' : styles.passwordMasked
                  }`}
                  {...register('confirmPassword', {
                    required: 'Please confirm your new password.',
                    validate: (value) => value === newPassword || 'Passwords do not match.',
                  })}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <PasswordEyeIcon visible={showConfirmPassword} />
                </button>
              </div>
              {errors.confirmPassword ? (
                <span className={styles.fieldError}>{errors.confirmPassword.message}</span>
              ) : null}
            </label>
            {passwordError ? <p className={styles.formError}>{passwordError}</p> : null}
            {passwordMessage ? <p className={styles.formSuccess}>{passwordMessage}</p> : null}
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel subscription?"
        message="You'll keep Paid access until the end of your current billing period."
        confirmLabel={billingBusy ? 'Canceling…' : 'Cancel'}
        cancelLabel="Keep plan"
        confirming={billingBusy}
        onConfirm={() => {
          void handleCancelRenewal();
        }}
        onCancel={() => {
          if (!billingBusy) setCancelOpen(false);
        }}
      />
    </>
  );
}
