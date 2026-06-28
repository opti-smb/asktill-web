import { useState } from 'react';
import {
  downloadCompactReconciliation,
  downloadMonthlyReportPdf,
  downloadWeekReports,
  getApiErrorAsync,
  getBackendPdfEngine,
  shouldUseClientPdfExport,
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

function downloadStageLabel(stage: PdfDownloadStage | null, clientRendered: boolean): string {
  if (stage === 'fetching') return clientRendered ? 'Loading report…' : 'Downloading PDF…';
  if (stage === 'generating') return clientRendered ? 'Rendering PDF in your browser…' : 'Generating PDF…';
  if (stage === 'opening') return 'Opening PDF…';
  if (stage === 'saving') return 'Saving to Downloads…';
  return 'Preparing download…';
}

export default function DownloadReportButton({ files, period, statementId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportStage, setExportStage] = useState<PdfDownloadStage | null>(null);
  const [error, setError] = useState('');
  const [clientPdf, setClientPdf] = useState<boolean | null>(null);

  const hasAll = Boolean(files.bank && files.pos && files.ecommerce);
  const canDownloadMonth = Boolean(statementId || hasAll);
  const isWeek = period === 'Week';
  const isQuarter = period === 'Quarter';

  async function fetchMonthlyCompactPdf() {
    if (statementId) {
      return downloadMonthlyReportPdf(statementId);
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
      const engine = await getBackendPdfEngine();
      const useClientPdf = shouldUseClientPdfExport(engine);
      setClientPdf(useClientPdf);
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
        prebuilt: Boolean(statementId) && !useClientPdf,
        clientRendered: useClientPdf,
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
      ? 'Same compact reconciliation PDF as local — saved when you analyzed this month.'
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
        {exporting ? downloadStageLabel(exportStage, clientPdf === true) : label}
      </button>
      {error && (
        <p className={styles.toolbarHint} style={{ color: 'var(--neg)', width: '100%' }}>
          {error}
        </p>
      )}
    </div>
  );
}
