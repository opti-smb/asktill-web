import SectionHeader from '../components/layout/SectionHeader';
import AtLetterTemplateFrame from '../components/landing/AtLetterTemplateFrame';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useAtLetterHtml } from '../hooks/useAtLetterHtml';
import { useAtLetterTemplate } from '../hooks/useAtLetterTemplate';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import styles from './AtLetterPage.module.css';

export default function AtLetterPage() {
  const { result } = useAnalysis();
  const { historyReady } = useReportSync();
  const { statementId, periodLabel, footerMeta } = useAtLetterTemplate();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const { html, loading, error } = useAtLetterHtml(statementId);

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.main}>
        <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
      </div>
    );
  }

  const periodMeta = periodLabel?.trim() || 'AT LETTER';
  const showLetter = Boolean(html);
  const showLoading = !showLetter && (loading || !statementId);

  return (
    <>
      <SectionHeader
        periodMeta={periodMeta}
        title={<>Your monthly <em>letter.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          {footerMeta ? <p className={styles.meta}>{footerMeta}</p> : null}
          {error && !showLetter ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.card}>
            <AtLetterTemplateFrame
              html={html}
              loading={showLoading}
              empty={false}
              emptyMessage="Upload and analyze your statements to generate your AT Letter — the same full Monthly Business Review with your numbers, charts, and reconciliation."
            />
          </div>
        </div>
      </div>
    </>
  );
}
