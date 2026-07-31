/**
 * Re-export — PDF capture lives in services/ (I/O / DOM), not pure lib/.
 * Prefer importing from `../services/pdfExportService` in new code.
 */
export {
  renderHtmlDocumentToPdfBlob,
  renderHtmlDocumentToPdfBlobWithRetry,
  pdfFilenameFromHtml,
} from '../services/pdfExportService';
