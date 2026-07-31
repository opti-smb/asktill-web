import type { ReactNode } from "react";
import styles from "./DeviceFrame.module.css";

type Props = {
  children?: ReactNode;
  image?: string;
  alt?: string;
  className?: string;
};

/** Desktop product chrome for real AskTill tab screenshots. */
export default function DeviceFrame({ children, image, alt = "", className }: Props) {
  return (
    <div className={`${styles.device} ${className ?? ""}`}>
      <div className={styles.chrome}>
        <div className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.url}>app.asktill.com</div>
      </div>
      <div className={styles.screen}>
        {image ? <img src={image} alt={alt} loading="lazy" decoding="async" /> : children}
      </div>
    </div>
  );
}
