import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Match Playwright compact PDF: A4 @page margins from recon_report_compact.html */
const PAGE_CONTENT_MAX_PX = 860;
const PDF_MARGIN_X_MM = 7;
const PDF_MARGIN_Y_MM = 8;
const IMAGE_FORMAT = 'JPEG' as const;
const JPEG_QUALITY = 0.92;

/** Crisp text and colors for high-DPI canvas capture. */
const PDF_CAPTURE_CSS = `
  html, body, * {
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    text-rendering: geometricPrecision !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
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
    window.setTimeout(() => resolve(), 5000);
  });

  try {
    await doc.fonts.ready;
  } catch {
    /* ignore */
  }

  await new Promise((resolve) => window.setTimeout(resolve, 2000));
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

/** A4 slice height in canvas pixels — same ratio as Playwright @page 8mm/7mm margins. */
function a4SliceHeightPx(canvasWidth: number): number {
  const pageW = 210;
  const pageH = 297;
  const printW = pageW - PDF_MARGIN_X_MM * 2;
  const printH = pageH - PDF_MARGIN_Y_MM * 2;
  return Math.max(1, Math.floor(canvasWidth * (printH / printW)));
}

function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const printW = pageW - PDF_MARGIN_X_MM * 2;

  const imgW = canvas.width;
  const imgH = canvas.height;
  const pageSlicePx = a4SliceHeightPx(imgW);

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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, imgW, sliceH);
    ctx.drawImage(canvas, 0, yOffset, imgW, sliceH, 0, 0, imgW, sliceH);

    const sliceMmH = (sliceH / imgW) * printW;
    const imgData = pageCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(
      imgData,
      IMAGE_FORMAT,
      PDF_MARGIN_X_MM,
      PDF_MARGIN_Y_MM,
      printW,
      sliceMmH,
      undefined,
      'FAST',
    );

    yOffset += sliceH;
    pageIndex += 1;
  }

  return pdf.output('blob');
}

/** ~200 DPI — sharp enough for reports without 70MB PNG exports. */
function captureScale(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(2.5, Math.max(2, dpr));
}

/** Render server compact-report HTML with the browser engine (full CSS from iframe). */
export async function renderHtmlDocumentToPdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Report PDF preview');
  iframe.style.cssText = [
    'position:fixed',
    'left:-14000px',
    'top:0',
    `width:${PAGE_CONTENT_MAX_PX + 40}px`,
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

    const pageEl = doc.querySelector('.page') as HTMLElement | null;
    const target = (pageEl ?? doc.body) as HTMLElement;
    const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, 1400);
    const contentWidth = Math.max(
      target.scrollWidth,
      target.offsetWidth,
      PAGE_CONTENT_MAX_PX,
    );
    iframe.style.height = `${Math.min(contentHeight + 160, 48000)}px`;
    iframe.style.width = `${contentWidth + 40}px`;

    await new Promise((resolve) => window.setTimeout(resolve, 1200));

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
