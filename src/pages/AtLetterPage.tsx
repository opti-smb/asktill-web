import { useEffect, useMemo, useState } from 'react';

import SectionHeader from '../components/layout/SectionHeader';
import AtLetterTemplateFrame from '../components/landing/AtLetterTemplateFrame';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useAtLetterHtml } from '../hooks/useAtLetterHtml';
import { useAtLetterTemplate } from '../hooks/useAtLetterTemplate';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import styles from './AtLetterPage.module.css';

const ROLLING_VIEW = 'rolling';

function monthOnlyLabelFromPeriod(periodLabel: string | null | undefined): string {
  const label = periodLabel?.trim();
  if (!label) return 'This month only';
  const short = label.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i,
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
  const { historyReady, savedCount } = useReportSync();
  const { statementId, periodLabel, footerMeta } = useAtLetterTemplate();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  /** null = default to latest month only; user picks rolling quarter explicitly. */
  const [viewMode, setViewMode] = useState<'rolling' | 'month' | null>(null);

  const letterStatementId = statementId ?? undefined;

  const activeView = viewMode ?? (letterStatementId ?? ROLLING_VIEW);
  const monthOnly = activeView !== ROLLING_VIEW;

  const { html, loading, error } = useAtLetterHtml(letterStatementId, { monthOnly });

  const showViewFilters = savedCount >= 1 && Boolean(letterStatementId);

  useEffect(() => {
    setViewMode(null);
  }, [result?.statement_id, letterStatementId]);

  useEffect(() => {
    if (viewMode !== 'month') return;
    if (!letterStatementId) {
      setViewMode(null);
    }
  }, [letterStatementId, viewMode]);

  const viewMeta = useMemo(() => {
    if (!monthOnly) {
      const monthsOnFile = Math.min(savedCount, 3);
      if (monthsOnFile >= 3) {
        return 'Quarter view — comparing your latest 3 months on file.';
      }
      if (monthsOnFile === 2) {
        return 'Comparing your latest 2 months on file.';
      }
      return 'Upload more months to unlock a 3-month quarter comparison.';
    }
    const label = periodLabel?.trim() || 'Selected month';
    return `${label} only — single-month letter, no rolling comparison.`;
  }, [monthOnly, savedCount, periodLabel]);

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.main}>
        <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
      </div>
    );
  }

  const periodMeta = periodLabel?.trim() || 'AT LETTER';
  const showLoading = loading || !letterStatementId;
  const showLetter = Boolean(html) && !showLoading;

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
                  onClick={() => setViewMode('rolling')}
                >
                  Last 3 months
                </button>
                <button
                  type="button"
                  className={`${styles.viewFilter} ${activeView !== ROLLING_VIEW ? styles.viewFilterActive : ''}`}
                  onClick={() => {
                    if (letterStatementId) setViewMode('month');
                  }}
                >
                  {monthOnlyLabelFromPeriod(periodLabel)}
                </button>
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
