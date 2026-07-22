import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  downloadMonthlyReportPdf,
  ensureAuthServiceReady,
  fetchReportHistory,
  fetchSavedReport,
  getApiError,
  getApiErrorAsync,
  warmupBackend,
  type SavedReportSummaryApi,
} from '../../lib/api';
import { downloadPdfWithSaveDialog, filenameFromDisposition } from '../../lib/downloadReport';
import type { AnalyzeResult } from '../../lib/analyzeResponse';
import { DEFAULT_DASHBOARD_PATH } from '../../lib/pendingPdfDownload';
import postmanStyles from './PostmanPanels.module.css';

function fmtMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const s = abs.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return value < 0 ? `(${s})` : s;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

interface Props {
  excludePeriodKey?: string | null;
  onLoadReport?: (result: AnalyzeResult) => void;
  active?: boolean;
  onReportsLoaded?: (count: number) => void;
  variant?: 'default' | 'upload';
}

export default function PreviousReportsPanel({
  excludePeriodKey,
  onLoadReport,
  active = true,
  onReportsLoaded,
  variant = 'default',
}: Props) {
  const navigate = useNavigate();
  const { isAuth, ready } = useAuth();
  const [reports, setReports] = useState<SavedReportSummaryApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !ready) return;
    if (!isAuth) {
      setReports([]);
      setError('Please sign in to view saved reports.');
      setLoading(false);
      onReportsLoaded?.(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    warmupBackend();
    void ensureAuthServiceReady(15_000).finally(() => {
      if (cancelled) return;
      fetchReportHistory()
      .then(({ data }) => {
        if (cancelled) return;
        const list = data.reports ?? [];
        setReports(list);
        onReportsLoaded?.(list.length);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err, 'Could not load saved reports.'));
        onReportsLoaded?.(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    });
    return () => { cancelled = true; };
  }, [active, isAuth, ready, onReportsLoaded]);

  const previous = useMemo(() => {
    if (!excludePeriodKey) return reports;
    return reports.filter((r) => r.period_key !== excludePeriodKey);
  }, [reports, excludePeriodKey]);

  const openReport = useCallback(async (row: SavedReportSummaryApi) => {
    // One open/download at a time — spam-clicks stack heavy report loads and OOM Render (512Mi).
    if (busyId) return;
    setBusyId(row.statement_id);
    setActionError(null);
    try {
      const { data } = await fetchSavedReport(row.statement_id);
      onLoadReport?.(data as AnalyzeResult);
      // Upload-page "previous reconciliation reports" should land on Reconciliation, not AT Letter.
      navigate(variant === 'upload' ? '/dashboard/at-ledger/reconciliation' : DEFAULT_DASHBOARD_PATH);
    } catch (err) {
      setActionError(
        await getApiErrorAsync(
          err,
          'Could not open saved report. Wait a few seconds and try once — do not keep clicking.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }, [busyId, navigate, onLoadReport, variant]);

  const downloadMonthlyReport = useCallback(async (row: SavedReportSummaryApi) => {
    if (!row.statement_id || busyId) return;
    setBusyId(row.statement_id);
    setActionError(null);
    const label = row.period_label?.replace(/\s+/g, '_') ?? 'Reconciliation';
    const fallbackName = `${label}_Reconciliation.pdf`;
    try {
      await downloadPdfWithSaveDialog({
        suggestedFilename: fallbackName,
        prebuilt: true,
        fetchBlob: async () => {
          const { data, headers } = await downloadMonthlyReportPdf(row.statement_id);
          const filename = filenameFromDisposition(
            headers['content-disposition'] as string | undefined,
            fallbackName,
          );
          return new File([data], filename, { type: 'application/pdf' });
        },
      });
    } catch (err) {
      setActionError(
        await getApiErrorAsync(
          err,
          'Could not download monthly report. Wait a few seconds and try once — do not keep clicking.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }, [busyId]);

  if (!active) return null;
  if (loading) {
    return (
      <section className={postmanStyles.panel}>
        <div className={postmanStyles.head}>
          <h2 className={postmanStyles.title}>Previous reports</h2>
          <p className={postmanStyles.sub}>Loading saved months…</p>
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className={postmanStyles.panel}>
        <div className={postmanStyles.head}>
          <h2 className={postmanStyles.title}>Previous reports</h2>
          <p className={postmanStyles.sub} style={{ color: 'var(--neg)' }}>{error}</p>
        </div>
      </section>
    );
  }
  if (!previous.length) {
    return (
      <section className={postmanStyles.panel}>
        {variant === 'default' && (
          <div className={postmanStyles.head}>
            <h2 className={postmanStyles.title}>Previous reports</h2>
            <p className={postmanStyles.sub}>Saved months appear here after analyze.</p>
          </div>
        )}
        <p className={postmanStyles.empty}>No prior months saved yet.</p>
      </section>
    );
  }
  return (
    <section className={postmanStyles.panel}>
      {variant === 'default' && (
        <div className={postmanStyles.head}>
          <h2 className={postmanStyles.title}>Previous reports</h2>
          <p className={postmanStyles.sub}>
            Open a saved month on the dashboard. The AT Letter rolls up your latest 1–3 uploads — view it on the AT Letter tab.
          </p>
        </div>
      )}
      <div className={postmanStyles.tableWrap}>
        <table className={postmanStyles.table}>
          <thead>
            <tr><th>Period</th><th>Business</th><th>Gross</th><th>Gap</th><th>Saved</th><th /></tr>
          </thead>
          <tbody>
            {previous.map((row) => (
              <tr key={row.statement_id}>
                <td>{row.period_label ?? '—'}</td>
                <td>{row.business_name?.trim() || '—'}</td>
                <td>{fmtMoney(row.total_gross)}</td>
                <td>{fmtMoney(row.difference)}</td>
                <td>{fmtDate(row.uploaded_at)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className={postmanStyles.linkBtn}
                    disabled={busyId != null}
                    onClick={() => void openReport(row)}
                  >
                    {busyId === row.statement_id ? 'Opening…' : 'Open'}
                  </button>
                  {row.has_pdf !== false ? (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className={postmanStyles.linkBtn}
                        disabled={busyId != null}
                        onClick={() => void downloadMonthlyReport(row)}
                      >
                        {busyId === row.statement_id ? 'Working…' : 'Download'}
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {actionError && <p className={postmanStyles.sub} style={{ color: 'var(--neg)', marginTop: 8 }}>{actionError}</p>}
    </section>
  );
}
