import { useEffect, useMemo, useState } from 'react';

import SectionHeader from '../components/layout/SectionHeader';
import AtLetterTemplateFrame from '../components/landing/AtLetterTemplateFrame';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useAtLetterHtml } from '../hooks/useAtLetterHtml';
import { useAtLetterTemplate } from '../hooks/useAtLetterTemplate';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import type { SavedReportSummaryApi } from '../lib/api';
import styles from './AtLetterPage.module.css';

const ROLLING_VIEW = 'rolling';

function monthOnlyLabel(report: SavedReportSummaryApi): string {
  const label = report.period_label?.trim();
  if (!label) return 'Month only';
  const short = label.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i,
  );
  if (short) {
    const token = short[1];
    const abbr =
      token.length <= 3
        ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
        : token.slice(0, 3);
    return `${abbr} only`;
  }
  return `${label.split(/\s+/)[0]} only`;
}

export default function AtLetterPage() {
  const { result } = useAnalysis();
  const { historyReady, savedCount, savedReports } = useReportSync();
  const { statementId: rollingStatementId, periodLabel, footerMeta } = useAtLetterTemplate();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const [activeView, setActiveView] = useState<string>(ROLLING_VIEW);

  const monthOnly = activeView !== ROLLING_VIEW;
  const activeStatementId = monthOnly ? activeView : rollingStatementId;

  const { html, loading, error } = useAtLetterHtml(activeStatementId, { monthOnly });

  const showViewFilters = savedCount >= 2;

  useEffect(() => {
    if (activeView === ROLLING_VIEW) return;
    if (!savedReports.some((row) => row.statement_id === activeView)) {
      setActiveView(ROLLING_VIEW);
    }
  }, [savedReports, activeView]);

  useEffect(() => {
    if (savedCount < 2 && activeView !== ROLLING_VIEW) {
      setActiveView(ROLLING_VIEW);
    }
  }, [savedCount, activeView]);

  const viewMeta = useMemo(() => {
    if (!monthOnly) {
      return savedCount >= 3
        ? 'Rolling quarter view — comparing up to 3 months on file.'
        : 'Rolling view — comparing all months on file.';
    }
    const report = savedReports.find((row) => row.statement_id === activeView);
    const label = report?.period_label?.trim() || 'Selected month';
    return `${label} only — no month-over-month comparison.`;
  }, [monthOnly, savedCount, savedReports, activeView]);

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.main}>
        <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
      </div>
    );
  }

  const periodMeta = periodLabel?.trim() || 'AT LETTER';
  const showLetter = Boolean(html);
  const showLoading = !showLetter && (loading || !activeStatementId);

  return (
    <>
      <SectionHeader
        periodMeta={periodMeta}
        title={<>Your monthly <em>letter.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          {showViewFilters ? (
            <div className={styles.viewBar}>
              <div className={styles.viewTitle}>
                Letter view
              </div>
              <div className={styles.viewFilterRow}>
                <button
                  type="button"
                  className={`${styles.viewFilter} ${activeView === ROLLING_VIEW ? styles.viewFilterActive : ''}`}
                  onClick={() => setActiveView(ROLLING_VIEW)}
                >
                  All on file ({savedCount})
                </button>
                {savedReports.map((report) => (
                  <button
                    key={report.statement_id}
                    type="button"
                    className={`${styles.viewFilter} ${activeView === report.statement_id ? styles.viewFilterActive : ''}`}
                    onClick={() => setActiveView(report.statement_id)}
                  >
                    {monthOnlyLabel(report)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {footerMeta || viewMeta ? (
            <p className={styles.meta}>
              {footerMeta}
              {footerMeta && viewMeta ? ' · ' : null}
              {showViewFilters ? viewMeta : null}
            </p>
          ) : null}
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
