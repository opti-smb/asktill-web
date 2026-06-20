import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAtLetterPreview } from '../../hooks/useAtLetterPreview';
import { atLetterMailtoUrl } from '../../lib/atLetterPreview';
import styles from './landingV2.module.css';

const CHECKS = [
  {
    title: 'Delivered every month',
    desc: 'Auto-generated after each statement upload.',
  },
  {
    title: 'Written for owners, not accountants',
    desc: 'No formulas, no ratios. Just what it means for you.',
  },
  {
    title: 'One thing to act on',
    desc: 'Every letter ends with one specific recommendation.',
  },
  {
    title: 'Shareable with your CPA',
    desc: 'Forward from your inbox in one click.',
  },
];

export default function AtLetterSection() {
  const { isAuth } = useAuth();
  const { letter, loading, error, isSample } = useAtLetterPreview();

  const canUseLetterActions = letter.mode === 'live' && !isSample;
  const canForward = canUseLetterActions;

  const leftCta =
    letter.mode === 'live' ? (
      isAuth ? (
        <Link to="/dashboard/overview" className={styles.btnP}>
          View full analysis →
        </Link>
      ) : (
        <Link to="/login" className={styles.btnP}>
          Sign in to open your letter →
        </Link>
      )
    ) : letter.mode === 'empty' ? (
      isAuth ? (
        <Link to="/onboarding" className={styles.btnP}>
          Upload to get your letter →
        </Link>
      ) : (
        <Link to="/login" className={styles.btnP}>
          Sign in to view your letter →
        </Link>
      )
    ) : (
      <a href="#at-letter" className={styles.btnP}>
        See a sample letter →
      </a>
    );

  const forwardLetter = useCallback(() => {
    window.location.href = atLetterMailtoUrl(letter);
  }, [letter]);

  return (
    <section className={styles.letterSection} id="at-letter">
      <div className="wrap">
        <div className={styles.lbl}>The AT Letter</div>
        <div className={styles.letterGrid}>
          <div>
            <h2 className={styles.h2}>Your finances in plain English. Every month.</h2>
            <p className={styles.bodyLg} style={{ marginBottom: 32 }}>
              No dashboards to interpret. No jargon. A clear, honest monthly summary — and one thing
              to act on.
            </p>
            <div className={styles.letterChecks}>
              {CHECKS.map((item) => (
                <div key={item.title} className={styles.lcheck}>
                  <div className={styles.ic} style={{ marginTop: 2 }}>
                    <i className="ti ti-check" aria-hidden="true" />
                  </div>
                  <div>
                    <div className={styles.lcheckTitle}>{item.title}</div>
                    <div className={styles.lcheckDesc}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {leftCta}
          </div>

          <div className={styles.letterCard}>
            <div className={styles.letterHead}>
              <div className={styles.letterLogo}>
                <div className={styles.letterLogoIcon}>
                  <i className="ti ti-chart-bar" aria-hidden="true" />
                </div>
                <div className={styles.letterLogoText}>
                  ask<span>till</span>
                </div>
              </div>
              <span className={styles.letterDate}>
                {loading ? 'Loading…' : letter.letterDateLabel}
                {isSample ? (
                  <span className={styles.letterSampleTag}> · Sample</span>
                ) : letter.mode === 'live' ? (
                  <span className={styles.letterLiveTag}>
                    {' · '}
                    {isAuth ? 'Yours' : 'Yours (sign in)'}
                  </span>
                ) : letter.mode === 'empty' && isAuth ? (
                  <span className={styles.letterLiveTag}> · Welcome</span>
                ) : null}
              </span>
            </div>
            <div className={styles.letterBody}>
              {isSample ? (
                <p className={styles.letterSign} style={{ marginBottom: 12, color: '#5a6478' }}>
                  Sample letter for new visitors.{' '}
                  <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
                    Sign in
                  </Link>{' '}
                  to see yours after you upload.
                </p>
              ) : null}
              {error && isAuth ? (
                <p className={styles.letterSign} style={{ color: '#a32d2d', marginBottom: 12 }}>
                  {error} Sign in and ensure the backend API URL is configured in production.
                </p>
              ) : null}
              <p className={styles.letterGreeting}>Hi {letter.firstName},</p>
              <p className={styles.letterPara}>{letter.periodIntro}</p>
              {letter.mode === 'empty' ? (
                <div className={styles.statEmpty}>
                  <div className={styles.statEmptyTitle}>Your numbers go here</div>
                  <p>
                    {isAuth ? (
                      <>
                        Upload bank, POS, and ecommerce for one month — then{' '}
                        <strong>Brought in</strong>, <strong>Spent</strong>, and <strong>Kept</strong>{' '}
                        fill in from your statements.
                      </>
                    ) : (
                      <>
                        <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
                          Sign in
                        </Link>{' '}
                        or upload your first month to see <strong>Brought in</strong>,{' '}
                        <strong>Spent</strong>, and <strong>Kept</strong> here.
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className={styles.statGrid}>
                  <div className={styles.statBox}>
                    <div className={styles.statLbl}>Brought in</div>
                    <div className={styles.statVal}>{letter.broughtIn}</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statLbl}>Spent</div>
                    <div className={styles.statVal}>{letter.spent}</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statLbl}>Kept</div>
                    <div className={styles.statVal}>{letter.kept}</div>
                  </div>
                </div>
              )}
              {letter.summary ? (
                <p className={styles.letterPara}>
                  {letter.summaryEmphasis ? (
                    <>
                      That&apos;s your{' '}
                      <strong style={{ fontWeight: 600 }}>{letter.summaryEmphasis}</strong>{' '}
                      {letter.summary}
                    </>
                  ) : (
                    letter.summary
                  )}
                </p>
              ) : null}
              {letter.mode !== 'empty' && letter.watchTitle && letter.watchText ? (
                <div className={styles.calloutRed}>
                  <div className={styles.calloutRedTitle}>{letter.watchTitle}</div>
                  <p>{letter.watchText}</p>
                </div>
              ) : null}
              {letter.actionTitle && letter.actionText ? (
                <div className={styles.calloutBlue}>
                  <div className={styles.calloutBlueTitle}>{letter.actionTitle}</div>
                  <p>
                    {letter.mode === 'empty' && isAuth ? (
                      <Link to="/onboarding" style={{ color: 'inherit', fontWeight: 600 }}>
                        {letter.actionText}
                      </Link>
                    ) : letter.mode === 'empty' && !isAuth ? (
                      <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
                        {letter.actionText}
                      </Link>
                    ) : (
                      letter.actionText
                    )}
                  </p>
                </div>
              ) : null}
              <p className={styles.letterPara} style={{ marginBottom: 3 }}>
                {letter.closingLine}
              </p>
              <p className={styles.letterSign}>— Asktill</p>
              <div className={styles.letterFooter}>
                <span>{letter.footerMeta}</span>
                <div className={styles.letterFooterBtns}>
                  {canForward ? (
                    <button type="button" onClick={forwardLetter} title="Open your email app with this letter">
                      Forward
                    </button>
                  ) : (
                    <button type="button" disabled title="Available after your first upload">
                      Forward
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
