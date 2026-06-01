import { useState } from 'react';
import { useForm } from 'react-hook-form';
import SectionHeader from '../components/layout/SectionHeader';
import { useAuth } from '../context/AuthContext';
import { changePassword, getApiError } from '../lib/api';
import { PASSWORD_HINT, validatePassword } from '../lib/passwordPolicy';
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

export default function ProfilePage() {
  const { user } = useAuth();
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword') ?? '';

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

  const displayName = user?.businessName || user?.name || user?.email || 'Your account';

  return (
    <>
      <SectionHeader periodMeta="Account" title="Profile" />
      <main className={`wrap ${styles.main}`}>
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
              <dd>{user?.tier ? user.tier.replace(/_/g, ' ') : 'Pilot'}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Member since</dt>
              <dd>{formatMemberSince(user?.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Change password</h2>
          <p className={styles.cardSub}>{PASSWORD_HINT}</p>
          <form className={styles.form} onSubmit={handleSubmit(onPasswordSubmit)} noValidate>
            <label className={styles.label}>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                className={styles.input}
                {...register('currentPassword', { required: 'Current password is required.' })}
              />
              {errors.currentPassword ? (
                <span className={styles.fieldError}>{errors.currentPassword.message}</span>
              ) : null}
            </label>
            <label className={styles.label}>
              New password
              <input
                type="password"
                autoComplete="new-password"
                className={styles.input}
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
              {errors.newPassword ? (
                <span className={styles.fieldError}>{errors.newPassword.message}</span>
              ) : null}
            </label>
            <label className={styles.label}>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                className={styles.input}
                {...register('confirmPassword', {
                  required: 'Please confirm your new password.',
                  validate: (value) => value === newPassword || 'Passwords do not match.',
                })}
              />
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
      </main>
    </>
  );
}
