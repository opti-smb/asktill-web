import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Extra rules so html2canvas paints grids, badges, and mix bars reliably. */
const PDF_CAPTURE_CSS = `
  body { background: #eef2f6 !important; margin: 0 !important; }
  .kpi-grid, .channel-grid, .grid-2, .comm-row, .stack { display: block !important; }
  .kpi-cell, .comm-card { display: inline-block !important; vertical-align: top !important; width: 31% !important; margin: 0 1% 8px 0 !important; }
  .badge { display: inline-block !important; }
  .mix-bar-bg { background: #e2e8f0 !important; height: 6px !important; }
  .mix-fill-card { background: #2563eb !important; min-height: 6px !important; display: block !important; }
  .mix-fill-cash { background: #0d9488 !important; min-height: 6px !important; display: block !important; }
  .card, .channel-panel, .kpi { box-shadow: none !important; }
`;

async function waitForFrameLayout(iframe: HTMLIFrameElement): Promise<void> {
  const doc = iframe.contentDocument;
  if (!doc) return;

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.onload = () => resolve();
    window.setTimeout(() => resolve(), 4000);
  });

  try {
    await doc.fonts.ready;
  } catch {
    /* ignore */
  }

  await new Promise((resolve) => window.setTimeout(resolve, 1000));
}

function injectPdfCaptureStyles(doc: Document): void {
  const style = doc.createElement('style');
  style.setAttribute('data-pdf-capture', '1');
  style.textContent = PDF_CAPTURE_CSS;
  doc.head.appendChild(style);
}

function canvasHasContent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width < 2 || canvas.height < 2) return false;
  const sample = ctx.getImageData(0, 0, Math.min(canvas.width, 120), Math.min(canvas.height, 120)).data;
  for (let i = 0; i < sample.length; i += 4) {
    const r = sample[i];
    const g = sample[i + 1];
    const b = sample[i + 2];
    const a = sample[i + 3];
    if (a > 0 && (r < 250 || g < 250 || b < 250)) {
      return true;
    }
  }
  return false;
}

function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const marginMm = 8;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginMm * 2;
  const usableHeight = pageHeight - marginMm * 2;
  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  let heightLeft = imgHeight;
  let y = marginMm;

  pdf.addImage(imgData, 'JPEG', marginMm, y, imgWidth, imgHeight);
  heightLeft -= usableHeight;

  while (heightLeft > 0) {
    y = marginMm - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', marginMm, y, imgWidth, imgHeight);
    heightLeft -= usableHeight;
  }

  return pdf.output('blob');
}

/** Render server compact-report HTML with the browser engine (full CSS from iframe). */
export async function renderHtmlDocumentToPdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Report PDF preview');
  // Off-screen but fully painted — opacity:hidden breaks html2canvas.
  iframe.style.cssText = [
    'position:fixed',
    'left:-12000px',
    'top:0',
    'width:920px',
    'min-height:1400px',
    'border:0',
    'opacity:1',
    'visibility:visible',
    'pointer-events:none',
    'z-index:-1',
  ].join(';');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error('Could not prepare the report for PDF export.');
    }
    doc.open();
    doc.write(html);
    doc.close();
    injectPdfCaptureStyles(doc);
    await waitForFrameLayout(iframe);

    const target = (doc.querySelector('.page') ?? doc.body) as HTMLElement;
    const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, 900);
    const contentWidth = Math.max(target.scrollWidth, target.offsetWidth, 880);
    iframe.style.height = `${Math.min(contentHeight + 80, 32000)}px`;
    iframe.style.width = `${contentWidth + 24}px`;

    await new Promise((resolve) => window.setTimeout(resolve, 500));

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#eef2f6',
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      width: contentWidth,
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
      ...(iframe.contentWindow ? { window: iframe.contentWindow } : {}),
    } as Parameters<typeof html2canvas>[1]);

    if (!canvasHasContent(canvas)) {
      throw new Error('PDF export captured a blank page.');
    }

    const blob = canvasToPdfBlob(canvas);
    if (!(blob instanceof Blob) || blob.size < 20_000) {
      throw new Error('PDF export produced an empty or invalid file.');
    }
    return blob;
  } finally {
    iframe.remove();
  }
}

export async function renderHtmlDocumentToPdfBlobWithRetry(
  html: string,
  attempts = 2,
): Promise<Blob> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
      }
      return await renderHtmlDocumentToPdfBlob(html);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error('Could not render the styled PDF in your browser.');
}

export function pdfFilenameFromHtml(html: string, fallback = 'Reconciliation_Report.pdf'): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const raw = titleMatch?.[1]?.trim() ?? '';
  const cleaned = raw
    .replace(/^Reconciliation\s*[—-]\s*/i, '')
    .replace(/[^\w\s-]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
  if (!cleaned) return fallback;
  return `${cleaned}_Reconciliation.pdf`;
}
