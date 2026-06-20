import { downloadAtLetterPdf, getApiErrorAsync } from './api';
import { downloadPdfWithSaveDialog, filenameFromDisposition } from './downloadReport';

export async function downloadAtLetterPdfById(statementId: string): Promise<void> {
  await downloadPdfWithSaveDialog({
    suggestedFilename: 'asktill-at-letter.pdf',
    fetchBlob: async () => {
      const res = await downloadAtLetterPdf(statementId);
      const name = filenameFromDisposition(
        res.headers['content-disposition'] as string | undefined,
        'asktill-at-letter.pdf',
      );
      return new File([res.data], name, { type: 'application/pdf' });
    },
  });
}

export async function downloadAtLetterPdfByIdSafe(
  statementId: string,
  onError?: (message: string) => void,
): Promise<boolean> {
  try {
    await downloadAtLetterPdfById(statementId);
    return true;
  } catch (err) {
    onError?.(await getApiErrorAsync(err, 'Could not download AT Letter PDF.'));
    return false;
  }
}
