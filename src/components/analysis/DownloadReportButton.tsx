import { useState } from 'react';
import {
  downloadReconciliation,
  downloadWeekReports,
  getApiErrorAsync,
  type UploadFiles,
} from '../../lib/api';
import { filenameFromDisposition, saveBlobDownload } from '../../lib/downloadReport';
import type { Period } from '../../types';
import styles from './PostmanPanels.module.css';

interface Props {
  files: UploadFiles;
  period: Period;
}

export default function DownloadReportButton({ files, period }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const hasAll = Boolean(files.bank && files.pos && files.ecommerce);
  const isWeek = period === 'Week';
  const isQuarter = period === 'Quarter';

  async function handleDownload() {
    if (!hasAll) {
      setError('Upload bank, POS, and ecommerce files to download.');
      return;
    }
    if (isQuarter) {
      setError('Quarterly PDF export is not available yet. Use Month or Week.');
      return;
    }

    setExporting(true);
    setError('');
    try {
      const { data, headers } = isWeek
        ? await downloadWeekReports(files.bank, files.pos, files.ecommerce)
        : await downloadReconciliation(files.bank, files.pos, files.ecommerce);
      const disposition = headers['content-disposition'] as string | undefined;
      const defaultName = isWeek ? 'Weekly_Report.pdf' : 'Reconciliation_Report.pdf';
      const filename = filenameFromDisposition(disposition, defaultName);
      saveBlobDownload(data, filename);
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
    : 'Same reconciliation report as Postman POST /api/analyze/export (PDF).';

  return (
    <div className={styles.toolbar}>
      <p className={styles.toolbarHint}>{hint}</p>
      <button
        type="button"
        className={styles.downloadBtn}
        onClick={handleDownload}
        disabled={exporting || !hasAll || isQuarter}
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
