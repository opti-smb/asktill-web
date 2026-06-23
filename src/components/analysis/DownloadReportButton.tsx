import { useState } from 'react';
import {
  downloadCompactReconciliation,
  downloadSavedReportCompact,
  downloadWeekReports,
  getApiErrorAsync,
  type UploadFiles,
} from '../../lib/api';
import {
  downloadPdfWithSaveDialog,
  filenameFromDisposition,
  type PdfDownloadStage,
} from '../../lib/downloadReport';
import type { Period } from '../../types';
import styles from './PostmanPanels.module.css';

interface Props {
  files: UploadFiles;
  period: Period;
  /** Saved statement id from analyze — preferred for monthly compact PDF. */
  statementId?: string | null;
}

function downloadStageLabel(stage: PdfDownloadStage | null): string {
  if (stage === 'generating') return 'Generating PDF… (do not open the file yet)';
  if (stage === 'saving') return 'Saving file…';
  return 'Preparing download…';
}

export default function DownloadReportButton({ files, period, statementId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportStage, setExportStage] = useState<PdfDownloadStage | null>(null);
  const [error, setError] = useState('');

  const hasAll = Boolean(files.bank && files.pos && files.ecommerce);
  const canDownloadMonth = Boolean(statementId || hasAll);
  const isWeek = period === 'Week';
  const isQuarter = period === 'Quarter';

  async function fetchMonthlyCompactPdf() {
    if (statementId) {
      return downloadSavedReportCompact(statementId);
    }
    if (hasAll) {
      return downloadCompactReconciliation(files.bank, files.pos, files.ecommerce);
    }
    throw new Error('Upload bank, POS, and ecommerce files, or open a saved month to download.');
  }

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
    setExportStage(null);
    setError('');
    try {
      if (isWeek) {
        const { data, headers } = await downloadWeekReports(files.bank, files.pos, files.ecommerce);
        const disposition = headers['content-disposition'] as string | undefined;
        const filename = filenameFromDisposition(disposition, 'Weekly_Report.pdf');
        await downloadPdfWithSaveDialog({
          suggestedFilename: filename,
          onStage: setExportStage,
          fetchBlob: async () => new File([data], filename, { type: 'application/pdf' }),
        });
        return;
      }

      const fallbackName = 'Reconciliation_Report.pdf';
      await downloadPdfWithSaveDialog({
        suggestedFilename: fallbackName,
        onStage: setExportStage,
        fetchBlob: async () => {
          const { data, headers } = await fetchMonthlyCompactPdf();
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
      setExportStage(null);
    }
  }

  const label = isWeek
    ? 'Download weekly report (PDF)'
    : 'Download monthly reconciliation report (PDF)';

  const hint = isWeek
    ? 'PDF with Week 1, Week 2, … breakdowns for this statement month.'
    : statementId
      ? 'Compact monthly report from your saved statement (fast — no re-upload).'
      : hasAll
        ? 'Compact monthly report from uploaded files (may take longer while statements are processed).'
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
        {exporting ? downloadStageLabel(exportStage) : label}
      </button>
      {error && (
        <p className={styles.toolbarHint} style={{ color: 'var(--neg)', width: '100%' }}>
          {error}
        </p>
      )}
    </div>
  );
}
