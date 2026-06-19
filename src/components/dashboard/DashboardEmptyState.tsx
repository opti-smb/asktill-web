import SectionHeader from '../layout/SectionHeader';
import DashboardWelcome, { dashboardWelcomeHeader } from './DashboardWelcome';
import { useAuth } from '../../context/AuthContext';
import { firstNameFromUser } from '../../lib/atLetterPreview';

interface DashboardEmptyStateProps {
  historyReady: boolean;
  loadingHintClassName?: string;
}

/** Shared welcome header + message when the user has no saved reports yet. */
export default function DashboardEmptyState({
  historyReady,
  loadingHintClassName,
}: DashboardEmptyStateProps) {
  const { user } = useAuth();
  const firstName = firstNameFromUser(user);
  const header = dashboardWelcomeHeader(firstName);

  return (
    <>
      <SectionHeader periodMeta={header.periodMeta} title={header.title} />
      <div className="wrap" style={{ padding: '12px 0 28px' }}>
        {historyReady ? (
          <DashboardWelcome />
        ) : (
          <p className={loadingHintClassName}>Loading your account…</p>
        )}
      </div>
    </>
  );
}
