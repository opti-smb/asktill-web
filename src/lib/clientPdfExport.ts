import html2pdf from 'html2pdf.js';

async function waitForFrameLayout(iframe: HTMLIFrameElement): Promise<void> {
  const doc = iframe.contentDocument;
  if (!doc) return;

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.onload = () => resolve();
    window.setTimeout(() => resolve(), 3000);
  });

  try {
    await doc.fonts.ready;
  } catch {
    /* ignore */
  }

  // Let tables and webfonts finish layout — hidden iframes skip paint in some browsers.
  await new Promise((resolve) => window.setTimeout(resolve, 450));
}

/** Render server compact-report HTML with the browser engine (matches on-screen layout). */
export async function renderHtmlDocumentToPdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Report PDF preview');
  // Must NOT use visibility:hidden — html2canvas skips non-painted nodes and yields blank PDFs.
  iframe.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:900px',
    'min-height:1200px',
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
    await waitForFrameLayout(iframe);

    const target = (doc.querySelector('.page') ?? doc.body) as HTMLElement;
    const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, 800);
    const contentWidth = Math.max(target.scrollWidth, target.offsetWidth, 860);
    iframe.style.height = `${Math.min(contentHeight + 40, 32000)}px`;

    await new Promise((resolve) => window.setTimeout(resolve, 200));

    const blob = await html2pdf()
      .set({
        margin: [6, 6, 8, 6],
        filename: 'Reconciliation_Report.pdf',
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 1.25,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: '#eef2f6',
          windowWidth: contentWidth,
          windowHeight: contentHeight,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(target)
      .outputPdf('blob');

    if (!(blob instanceof Blob) || blob.size < 4096) {
      throw new Error('PDF export produced an empty file.');
    }
    return blob;
  } finally {
    iframe.remove();
  }
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
