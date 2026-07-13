import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { getApiError, setAutoRenewalEnabled } from '../../lib/api';
import { clearClerkSession, isClerkEnabled } from '../../lib/clerk';
import { isPaidTier, tierDisplayLabel } from '../../lib/subscription';
import styles from './UserAccountMenu.module.css';

type Props = {
  /** Show business/name beside the avatar (upload page). */
  showName?: boolean;
  showProfile?: boolean;
};

export default function UserAccountMenu({ showName = false, showProfile = true }: Props) {
  const { user, logout, refreshUser } = useAuth();
  const { isPaid } = useSubscription();
  const clerk = useClerk();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageMessage, setManageMessage] = useState('');

  const displayName = user?.businessName || user?.name || user?.email || 'Your account';
  const avatar = displayName.charAt(0).toUpperCase();
  const paid = isPaid || isPaidTier(user?.tier);
  const renewalsOn = paid && user?.autoRenewalEnabled !== false;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      if (isClerkEnabled()) {
        await clearClerkSession(clerk);
      }
      setConfirmSignOut(false);
      setMenuOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (cancelBusy) return;
    setCancelBusy(true);
    setManageError('');
    setManageMessage('');
    try {
      const result = await setAutoRenewalEnabled(false);
      await refreshUser();
      setCancelConfirmOpen(false);
      setManageMessage(
        result.message ||
          'Auto-renewal turned off. You keep access until the current period ends.',
      );
    } catch (err) {
      setManageError(getApiError(err, 'Could not cancel subscription. Try again.'));
      setCancelConfirmOpen(false);
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <>
      <div className={styles.wrap} ref={menuRef}>
        {showName ? <span className={styles.name}>{displayName}</span> : null}
        <button
          type="button"
          className={styles.avatar}
          onClick={() => setMenuOpen((open) => !open)}
          title="Account menu"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {avatar}
        </button>
        {menuOpen ? (
          <div className={styles.menu} role="menu">
            <div className={styles.menuHeader}>
              <div className={styles.menuName}>{displayName}</div>
              {user?.email ? <div className={styles.menuEmail}>{user.email}</div> : null}
            </div>
            {showProfile ? (
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/dashboard/profile');
                }}
              >
                Profile
              </button>
            ) : null}
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setManageError('');
                setManageMessage('');
                setManageOpen(true);
              }}
            >
              Manage subscriptions
            </button>
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setConfirmSignOut(true);
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {manageOpen ? (
        <div
          className={styles.manageBackdrop}
          onClick={cancelBusy ? undefined : () => setManageOpen(false)}
          role="presentation"
        >
          <div
            className={styles.manageDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-subs-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="manage-subs-title" className={styles.manageTitle}>
              Manage subscriptions
            </h2>
            <p className={styles.manageLead}>
              Current plan:{' '}
              <strong>{paid ? tierDisplayLabel(user?.tier) : 'Free'}</strong>
              {paid
                ? renewalsOn
                  ? ' · Auto-renews each billing period'
                  : ' · Cancellation scheduled at period end'
                : null}
            </p>
            {manageError ? <p className={styles.manageError}>{manageError}</p> : null}
            {manageMessage ? <p className={styles.manageSuccess}>{manageMessage}</p> : null}

            {paid && renewalsOn ? (
              <div className={styles.manageRow}>
                <div>
                  <div className={styles.manageRowTitle}>Cancel subscription</div>
                  <div className={styles.manageRowSub}>
                    You keep Paid access until the end of your current billing period.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.manageCancelBtn}
                  disabled={cancelBusy}
                  onClick={() => {
                    setManageError('');
                    setCancelConfirmOpen(true);
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {paid && !renewalsOn ? (
              <p className={styles.manageRowSub}>
                Your subscription is already set to stop renewing. You can resubscribe from
                Profile → Billing.
              </p>
            ) : null}

            {!paid ? (
              <div className={styles.manageRow}>
                <div className={styles.manageRowSub}>No paid subscription on this account.</div>
                <button
                  type="button"
                  className={styles.managePrimaryBtn}
                  onClick={() => {
                    setManageOpen(false);
                    navigate('/pricing');
                  }}
                >
                  View plans
                </button>
              </div>
            ) : null}

            <div className={styles.manageActions}>
              <button
                type="button"
                className={styles.manageCloseBtn}
                disabled={cancelBusy}
                onClick={() => setManageOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        message="Are you sure you want to sign out? You'll need to sign in again to access your dashboard."
        confirmLabel={signingOut ? 'Signing out…' : 'Yes, sign out'}
        cancelLabel="No, stay"
        confirming={signingOut}
        onConfirm={() => void handleSignOut()}
        onCancel={() => {
          if (!signingOut) setConfirmSignOut(false);
        }}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Are you sure you want to cancel?"
        message="You'll keep Paid access until the end of your current billing period. Auto-renewal will stop."
        confirmLabel={cancelBusy ? 'Canceling…' : 'Yes, cancel'}
        cancelLabel="No, keep plan"
        confirming={cancelBusy}
        onConfirm={() => {
          void handleCancelSubscription();
        }}
        onCancel={() => {
          if (!cancelBusy) setCancelConfirmOpen(false);
        }}
      />
    </>
  );
}
