/** Client-side upload guards (UX / DoS reduction — server still enforces). */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.xls', '.tsv']);

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

function bytesStartWith(buf: Uint8Array, ascii: string): boolean {
  if (buf.length < ascii.length) return false;
  for (let i = 0; i < ascii.length; i += 1) {
    if (buf[i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

/** Sniff magic bytes; returns false when the payload clearly mismatches the extension. */
async function magicBytesMatch(file: File, ext: string): Promise<boolean> {
  const slice = file.slice(0, 8);
  const buf = new Uint8Array(await slice.arrayBuffer());
  if (ext === '.pdf') return bytesStartWith(buf, '%PDF');
  if (ext === '.xlsx') {
    // ZIP container (OOXML)
    return buf[0] === 0x50 && buf[1] === 0x4b;
  }
  if (ext === '.xls') {
    // OLE Compound Document
    return (
      buf[0] === 0xd0
      && buf[1] === 0xcf
      && buf[2] === 0x11
      && buf[3] === 0xe0
    );
  }
  if (ext === '.csv' || ext === '.tsv') {
    // Reject obvious binaries; allow UTF-8 BOM / printable text.
    if (buf[0] === 0x50 && buf[1] === 0x4b) return false; // zip pretending to be csv
    if (buf[0] === 0xd0 && buf[1] === 0xcf) return false; // OLE
    if (bytesStartWith(buf, '%PDF')) return false;
    return true;
  }
  return true;
}

/**
 * Validate a single upload file. Returns an error message, or null when acceptable.
 */
export async function validateUploadFile(file: File): Promise<string | null> {
  if (!file || !(file instanceof File)) {
    return 'Please choose a valid file.';
  }
  if (file.size <= 0) {
    return 'That file is empty. Choose a statement export and try again.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return `File is too large (max ${mb} MB). Compress or export a smaller statement.`;
  }
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'Unsupported file type. Use PDF, CSV, TSV, XLS, or XLSX.';
  }
  try {
    const ok = await magicBytesMatch(file, ext);
    if (!ok) {
      return `File contents do not match a ${ext.slice(1).toUpperCase()} statement. Check the file and try again.`;
    }
  } catch {
    return 'Could not read that file. Try another export.';
  }
  return null;
}
