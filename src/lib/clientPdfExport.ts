import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Preserve full report styling (gradients, shadows, grids) while fixing html2canvas gaps. */
const PDF_CAPTURE_CSS = `
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body { background: #eef2f6 !important; margin: 0 !important; }
  .page { background: #eef2f6 !important; }
  .mix-bar-bg { background: #e2e8f0 !important; border-radius: 3px !important; overflow: hidden !important; }
  .mix-bar-bg div { border-radius: 3px !important; min-height: 5px !important; }
  .mix-fill-card { background: #2563eb !important; }
  .mix-fill-cash { background: #0d9488 !important; }
`;

const CAPTURE_WIDTH_PX = 980;
const JPEG_QUALITY = 0.97;
const PDF_MARGIN_MM = 6;

async function waitForFrameLayout(iframe: HTMLIFrameElement): Promise<void> {
  const doc = iframe.contentDocument;
  if (!doc) return;

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.onload = () => resolve();
    window.setTimeout(() => resolve(), 5000);
  });

  try {
    await doc.fonts.ready;
  } catch {
    /* ignore */
  }

  await new Promise((resolve) => window.setTimeout(resolve, 1500));
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
  const sample = ctx.getImageData(0, 0, Math.min(canvas.width, 160), Math.min(canvas.height, 160)).data;
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

/** Slice a tall canvas into clean A4 pages (no white gaps between sections). */
function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const printW = pageW - PDF_MARGIN_MM * 2;
  const printH = pageH - PDF_MARGIN_MM * 2;

  const imgW = canvas.width;
  const imgH = canvas.height;
  const pageSlicePx = Math.max(1, Math.floor(imgW * (printH / printW)));

  let yOffset = 0;
  let pageIndex = 0;

  while (yOffset < imgH) {
    const sliceH = Math.min(pageSlicePx, imgH - yOffset);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgW;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not prepare PDF pages.');
    }
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, imgW, sliceH);
    ctx.drawImage(canvas, 0, yOffset, imgW, sliceH, 0, 0, imgW, sliceH);

    const sliceMmH = (sliceH / imgW) * printW;
    const imgData = pageCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', PDF_MARGIN_MM, PDF_MARGIN_MM, printW, sliceMmH);

    yOffset += sliceH;
    pageIndex += 1;
  }

  return pdf.output('blob');
}

function captureScale(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(3, Math.max(2.5, dpr * 1.25));
}

/** Render server compact-report HTML with the browser engine (full CSS from iframe). */
export async function renderHtmlDocumentToPdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Report PDF preview');
  iframe.style.cssText = [
    'position:fixed',
    'left:-14000px',
    'top:0',
    `width:${CAPTURE_WIDTH_PX}px`,
    'min-height:1600px',
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
    const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, 1200);
    const contentWidth = Math.max(target.scrollWidth, target.offsetWidth, CAPTURE_WIDTH_PX - 40);
    iframe.style.height = `${Math.min(contentHeight + 120, 48000)}px`;
    iframe.style.width = `${contentWidth + 32}px`;

    await new Promise((resolve) => window.setTimeout(resolve, 800));

    const scale = captureScale();
    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      logging: false,
      letterRendering: true,
      backgroundColor: '#eef2f6',
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      width: contentWidth,
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.textContent = PDF_CAPTURE_CSS;
        clonedDoc.head.appendChild(style);
      },
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
