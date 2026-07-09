import { useCallback, useEffect, useRef } from 'react';

import styles from './landingV2.module.css';

type Props = {
  html: string | null;
  loading: boolean;
  empty?: boolean;
  emptyMessage?: string;
};

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

function resizeFrame(frame: HTMLIFrameElement | null) {
  if (!frame) return;
  try {
    const doc = frame.contentDocument;
    lockIframeScroll(doc);
    const height = Math.max(
      doc?.documentElement?.scrollHeight ?? 0,
      doc?.body?.scrollHeight ?? 0,
    );
    if (height > 0) {
      // Slight buffer avoids a 1px native iframe scrollbar under the letter box.
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
    const timers = [120, 400, 1000].map((ms) =>
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
