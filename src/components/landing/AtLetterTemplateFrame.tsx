import { useCallback, useEffect, useRef } from 'react';

import styles from './landingV2.module.css';

type Props = {
  html: string | null;
  loading: boolean;
  empty?: boolean;
  emptyMessage?: string;
};

function resizeFrame(frame: HTMLIFrameElement | null) {
  if (!frame) return;
  try {
    const doc = frame.contentDocument;
    const height = doc?.documentElement?.scrollHeight ?? doc?.body?.scrollHeight;
    if (height && height > 0) {
      frame.style.height = `${height}px`;
    }
  } catch {
    frame.style.height = '720px';
  }
}

export default function AtLetterTemplateFrame({ html, loading, empty, emptyMessage }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const onLoad = useCallback(() => {
    resizeFrame(frameRef.current);
  }, []);

  useEffect(() => {
    if (!html) return;
    const timer = window.setTimeout(() => resizeFrame(frameRef.current), 120);
    return () => window.clearTimeout(timer);
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
        onLoad={onLoad}
      />
    </div>
  );
}
