async function loadHtml2Pdf() {
  const mod = await import('html2pdf.js');
  return mod.default;
}

function waitForFrameLayout(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    const doc = iframe.contentDocument;
    if (!doc) {
      resolve();
      return;
    }
    const finish = () => window.setTimeout(() => resolve(), 350);
    if (doc.readyState === 'complete') {
      finish();
      return;
    }
    iframe.onload = () => finish();
    window.setTimeout(() => resolve(), 2500);
  });
}

/** Render server compact-report HTML with the browser engine (matches on-screen layout). */
export async function renderHtmlDocumentToPdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Report PDF preview');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:210mm;min-height:297mm;border:0;visibility:hidden';
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
    const html2pdf = await loadHtml2Pdf();
    const blob = await html2pdf()
      .set({
        margin: [6, 6, 8, 6],
        filename: 'Reconciliation_Report.pdf',
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          windowWidth: target.scrollWidth || 794,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(target)
      .outputPdf('blob');

    if (!(blob instanceof Blob) || blob.size < 128) {
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
