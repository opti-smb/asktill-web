import styles from './SourcesStrip.module.css';

export default function SourcesStrip() {
  return (
    <section className={styles.sources}>
      <div className="wrap">
        <div className={styles.sourcesInner}>
          <div className={styles.sourceBox}>
            <div className={styles.sourceBoxIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className={styles.sourceBoxLabel}>Bank</div>
            <div className={styles.sourceBoxSub}>Statements, deposits</div>
          </div>
          <div className={styles.sourceArrow}>→</div>
          <div className={styles.sourceBox}>
            <div className={styles.sourceBoxIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div className={styles.sourceBoxLabel}>POS</div>
            <div className={styles.sourceBoxSub}>Square, Toast, Clover</div>
          </div>
          <div className={styles.sourceArrow}>→</div>
          <div className={styles.sourceBox}>
            <div className={styles.sourceBoxIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
              </svg>
            </div>
            <div className={styles.sourceBoxLabel}>Ecommerce</div>
            <div className={styles.sourceBoxSub}>Shopify, Stripe</div>
          </div>
          <div className={styles.sourceArrow}>→</div>
          <div className={styles.aiPill}>
            <div className={styles.aiPillLabel}>AskTill AI</div>
            <div className={styles.aiPillSub}>PLAIN ENGLISH</div>
          </div>
        </div>
      </div>
    </section>
  );
}
