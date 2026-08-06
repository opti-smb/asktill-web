import { useState } from 'react';
import {
  downloadCompactReconciliation,
  downloadMonthlyReportPdf,
  downloadSavedWeekReportsPdf,
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
import styles from './DownloadReportButton.module.css';

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
  const canDownloadWeek = Boolean(statementId || hasAll);

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
    if (isWeek && !canDownloadWeek) {
      setError('Upload bank, POS, and ecommerce files, or open a saved month to download.');
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
        const { data, headers } = statementId
          ? await downloadSavedWeekReportsPdf(statementId)
          : await downloadWeekReports(files.bank, files.pos, files.ecommerce);
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

  const disabled = exporting || (isWeek ? !canDownloadWeek : !canDownloadMonth);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.downloadBtn}
        onClick={handleDownload}
        disabled={disabled}
        title={
          disabled && !exporting
            ? 'Upload bank, POS, and ecommerce files, or open a saved month to download.'
            : undefined
        }
      >
        <i className="ti ti-download" aria-hidden />
        {exporting ? downloadStageLabel(exportStage, clientPdf === true) : label}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
