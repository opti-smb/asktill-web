import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { clearClerkSession, isClerkEnabled } from '../../lib/clerk';
import styles from './UserAccountMenu.module.css';

type Props = {
  /** Show business/name beside the avatar (upload page). */
  showName?: boolean;
  showProfile?: boolean;
};

export default function UserAccountMenu({ showName = false, showProfile = true }: Props) {
  const { user, logout } = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = user?.businessName || user?.name || user?.email || 'Your account';
  const avatar = displayName.charAt(0).toUpperCase();

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
    </>
  );
}
