import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import styles from "./HeroThinking.module.css";

const BEATS = [
  {
    id: "pile",
    pose: "/hero/owner-busy.webp",
    title: "You hold all 3 statements",
    caption:
      "Bank statement, POS report, and ecommerce statement — all three in your hands.",
    popups: [] as const,
  },
  {
    id: "confused",
    pose: "/hero/owner-confused.webp",
    title: "You still can’t see the story",
    caption:
      "You have real business questions — loan room, hiring, cash flow — and no clear answers yet.",
    popups: [
      "Am I eligible for a loan?",
      "Can I hire a new employee?",
      "What is my cash flow?",
      "What's my runway this month?",
    ] as const,
  },
  {
    id: "found",
    pose: "/hero/owner-side.webp",
    title: "Thank you, AskTill",
    caption:
      "You’re looking at AskTill on your phone — cash flow, runway, and clear next steps.",
    popups: [
      "Cash flow is clear now",
      "I know if I can hire",
      "Thank you, AskTill",
      "You cleared all my doubts",
    ] as const,
  },
] as const;

const HOLD_MS = 2200;
const POPUP_MS = 1800;

export default function HeroThinking() {
  const reduce = useReducedMotion();
  const [beatI, setBeatI] = useState(0);
  const [popupI, setPopupI] = useState(-1); // -1 = image only, no popup yet

  const beat = BEATS[beatI];
  const popupText = popupI >= 0 ? beat.popups[popupI] ?? null : null;

  useEffect(() => {
    if (reduce) {
      setPopupI(beat.popups.length ? 0 : -1);
      return;
    }

    setPopupI(-1);
    const timers: number[] = [];

    // First show this image alone, then its popups one by one, then next beat
    if (beat.popups.length === 0) {
      timers.push(
        window.setTimeout(() => {
          setBeatI((v) => (v + 1) % BEATS.length);
        }, HOLD_MS),
      );
    } else {
      // hold image briefly, then start first popup
      timers.push(
        window.setTimeout(() => {
          setPopupI(0);
        }, 700),
      );

      beat.popups.forEach((_, idx) => {
        timers.push(
          window.setTimeout(() => {
            if (idx < beat.popups.length - 1) {
              setPopupI(idx + 1);
            } else {
              setPopupI(-1);
              setBeatI((v) => (v + 1) % BEATS.length);
            }
          }, 700 + POPUP_MS * (idx + 1)),
        );
      });
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [beatI, beat.popups, reduce]);

  return (
    <div className={styles.root} aria-label="SMB owner acting through finding AskTill">
      <div className={styles.cssMotion} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobA}`} />
        <span className={`${styles.blob} ${styles.blobB}`} />
        <span className={`${styles.blob} ${styles.blobC}`} />
      </div>

      {!reduce ? (
        <div className={styles.middleFx} aria-hidden="true">
          <span className={`${styles.orbit} ${styles.orbitA}`} />
          <span className={`${styles.orbit} ${styles.orbitB}`} />
          <span className={styles.softGlow} />
          {Array.from({ length: 14 }, (_, n) => (
            <span key={n} className={styles.spark} style={{ "--n": n } as CSSProperties} />
          ))}
          <span className={styles.flowDot} />
          <span className={`${styles.flowDot} ${styles.flowDotB}`} />
        </div>
      ) : null}

      <div className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.actor}>
            <div className={styles.humanFrame}>
              <div className={styles.photoLayer}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={beat.id}
                    className={styles.human}
                    src={beat.pose}
                    alt={beat.title}
                    width={420}
                    height={420}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  />
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {popupText ? (
                    <motion.div
                      key={`${beat.id}-${popupText}`}
                      className={`${styles.doubtPopup} ${
                        beat.id === "found" ? styles.doubtThanks : ""
                      }`}
                      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.94, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                      exit={{ opacity: 0, y: -6, scale: 0.96, x: "-50%" }}
                      transition={{ duration: 0.25 }}
                    >
                      {popupText}
                      <span className={styles.doubtTail} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className={styles.copy}>
            <p className={styles.step}>0{beatI + 1} / 03 · your story</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={beat.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
              >
                <h3>{beat.title}</h3>
                <p>{beat.caption}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className={styles.dots} aria-hidden="true">
          {BEATS.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              className={`${styles.dot} ${idx === beatI ? styles.dotOn : ""}`}
              onClick={() => {
                setBeatI(idx);
                setPopupI(-1);
              }}
              aria-label={`Show action ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
