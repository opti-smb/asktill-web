import { useCallback, useEffect, useRef } from 'react';

import styles from './landingV2.module.css';

type Props = {
  html: string | null;
  loading: boolean;
  empty?: boolean;
  emptyMessage?: string;
};

const INTER_STACK =
  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function lockIframeScroll(doc: Document | null | undefined) {
  if (!doc) return;
  const root = doc.documentElement;
  const body = doc.body;
  if (root) {
    root.style.overflow = 'hidden';
    root.style.height = 'auto';
  }
  if (body) {
    body.style.overflow = 'hidden';
    body.style.height = 'auto';
    body.style.margin = '0';
  }
}

/** Inject fonts into the letter iframe (srcDoc often fails to load Google Fonts alone). */
function injectInterIntoLetter(doc: Document | null | undefined) {
  if (!doc?.head) return;
  if (!doc.getElementById('asktill-inter-link')) {
    const link = doc.createElement('link');
    link.id = 'asktill-inter-link';
    link.rel = 'stylesheet';
    link.href = `${window.location.origin}/fonts/inter.css`;
    doc.head.prepend(link);
  }
  if (!doc.getElementById('asktill-serif-link')) {
    const serif = doc.createElement('link');
    serif.id = 'asktill-serif-link';
    serif.rel = 'stylesheet';
    serif.href =
      'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap';
    doc.head.appendChild(serif);
  }
  if (!doc.getElementById('asktill-inter-force')) {
    const style = doc.createElement('style');
    style.id = 'asktill-inter-force';
    style.textContent = `
      html, body, .page,
      h1, h2, h3, h4, h5, h6,
      p, span, div, li, a, label, button, input, select, textarea,
      table, th, td, .chart-title, .chart-label, .section-title, .prose,
      .kpi-label, .kpi-value, .kpi-sub, .health-aside-title, .health-look-title,
      .health-look-value {
        font-family: ${INTER_STACK} !important;
      }
      /* GoldenBear-style editorial headline + brand */
      .health-sentence,
      .hdr-company {
        font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif !important;
      }
      text, tspan {
        font-family: Inter, system-ui, sans-serif !important;
      }
    `;
    doc.head.appendChild(style);
  }
  doc.querySelectorAll('text, tspan').forEach((el) => {
    el.setAttribute('font-family', 'Inter, system-ui, sans-serif');
  });
  if (doc.documentElement) doc.documentElement.style.fontFamily = INTER_STACK;
  if (doc.body) doc.body.style.fontFamily = INTER_STACK;
}

function resizeFrame(frame: HTMLIFrameElement | null) {
  if (!frame) return;
  try {
    const doc = frame.contentDocument;
    injectInterIntoLetter(doc);
    lockIframeScroll(doc);
    const height = Math.max(
      doc?.documentElement?.scrollHeight ?? 0,
      doc?.body?.scrollHeight ?? 0,
    );
    if (height > 0) {
      frame.style.height = `${height + 2}px`;
    }
  } catch {
    frame.style.height = '720px';
  }
}

export default function AtLetterTemplateFrame({ html, loading, empty, emptyMessage }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const syncFrame = useCallback(() => {
    const frame = frameRef.current;
    resizeFrame(frame);
    observerRef.current?.disconnect();
    observerRef.current = null;
    const body = frame?.contentDocument?.body;
    if (!body || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => resizeFrame(frame));
    observer.observe(body);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!html) return;
    const timers = [120, 400, 1000, 2000].map((ms) =>
      window.setTimeout(() => resizeFrame(frameRef.current), ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [html]);

  if (loading) {
    return (
      <div className={styles.letterTemplateViewport}>
        <div className={styles.letterTemplateLoading}>Loading your AT Letter…</div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={styles.letterTemplateViewport}>
        <div className={styles.letterTemplateEmpty}>
          <div className={styles.letterTemplateEmptyTitle}>Your AT Letter is ready after upload</div>
          <p>
            {emptyMessage ??
              'Upload bank + POS + ecommerce statements to generate your Monthly Business Review — the same full letter you see in the sample, with your numbers, charts, and reconciliation.'}
          </p>
        </div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className={styles.letterTemplateViewport}>
        <div className={styles.letterTemplateLoading}>AT Letter preview unavailable.</div>
      </div>
    );
  }

  return (
    <div className={styles.letterTemplateViewport}>
      <iframe
        ref={frameRef}
        title="AT Letter — Monthly Business Review"
        className={styles.letterTemplateFrame}
        srcDoc={html}
        sandbox="allow-same-origin"
        scrolling="no"
        onLoad={syncFrame}
      />
    </div>
  );
}
