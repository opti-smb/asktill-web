import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/layout/SectionHeader';
import PeriodPicker from '../components/layout/PeriodPicker';
import ChannelReconciliationView from '../components/analysis/ChannelReconciliationView';
import DownloadReportButton from '../components/analysis/DownloadReportButton';
import WeekReportPanel from '../components/analysis/WeekReportPanel';
import { useAnalysis } from '../context/AnalysisContext';
import { fetchWeekReports, getApiError } from '../lib/api';
import { getAnalyzeAnalysis, type WeekReportsViewApi } from '../lib/analyzeResponse';
import type { Period } from '../types';
import styles from './ReportsPage.module.css';
import postmanStyles from '../components/analysis/PostmanPanels.module.css';

function hasUploadFiles(files: { bank?: File; pos?: File; ecommerce?: File }) {
  return Boolean(files.bank || files.pos || files.ecommerce);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('Month');
  const { result, files, mergeWeekReports } = useAnalysis();
  const analysis = getAnalyzeAnalysis(result);
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

  return (
    <>
      <SectionHeader
        periodMeta={analysis?.period_label ?? 'REPORTS'}
        title={<>Your uploaded <em>reports.</em></>}
        actions={<PeriodPicker period={period} onPeriodChange={setPeriod} />}
      />
      <div className={styles.main}>
        <div className="wrap">
          {!result ? (
            <p className={styles.sectionSub}>
              Upload and analyze your statements first to see reconciliation and weekly breakdowns here.
            </p>
          ) : (
            <>
              <DownloadReportButton files={files} period={period} />

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
          )}
        </div>
      </div>
    </>
  );
}
