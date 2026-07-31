import { motion, useReducedMotion } from "framer-motion";
import styles from "./RewardsShowcase.module.css";

/** Soft rewards mascot — same role as Product guide bot. */
export default function RewardsGuide() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <aside className={styles.guide} aria-hidden="true">
        <img
          className={styles.guideImg}
          src="/mascot/rewards-bot.png"
          alt=""
          width={280}
          height={280}
          loading="lazy"
          decoding="async"
        />
      </aside>
    );
  }

  return (
    <aside className={styles.guide} aria-hidden="true">
      <div className={styles.guideStage}>
        <span className={styles.guideGlow} />
        <span className={styles.guideSpark} />
        <span className={`${styles.guideSpark} ${styles.guideSparkB}`} />
        <motion.div
          className={styles.guideFloat}
          animate={{ y: [0, -6, 0], rotate: [0, -1.5, 1.2, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            className={styles.guideImg}
            src="/mascot/rewards-bot.png"
            alt=""
            width={280}
            height={280}
            loading="lazy"
            decoding="async"
          />
        </motion.div>
      </div>
    </aside>
  );
}
