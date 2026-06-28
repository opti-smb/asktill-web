import html2pdf from 'html2pdf.js';

/** Extra rules so html2canvas paints grids, badges, and mix bars reliably. */
const PDF_CAPTURE_CSS = `
  body { background: #eef2f6 !important; }
  .kpi-grid, .channel-grid, .grid-2, .comm-row, .stack { display: block !important; }
  .kpi-cell, .comm-card { display: inline-block !important; vertical-align: top !important; width: 31% !important; margin: 0 1% 8px 0 !important; }
  .badge { display: inline-block !important; }
  .recon-row, .mix-label-table, .variance { display: table !important; width: 100% !important; }
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

  await new Promise((resolve) => window.setTimeout(resolve, 900));
}

function injectPdfCaptureStyles(doc: Document): void {
  const style = doc.createElement('style');
  style.setAttribute('data-pdf-capture', '1');
  style.textContent = PDF_CAPTURE_CSS;
  doc.head.appendChild(style);
}

/** Render server compact-report HTML with the browser engine (matches on-screen layout). */
export async function renderHtmlDocumentToPdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Report PDF preview');
  iframe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:920px',
    'min-height:1400px',
    'border:0',
    'opacity:0.01',
    'pointer-events:none',
    'z-index:-9999',
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
    iframe.style.height = `${Math.min(contentHeight + 60, 32000)}px`;
    iframe.style.width = `${contentWidth + 20}px`;

    await new Promise((resolve) => window.setTimeout(resolve, 400));

    const blob = await html2pdf()
      .set({
        margin: [8, 8, 10, 8],
        filename: 'Reconciliation_Report.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: '#eef2f6',
          windowWidth: contentWidth,
          windowHeight: contentHeight,
          letterRendering: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(target)
      .outputPdf('blob');

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
        await new Promise((resolve) => window.setTimeout(resolve, 1200 * attempt));
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
