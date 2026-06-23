async function ensurePdfBlob(data: Blob): Promise<Blob> {
  const head = new Uint8Array(await data.slice(0, 5).arrayBuffer());
  const isPdf =
    head.length >= 4 &&
    head[0] === 0x25 &&
    head[1] === 0x50 &&
    head[2] === 0x44 &&
    head[3] === 0x46;
  if (isPdf) {
    return data.type === 'application/pdf'
      ? data
      : new Blob([data], { type: 'application/pdf' });
  }

  const text = await data.text();
  try {
    const json = JSON.parse(text) as { detail?: unknown; message?: string; error?: string };
    const detail = json.detail ?? json.message ?? json.error;
    if (typeof detail === 'string' && detail.trim()) {
      throw new Error(detail);
    }
  } catch (parseErr) {
    if (parseErr instanceof Error && parseErr.message !== text) {
      throw parseErr;
    }
  }
  throw new Error('Download failed — the server did not return a PDF.');
}

/** Save to Downloads — no File System Access API (avoids Windows zero-byte files). */
export function saveBlobDownload(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Open PDF in the browser viewer so it is readable before the file is saved. */
export function openPdfBlobInNewTab(data: Blob): boolean {
  const url = URL.createObjectURL(data);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return opened != null;
}

/**
 * AT Letter / report PDF: generate on server, open in browser, then save to Downloads.
 * Skips showSaveFilePicker — on Windows that creates an empty file at the chosen path
 * while Playwright renders (~15–20s), which causes "We can't open this file".
 */
export type PdfDownloadStage = 'generating' | 'saving' | 'opening';

export async function downloadPdfWithSaveDialog(options: {
  suggestedFilename: string;
  fetchBlob: () => Promise<Blob>;
  onStage?: (stage: PdfDownloadStage) => void;
  /** When true (default), open the PDF in a new tab after generation. */
  openAfterDownload?: boolean;
}): Promise<void> {
  options.onStage?.('generating');
  const blob = await options.fetchBlob();
  options.onStage?.('saving');
  const pdf = await ensurePdfBlob(blob);

  const openAfter = options.openAfterDownload !== false;
  if (openAfter) {
    options.onStage?.('opening');
    openPdfBlobInNewTab(pdf);
  }

  saveBlobDownload(pdf, options.suggestedFilename);
}

export function filenameFromDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match?.[1] || fallback;
}
