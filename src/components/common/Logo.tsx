import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

interface LogoProps {
  to?: string;
  size?: number;
}

export default function Logo({ to = '/', size = 28 }: LogoProps) {
  return (
    <Link to={to} className={styles.logoMark}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="3" y="10" width="26" height="18" rx="3" fill="#1E40AF" />
        <rect x="6" y="13" width="20" height="5" rx="1.5" fill="#DBEAFE" />
        <circle cx="9" cy="22" r="1.4" fill="#93C5FD" />
        <circle cx="14" cy="22" r="1.4" fill="#93C5FD" />
        <circle cx="19" cy="22" r="1.4" fill="#93C5FD" />
        <circle cx="24" cy="22" r="1.4" fill="#93C5FD" />
        <path
          d="M22 4h6a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3l-3 2v-2h0a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
          fill="#3B82F6"
        />
        <circle cx="26" cy="7.5" r="0.8" fill="#FFFFFF" />
      </svg>
      Ask<span>Till</span>
    </Link>
  );
}
