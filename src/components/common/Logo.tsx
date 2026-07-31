import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

interface LogoProps {
  to?: string;
  size?: number;
  /** Larger wordmark for the landing header. */
  large?: boolean;
}

export default function Logo({ to = '/', size = 38, large = false }: LogoProps) {
  const markSize = large ? Math.max(size, 46) : size;
  const iconSize = Math.round(markSize * 0.53);
  return (
    <Link to={to} className={`${styles.logoMark} ${large ? styles.logoMarkLarge : ''}`}>
      <div className={styles.logoIcon} style={{ width: markSize, height: markSize }}>
        <i className="ti ti-chart-bar" style={{ fontSize: iconSize }} aria-hidden="true" />
      </div>
      <span className={`${styles.logoText} ${large ? styles.logoTextLarge : ''}`}>
        AskTill
      </span>
    </Link>
  );
}
