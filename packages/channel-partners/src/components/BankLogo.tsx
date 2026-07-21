import { useState } from 'react';

import type { BankOffer } from '../data/loans';
import styles from '../styles/channelPartners.module.css';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

type Props = {
  bank: BankOffer;
};

/** Logo beside bank name — favicon with branded initials fallback. */
export default function BankLogo({ bank }: Props) {
  const [failed, setFailed] = useState(false);
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bank.domain)}&sz=128`;

  return (
    <span className={styles.bankLogo} style={{ background: bank.brand }} aria-hidden>
      {!failed ? (
        <img
          className={styles.bankLogoImg}
          src={src}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.bankLogoFallback}>{initials(bank.name)}</span>
      )}
    </span>
  );
}
