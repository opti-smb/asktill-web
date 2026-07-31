import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./ProductTabs.module.css";

type Gesture = "breathe" | "glance" | "wave" | "point" | "nod";

/** Soft cycle — feels like a guide standing, not bouncing. */
const GESTURE_CYCLE: Gesture[] = [
  "breathe",
  "glance",
  "breathe",
  "wave",
  "breathe",
  "point",
  "breathe",
  "nod",
];

type Props = {
  tabKey: string;
};

/**
 * Realistic guide motion: constant breath + occasional glance / wave / point / nod.
 * Tab changes get a small acknowledge nod — no hops or remount snaps.
 */
export default function ProductGuide({ tabKey }: Props) {
  const reduce = useReducedMotion();
  const [gesture, setGesture] = useState<Gesture>("breathe");
  const [ack, setAck] = useState(0);

  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % GESTURE_CYCLE.length;
      setGesture(GESTURE_CYCLE[i]);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    setGesture("nod");
    setAck((n) => n + 1);
    const t = window.setTimeout(() => setGesture("glance"), 1100);
    return () => window.clearTimeout(t);
  }, [tabKey, reduce]);

  if (reduce) {
    return (
      <aside className={`${styles.guide} ${styles.guideTowardProduct}`} aria-hidden="true">
        <div className={styles.guideStage}>
          <img
            className={styles.guideImg}
            src="/mascot/at-guide.png"
            alt=""
            width={280}
            height={280}
            loading="lazy"
            decoding="async"
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className={`${styles.guide} ${styles.guideTowardProduct}`} aria-hidden="true">
      <div className={styles.guideStage}>
        <span className={styles.guideGlow} />
        <span className={styles.guideSpark} />
        <span className={`${styles.guideSpark} ${styles.guideSparkB}`} />

        {/* Weight / breath — always on, very soft */}
        <motion.div
          className={styles.guideFloat}
          animate={{ y: [0, -3.5, 0] }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Upper body gestures */}
          <motion.div
            className={styles.guideBody}
            animate={
              gesture === "wave"
                ? {
                    rotate: [0, -4.5, 3.5, -3, 1.5, 0],
                    x: [0, -2, 2, -1.5, 0],
                  }
                  : gesture === "point"
                  ? {
                      rotate: [0, 3.5, 5, 2.5, 0],
                      x: [0, 5, 7, 3, 0],
                    }
                  : gesture === "glance"
                    ? {
                        rotate: [0, 2.2, 0, -1.5, 0],
                        x: [0, 3, 0, -2, 0],
                      }
                    : gesture === "nod"
                      ? {
                          rotate: [0, 2.5, -1.2, 1.8, 0],
                          x: [0, 0, 0, 0, 0],
                        }
                      : {
                          rotate: [0, 0.6, -0.5, 0],
                          x: [0, 0.5, -0.5, 0],
                        }
            }
            transition={{
              duration:
                gesture === "wave"
                  ? 1.8
                  : gesture === "nod"
                    ? 0.95
                    : gesture === "point"
                      ? 1.6
                      : gesture === "glance"
                        ? 2.2
                        : 3.2,
              ease: [0.33, 1, 0.32, 1],
            }}
          >
            {/* Head nod layer — slight pitch on acknowledge */}
            <motion.div
              key={ack}
              className={styles.guideHead}
              animate={
                gesture === "nod"
                  ? { rotateX: [0, 8, -2, 5, 0], y: [0, 2, 0, 1.5, 0] }
                  : { rotateX: [0, 1.2, 0], y: [0, 0.6, 0] }
              }
              transition={{
                duration: gesture === "nod" ? 0.9 : 3.4,
                ease: "easeInOut",
                repeat: gesture === "nod" ? 0 : Infinity,
              }}
              style={{ transformPerspective: 600 }}
            >
              <img
                className={styles.guideImg}
                src="/mascot/at-guide.png"
                alt=""
                width={280}
                height={280}
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </aside>
  );
}
