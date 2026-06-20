/** Pick save location while the click is still a user gesture (before long PDF generation). */
export async function pickPdfSaveHandle(
  suggestedName: string,
): Promise<FileSystemFileHandle | null> {
  if (!('showSaveFilePicker' in window)) return null;
  try {
    const picker = window.showSaveFilePicker as (options: {
      suggestedName: string;
      types: Array<{ accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
    return await picker({
      suggestedName,
      types: [{ accept: { 'application/pdf': ['.pdf'] } }],
    });
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return null;
    return null;
  }
}

async function ensurePdfBlob(data: Blob): Promise<Blob> {
  if (data.type === 'application/pdf') return data;
  const head = new Uint8Array(await data.slice(0, 5).arrayBuffer());
  const isPdf =
    head.length >= 4 &&
    head[0] === 0x25 &&
    head[1] === 0x50 &&
    head[2] === 0x44 &&
    head[3] === 0x46;
  if (isPdf) return data;

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

/** Save PDF after async fetch — use saveHandle from pickPdfSaveHandle when generation is slow. */
export async function savePdfBlob(
  data: Blob,
  filename: string,
  saveHandle?: FileSystemFileHandle | null,
): Promise<void> {
  const pdf = await ensurePdfBlob(data);
  if (saveHandle) {
    const writable = await saveHandle.createWritable();
    await writable.write(pdf);
    await writable.close();
    return;
  }
  saveBlobDownload(pdf, filename);
}

/**
 * AT Letter / report PDF: open save dialog immediately, then fetch and write.
 * Avoids browsers blocking download after long Playwright PDF generation (~15–20s).
 */
export async function downloadPdfWithSaveDialog(options: {
  suggestedFilename: string;
  fetchBlob: () => Promise<Blob>;
}): Promise<void> {
  const saveHandle = await pickPdfSaveHandle(options.suggestedFilename);
  const blob = await options.fetchBlob();
  await savePdfBlob(blob, options.suggestedFilename, saveHandle);
}

export function filenameFromDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match?.[1] || fallback;
}
