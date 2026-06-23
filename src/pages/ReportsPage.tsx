import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/layout/SectionHeader';
import PeriodPicker from '../components/layout/PeriodPicker';
import ChannelReconciliationView from '../components/analysis/ChannelReconciliationView';
import DownloadReportButton from '../components/analysis/DownloadReportButton';
import PreviousReportsPanel from '../components/analysis/PreviousReportsPanel';
import WeekReportPanel from '../components/analysis/WeekReportPanel';
import { useAnalysis } from '../context/AnalysisContext';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import { fetchWeekReports, getApiError } from '../lib/api';
import { getAnalyzeAnalysis, type WeekReportsViewApi } from '../lib/analyzeResponse';
import { periodKeyFromLabel, resolveAtLetterStatementId } from '../lib/atLetterStatement';
import type { Period } from '../types';
import styles from './ReportsPage.module.css';
import postmanStyles from '../components/analysis/PostmanPanels.module.css';

function hasUploadFiles(files: { bank?: File; pos?: File; ecommerce?: File }) {
  return Boolean(files.bank || files.pos || files.ecommerce);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('Month');
  const { result, files, mergeWeekReports, loadSavedReport } = useAnalysis();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const { historyReady, primaryReport } = useReportSync();
  const analysis = getAnalyzeAnalysis(result);
  const pdfStatementId = useMemo(
    () =>
      resolveAtLetterStatementId({
        sessionStatementId: result?.statement_id,
        sessionPeriodKey: periodKeyFromLabel(analysis?.period_label),
        primaryReport,
      }) ?? result?.statement_id ?? null,
    [result?.statement_id, analysis?.period_label, primaryReport],
  );
  const documents = result?.documents ?? [];
  const fallbackBusinessName = useMemo(() => {
    const fromAnalysis = analysis?.business_name?.trim();
    if (fromAnalysis) return fromAnalysis;
    const fromDocs = documents
      .map((doc) => doc.business_name?.trim())
      .filter((name): name is string => Boolean(name));
    if (!fromDocs.length) return null;
    return fromDocs.sort((a, b) => b.length - a.length)[0];
  }, [analysis?.business_name, documents]);
  const [weekReports, setWeekReports] = useState<WeekReportsViewApi | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);

  useEffect(() => {
    setWeekReports(null);
    setWeekError(null);
  }, [result]);

  useEffect(() => {
    if (period !== 'Week' || !result) {
      return;
    }

    const fromAnalysis = analysis?.week_reports;
    if (fromAnalysis && fromAnalysis.weeks?.length) {
      setWeekReports(fromAnalysis);
      return;
    }

    if (!hasUploadFiles(files)) {
      setWeekReports(fromAnalysis ?? null);
      return;
    }

    let cancelled = false;
    setWeekLoading(true);
    setWeekError(null);

    fetchWeekReports(files.bank, files.pos, files.ecommerce)
      .then(({ data }) => {
        if (cancelled) return;
        setWeekReports(data);
        mergeWeekReports(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setWeekError(getApiError(err, 'Could not load weekly report.'));
        setWeekReports(fromAnalysis ?? null);
      })
      .finally(() => {
        if (!cancelled) setWeekLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, result, analysis?.week_reports, files, mergeWeekReports]);

  const activeWeekReports = weekReports ?? analysis?.week_reports ?? null;
  const currentPeriodKey = useMemo(() => {
    const label = analysis?.period_label;
    if (!label) return null;
    const m = label.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (!m) return null;
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    const key = months[m[1].toLowerCase()];
    return key ? `${m[2]}-${key}` : null;
  }, [analysis?.period_label]);

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.main}>
        <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.sectionSub} />
        <div className="wrap">
          <PreviousReportsPanel
            excludePeriodKey={currentPeriodKey}
            onLoadReport={loadSavedReport}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        periodMeta={analysis?.period_label ?? 'REPORTS'}
        title={<>Your uploaded <em>reports.</em></>}
        actions={<PeriodPicker period={period} onPeriodChange={setPeriod} />}
      />
      <div className={styles.main}>
        <div className="wrap">
          <>
            <DownloadReportButton files={files} period={period} statementId={pdfStatementId} />

              {period === 'Month' && (
                <>
                  {documents.length > 0 && (
                    <section className={postmanStyles.panel}>
                      <div className={postmanStyles.head}>
                        <h2 className={postmanStyles.title}>Uploaded files</h2>
                        <p className={postmanStyles.sub}>Statements included in this analysis</p>
                      </div>
                      <div className={postmanStyles.tableWrap}>
                        <table className={postmanStyles.table}>
                          <thead>
                            <tr>
                              <th>File</th>
                              <th>Type</th>
                              <th>Business</th>
                              <th>Period</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc) => (
                              <tr key={doc.filename}>
                                <td>{doc.filename}</td>
                                <td>{doc.detected_role ?? '—'}</td>
                                <td>{doc.business_name?.trim() || fallbackBusinessName || '—'}</td>
                                <td>{doc.period ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  <ChannelReconciliationView result={result} />
                </>
              )}

              {period === 'Week' && (
                <WeekReportPanel
                  weekReports={activeWeekReports}
                  loading={weekLoading}
                  error={weekError}
                />
              )}

              {period === 'Quarter' && (
                <section className={postmanStyles.panel}>
                  <div className={postmanStyles.head}>
                    <h2 className={postmanStyles.title}>Quarterly report</h2>
                    <p className={postmanStyles.sub}>
                      Quarterly rollups are coming soon. Use <strong>Month</strong> for the full
                      statement report or <strong>Week</strong> for dated POS, e-commerce, and bank
                      breakdowns.
                    </p>
                  </div>
                </section>
              )}
          </>

          <PreviousReportsPanel
            excludePeriodKey={currentPeriodKey}
            onLoadReport={loadSavedReport}
          />
        </div>
      </div>
    </>
  );
}
