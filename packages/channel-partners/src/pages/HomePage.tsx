import { Link } from 'react-router-dom';

import { PARTNER_CATEGORIES } from '../data/loans';
import styles from '../styles/channelPartners.module.css';

export default function HomePage() {
  return (
    <div className={styles.root}>
      <p className={styles.lead}>
        Explore partner products the way you would on a marketplace — open a category, compare
        options, then continue on the bank’s own website.
      </p>

      <div className={styles.grid}>
        {PARTNER_CATEGORIES.map((cat) => (
          <Link key={cat.id} to={cat.path} className={styles.cardBtn}>
            <span className={styles.cardEyebrow}>Category</span>
            <span className={styles.cardTitle}>{cat.title}</span>
            <span className={styles.cardBlurb}>{cat.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
