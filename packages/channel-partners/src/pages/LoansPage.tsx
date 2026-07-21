import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { LOAN_HEADINGS, type LoanHeading } from '../data/loanMenu';
import styles from '../styles/channelPartners.module.css';

const HOVER_LEAVE_MS = 120;

export default function LoansPage() {
  const [activeId, setActiveId] = useState(LOAN_HEADINGS[0]?.id ?? 'personal');
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = useMemo(
    () => LOAN_HEADINGS.find((h) => h.id === activeId) ?? LOAN_HEADINGS[0],
    [activeId],
  );

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const showHeading = useCallback(
    (heading: LoanHeading) => {
      clearLeaveTimer();
      setActiveId(heading.id);
    },
    [clearLeaveTimer],
  );

  const scheduleRevert = useCallback(() => {
    clearLeaveTimer();
    leaveTimer.current = setTimeout(() => {
      /* keep last hovered heading visible — no snap-back while browsing panel */
    }, HOVER_LEAVE_MS);
  }, [clearLeaveTimer]);

  if (!active) {
    return (
      <div className={styles.root}>
        <p className={styles.empty}>No loan categories configured.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <Link to="..">Channel partners</Link>
        <span className={styles.crumbSep}>/</span>
        <span>Loans</span>
      </nav>

      <header className={styles.loanHero}>
        <p className={styles.loanHeroEyebrow}>Partner loans</p>
        <h2 className={styles.loanHeroTitle}>Find the right loan path</h2>
        <p className={styles.loanHeroLead}>
          Hover a type to preview options. Tap a product to compare banks and open the lender site.
        </p>
      </header>

      <div
        className={styles.loanShelf}
        onMouseLeave={scheduleRevert}
        onMouseEnter={clearLeaveTimer}
      >
        <div className={styles.loanTabs} role="tablist" aria-label="Loan types">
          {LOAN_HEADINGS.map((heading) => {
            const selected = heading.id === active.id;
            return (
              <button
                key={heading.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`${styles.loanTab} ${selected ? styles.loanTabActive : ''}`}
                onMouseEnter={() => showHeading(heading)}
                onFocus={() => showHeading(heading)}
                onClick={() => showHeading(heading)}
              >
                <span className={styles.loanTabMark} aria-hidden>
                  {heading.mark}
                </span>
                <span className={styles.loanTabText}>{heading.title}</span>
              </button>
            );
          })}
        </div>

        <div
          className={styles.loanStage}
          role="tabpanel"
          aria-label={active.title}
          key={active.id}
        >
          <div className={styles.loanStageHead}>
            <h3 className={styles.loanStageTitle}>{active.title}</h3>
            <p className={styles.loanStageHint}>
              {active.sections.reduce((n, s) => n + s.links.length, 0)} options
            </p>
          </div>

          <div className={styles.loanBuckets}>
            {active.sections.map((section) => (
              <section key={section.title} className={styles.loanBucket}>
                <h4 className={styles.loanBucketTitle}>{section.title}</h4>
                <ul className={styles.loanOptionList}>
                  {section.links.map((link) => (
                    <li key={link.id}>
                      <Link to={link.productId} className={styles.loanOption}>
                        <span className={styles.loanOptionLabel}>{link.label}</span>
                        <span className={styles.loanOptionGo} aria-hidden>
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
