import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

/** Exact brand assets from official asktill artwork. */
export const ASKTILL_LOGO_SRC = '/brand/asktill-logo.png';
export const ASKTILL_MARK_SRC = '/brand/asktill-mark.png';

interface LogoProps {
  to?: string;
  /** Mark size (px). Wordmark scales with it. */
  size?: number;
  /** Larger logo for landing headers. */
  large?: boolean;
}

/** Icon mark only (exact crop from brand logo). */
export function AskTillMark({ size = 34 }: { size?: number }) {
  return (
    <img
      src={ASKTILL_MARK_SRC}
      alt=""
      width={size}
      height={size}
      className={styles.markImg}
      draggable={false}
    />
  );
}

/**
 * Sidebar/header logo: exact mark + asktill wordmark on one row
 * (ask charcoal, till green) with mock-style gap.
 */
export default function Logo({ to = '/', size = 34, large = false }: LogoProps) {
  const markSize = large ? Math.max(size, 44) : size;
  return (
    <Link
      to={to}
      className={`${styles.logoMark} ${large ? styles.logoMarkLarge : ''}`}
      aria-label="asktill"
    >
      <AskTillMark size={markSize} />
      <span className={`${styles.logoText} ${large ? styles.logoTextLarge : ''}`}>
        <span className={styles.logoAsk}>ask</span>
        <span className={styles.logoTill}>till</span>
      </span>
    </Link>
  );
}
