import type { ReactNode } from "react";
import styles from "./PhoneFrame.module.css";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Revolut-style device chrome around a product UI screen. */
export default function PhoneFrame({ children, className }: Props) {
  return (
    <div className={`${styles.phone} ${className ?? ""}`} aria-hidden="true">
      <div className={styles.bezel}>
        <div className={styles.notch} />
        <div className={styles.screen}>{children}</div>
        <div className={styles.home} />
      </div>
      <div className={styles.glow} />
    </div>
  );
}
