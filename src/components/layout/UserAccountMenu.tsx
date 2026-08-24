import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { getApiError, prefetchAdminDashboard, setAutoRenewalEnabled } from '../../lib/api';
import { clearClerkSession, isClerkEnabled } from '../../lib/clerk';
import { clearEc2BackendSession } from '../../lib/ec2BackendSession';
import { isPaidTier, tierDisplayLabel } from '../../lib/subscription';
import styles from './UserAccountMenu.module.css';

type Props = {
  /** Show business/name beside the avatar (upload page). */
  showName?: boolean;
  showProfile?: boolean;
  /** Where the account dropdown opens relative to the trigger. */
  menuPlacement?: 'below' | 'above';
  /** Dashboard sidebar row: green initials, name, role, chevron. */
  variant?: 'default' | 'sidebar';
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  const compact = name.replace(/[^a-zA-Z0-9]/g, '');
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return (compact.charAt(0) || '?').toUpperCase();
}

type ClerkLike = {
  session?: { id?: string } | null;
  signOut?: (opts?: { redirectUrl?: string }) => Promise<void>;
  setActive?: (args: { session: null; navigate: () => void }) => Promise<void>;
};

function UserAccountMenuInner({
  showName = false,
  showProfile = true,
  menuPlacement = 'below',
  variant = 'default',
  clerk,
}: Props & { clerk: ClerkLike | null }) {
  const { user, logout, refreshUser, isAdmin } = useAuth();
  const { isPaid } = useSubscription();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const adminHoverTimer = useRef<number | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageMessage, setManageMessage] = useState('');

  const displayName = user?.businessName || user?.name || user?.email || 'Your account';
  const avatar = variant === 'sidebar' ? initialsFromName(displayName) : displayName.charAt(0).toUpperCase();
  const roleLabel =
    user?.roles?.includes('owner') || user?.roles?.includes('Owner')
      ? 'Owner'
      : user?.roles?.[0]
        ? user.roles[0].charAt(0).toUpperCase() + user.roles[0].slice(1)
        : 'Owner';
  const paid = isPaid || isPaidTier(user?.tier);
  const renewalsOn = paid && user?.autoRenewalEnabled !== false;
  const isSidebar = variant === 'sidebar';

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuOpen]);

  useDismissOnEscape(() => setMenuOpen(false), menuOpen);

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const clearAdminHoverTimer = () => {
    if (adminHoverTimer.current != null) {
      window.clearTimeout(adminHoverTimer.current);
      adminHoverTimer.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), 220);
  };

  const goAdminDashboard = () => {
    clearAdminHoverTimer();
    setMenuOpen(false);
    navigate('/admin');
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      clearEc2BackendSession();
      if (isClerkEnabled() && clerk) {
        await clearClerkSession(clerk, { stayOnPage: true });
      }
      setConfirmSignOut(false);
      setMenuOpen(false);
      navigate('/login?signedOut=1', { replace: true });
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
      <div
        className={`${styles.wrap} ${isSidebar ? styles.wrapSidebar : ''}`}
        ref={menuRef}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleCloseMenu}
      >
        {isSidebar ? (
          <button
            type="button"
            className={styles.sidebarTrigger}
            onClick={() => setMenuOpen((open) => !open)}
            title="Account menu"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className={styles.avatarSidebar} aria-hidden>
              {avatar}
            </span>
            <span className={styles.sidebarCopy}>
              <span className={styles.sidebarName}>{displayName}</span>
              <span className={styles.sidebarRole}>{roleLabel}</span>
            </span>
            <i
              className={`ti ${menuOpen ? 'ti-chevron-up' : 'ti-chevron-down'} ${styles.sidebarChevron}`}
              aria-hidden
            />
          </button>
        ) : (
          <>
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
          </>
        )}
        {menuOpen ? (
          <div
            className={`${styles.menu} ${menuPlacement === 'above' ? styles.menuAbove : ''}`}
            role="menu"
          >
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
            {isAdmin ? (
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onMouseEnter={() => {
                  clearAdminHoverTimer();
                  // Prefetch only — never auto-navigate on hover (felt slow / surprising).
                  adminHoverTimer.current = window.setTimeout(() => {
                    prefetchAdminDashboard();
                  }, 120);
                }}
                onMouseLeave={clearAdminHoverTimer}
                onClick={goAdminDashboard}
              >
                Admin Dashboard
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

function UserAccountMenuClerk(props: Props) {
  const clerk = useClerk();
  return <UserAccountMenuInner {...props} clerk={clerk} />;
}

export default function UserAccountMenu(props: Props) {
  if (!isClerkEnabled()) {
    return <UserAccountMenuInner {...props} clerk={null} />;
  }
  return <UserAccountMenuClerk {...props} />;
}
