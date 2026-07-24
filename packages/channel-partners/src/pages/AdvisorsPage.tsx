import { Link } from 'react-router-dom';

import { usePartnersCallbacks } from '../PartnersCallbacks';
import { TAX_ADVISORS } from '../data/advisors';
import styles from '../styles/channelPartners.module.css';

export default function AdvisorsPage() {
  const { onBookAdvisor } = usePartnersCallbacks();

  return (
    <div className={styles.root}>
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <Link to="..">Channel partners</Link>
        <span className={styles.crumbSep}>/</span>
        <span>CPAs & Tax Advisors</span>
      </nav>

      <header className={styles.loanHero}>
        <p className={styles.loanHeroEyebrow}>Partner advisors</p>
        <h2 className={styles.loanHeroTitle}>CPAs & Tax Advisors</h2>
        <p className={styles.loanHeroLead}>
          Book a consultation with verified CPAs for bookkeeping, tax filing, and financial
          planning. You can redeem AT Rewards wallet points toward the session.
        </p>
      </header>

      <div className={styles.advisorList}>
        {TAX_ADVISORS.map((advisor) => (
          <article key={advisor.id} className={styles.advisorCard}>
            <div className={styles.advisorHead}>
              <div className={styles.advisorAvatar} aria-hidden>
                {advisor.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className={styles.advisorHeadText}>
                <h3 className={styles.advisorName}>
                  {advisor.name}, {advisor.credential}
                </h3>
                <p className={styles.advisorFirm}>{advisor.firm}</p>
                <p className={styles.advisorMeta}>
                  Experience: {advisor.experienceYears} Years · {advisor.location}
                </p>
              </div>
            </div>

            <div className={styles.advisorBlock}>
              <p className={styles.advisorBlockLabel}>Specialties</p>
              <ul className={styles.advisorTags}>
                {advisor.specialties.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>

            <div className={styles.advisorStats}>
              <span className={styles.advisorStat}>
                ⭐ {advisor.rating.toFixed(1)} ({advisor.reviewCount} Reviews)
              </span>
              <span className={styles.advisorStat}>💲 {advisor.rateFrom}</span>
              <span
                className={`${styles.advisorAvail} ${advisor.availableTone === 'today' ? styles.advisorAvailToday : styles.advisorAvailSoon}`}
              >
                🟢 {advisor.availability}
              </span>
            </div>

            <button
              type="button"
              className={styles.advisorCta}
              onClick={() => onBookAdvisor?.(advisor)}
            >
              Book Consultation
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
