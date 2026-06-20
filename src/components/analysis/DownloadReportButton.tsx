import { useState } from 'react';
import {
  downloadCompactReconciliation,
  downloadSavedReportCompact,
  downloadWeekReports,
  getApiErrorAsync,
  type UploadFiles,
} from '../../lib/api';
import { downloadPdfWithSaveDialog, filenameFromDisposition } from '../../lib/downloadReport';
import type { Period } from '../../types';
import styles from './PostmanPanels.module.css';

interface Props {
  files: UploadFiles;
  period: Period;
  /** Saved statement id from analyze — preferred for monthly compact PDF. */
  statementId?: string | null;
}

export default function DownloadReportButton({ files, period, statementId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const hasAll = Boolean(files.bank && files.pos && files.ecommerce);
  const canDownloadMonth = Boolean(statementId || hasAll);
  const isWeek = period === 'Week';
  const isQuarter = period === 'Quarter';

  async function handleDownload() {
    if (isQuarter) {
      setError('Quarterly PDF export is not available yet. Use Month or Week.');
      return;
    }
    if (isWeek && !hasAll) {
      setError('Upload bank, POS, and ecommerce files to download.');
      return;
    }
    if (!isWeek && !canDownloadMonth) {
      setError('Upload bank, POS, and ecommerce files, or open a saved month to download.');
      return;
    }

    setExporting(true);
    setError('');
    try {
      if (isWeek) {
        const { data, headers } = await downloadWeekReports(files.bank, files.pos, files.ecommerce);
        const disposition = headers['content-disposition'] as string | undefined;
        const filename = filenameFromDisposition(disposition, 'Weekly_Report.pdf');
        await downloadPdfWithSaveDialog({
          suggestedFilename: filename,
          fetchBlob: async () => new File([data], filename, { type: 'application/pdf' }),
        });
        return;
      }

      const fallbackName = 'Reconciliation_Report.pdf';
      await downloadPdfWithSaveDialog({
        suggestedFilename: fallbackName,
        fetchBlob: async () => {
          // Prefer fresh file export (Postman POST /api/analyze/export/compact) when uploads remain.
          const { data, headers } = hasAll
            ? await downloadCompactReconciliation(files.bank, files.pos, files.ecommerce)
            : statementId
              ? await downloadSavedReportCompact(statementId)
              : await downloadCompactReconciliation(files.bank, files.pos, files.ecommerce);
          const filename = filenameFromDisposition(
            headers['content-disposition'] as string | undefined,
            fallbackName,
          );
          return new File([data], filename, { type: 'application/pdf' });
        },
      });
    } catch (err) {
      setError(
        await getApiErrorAsync(
          err,
          isWeek ? 'Could not download weekly report.' : 'Could not download reconciliation report.',
        ),
      );
    } finally {
      setExporting(false);
    }
  }

  const label = isWeek
    ? 'Download weekly report (PDF)'
    : 'Download monthly reconciliation report (PDF)';

  const hint = isWeek
    ? 'PDF with Week 1, Week 2, … breakdowns for this statement month.'
    : hasAll
      ? 'Compact monthly report from uploaded files (Postman POST /api/analyze/export/compact).'
      : statementId
        ? 'Compact monthly report (same layout as Postman GET /api/reports/{id}/compact).'
        : 'Upload bank, POS, and ecommerce files to download.';

  return (
    <div className={styles.toolbar}>
      <p className={styles.toolbarHint}>{hint}</p>
      <button
        type="button"
        className={styles.downloadBtn}
        onClick={handleDownload}
        disabled={exporting || (isWeek ? !hasAll : !canDownloadMonth) || isQuarter}
      >
        {exporting ? 'Preparing download…' : label}
      </button>
      {error && (
        <p className={styles.toolbarHint} style={{ color: 'var(--neg)', width: '100%' }}>
          {error}
        </p>
      )}
    </div>
  );
}
