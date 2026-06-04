import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

interface LogoProps {
  to?: string;
  size?: number;
}

export default function Logo({ to = '/', size = 38 }: LogoProps) {
  const iconSize = Math.round(size * 0.53);
  return (
    <Link to={to} className={styles.logoMark}>
      <div className={styles.logoIcon} style={{ width: size, height: size }}>
        <i className="ti ti-chart-bar" style={{ fontSize: iconSize }} aria-hidden="true" />
      </div>
      <span className={styles.logoText}>
        ask<span>till</span>
      </span>
    </Link>
  );
}
