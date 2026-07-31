import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { FadeUp } from "./FadeUp";
import SectionMotion from "./SectionMotion";
import styles from "./ScrollStory.module.css";

const BEATS = [
  {
    title: "You hold all 3 statements",
    short: "Upload",
    body: "Bank statement, POS report, and ecommerce statement are in your hands — but three files still don’t become one clear month. You upload them once so AskTill can read the same period together.",
    points: [
      "Bank, POS, and ecommerce for the same month land in one secure pass",
      "Files are processed for the run, then discarded — nothing stored after",
      "Same upload path you’ll use every month in the AskTill app",
    ],
    visual: "upload",
  },
  {
    title: "You still can’t see the story",
    short: "Questions",
    body: "You have real business questions — loan room, hiring, cash flow, runway — and no clear answers yet. The statements are there, but the story that decides the next move isn’t.",
    points: [
      "Am I eligible for a loan this quarter?",
      "Can I hire a new employee without stretching cash?",
      "What is my cash flow — and what’s my runway this month?",
    ],
    visual: "match",
  },
  {
    title: "Cash flow + risk, together",
    short: "Cash + risk",
    body: "AskTill lines up deposits, fees, and payouts, then puts position and risk in one glance — so loan room, hiring pressure, and runway stop living in three different tabs.",
    points: [
      "Net cash, channel mix, and fee rate in one view",
      "Risk signals sit next to the cash story — not buried elsewhere",
      "Numbers you can trust before you answer those business questions",
    ],
    visual: "cash",
  },
  {
    title: "Answers in the AskTill app",
    short: "App",
    body: "Now you can see the story on your phone — cash movement, matches, and next steps in plain English. The full AT Letter lives in Product; here you just open the app and move with confidence.",
    points: [
      "Cash flow is clear — you know if you can hire",
      "Loan room and runway stop being guesswork",
      "Thank you, AskTill — your doubts finally have answers",
    ],
    visual: "letter",
  },
] as const;

function UploadVisual() {
  return (
    <motion.div
      className={styles.card}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {["Bank", "POS", "Ecommerce"].map((label, i) => (
        <motion.div
          key={label}
          className={styles.slot}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>{label}</span>
          <motion.em
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.08, 1], opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.22, duration: 0.55 }}
          >
            Ready
          </motion.em>
        </motion.div>
      ))}
    </motion.div>
  );
}

function MatchVisual() {
  return (
    <motion.div
      className={styles.card}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <p className={styles.qHint}>Still unanswered</p>
      {[
        { a: "Loan room?", b: "Waiting on the full month" },
        { a: "Hiring capacity?", b: "Cash story incomplete" },
        { a: "Runway?", b: "Three files, no single answer" },
      ].map((row, i) => (
        <motion.div
          key={row.a}
          className={styles.matchRow}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i, duration: 0.35 }}
        >
          <div className={styles.matchTop}>
            <span>{row.a}</span>
            <b>{row.b}</b>
          </div>
          <div className={styles.track}>
            <motion.i
              initial={{ width: "12%" }}
              animate={{ width: ["18%", "42%", "28%"] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function CashVisual() {
  return (
    <motion.div
      className={styles.card}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className={styles.metrics}>
        {[
          { label: "Net cash", value: "$62.7k" },
          { label: "Runway", value: "4.2 mo" },
          { label: "Fee rate", value: "3.26%" },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            className={styles.metric}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
          >
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </motion.div>
        ))}
      </div>
      <div className={styles.miniBars}>
        {[48, 62, 55, 78, 70, 88, 64].map((h, i) => (
          <motion.span
            key={i}
            initial={{ height: "10%" }}
            animate={{ height: [`${h}%`, `${h - 8}%`, `${h}%`] }}
            transition={{
              delay: 0.06 * i,
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function LetterVisual() {
  return (
    <motion.div
      className={styles.phoneDevice}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className={styles.appPhone}>
        <span className={styles.appNotch} />
        <div className={styles.appScreen}>
          <img
            src="/product/at-letter.webp"
            alt="AskTill AT Letter on phone"
            width={280}
            height={500}
            decoding="async"
          />
        </div>
      </div>
      <motion.div
        className={styles.floatChip}
        animate={{ y: [0, -8, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        AskTill app
      </motion.div>
    </motion.div>
  );
}

function BeatVisual({ type }: { type: (typeof BEATS)[number]["visual"] }) {
  if (type === "upload") return <UploadVisual />;
  if (type === "match") return <MatchVisual />;
  if (type === "cash") return <CashVisual />;
  return <LetterVisual />;
}

export default function ScrollStory() {
  const [beat, setBeat] = useState(0);
  const reduce = useReducedMotion();
  const item = BEATS[beat];
  const sectionRef = useRef<HTMLElement>(null);
  /* Single-viewport story: auto-cycle beats (no tall sticky scroll track). */
  useEffect(() => {
    const id = window.setInterval(() => {
      setBeat((b) => (b + 1) % BEATS.length);
    }, reduce ? 3800 : 4200);
    return () => window.clearInterval(id);
  }, [reduce]);

  function jumpToBeat(i: number) {
    setBeat(i);
  }

  return (
    <section className={styles.section} id="story" ref={sectionRef}>
      <div className={styles.sticky}>
        <SectionMotion kind="story" />
        <div className={`wrap ${styles.grid}`}>
          <FadeUp className={styles.copy}>
            <div className={`section-head ${styles.storyHead}`}>
              <p className="section-label">Product story</p>
              <p className="section-lead">
                From three statements in your hands to clear answers on loan room,
                hiring, cash flow, and runway — this is how you finally see the
                month.
              </p>
            </div>

            <div className={styles.steps}>
              {BEATS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.dot} ${i === beat ? styles.dotOn : ""}`}
                  onClick={() => jumpToBeat(i)}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.article
                key={item.title}
                className={styles.beat}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
              >
                <span>0{beat + 1}</span>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                <ul className={styles.points}>
                  {item.points.map((point, i) => (
                    <motion.li
                      key={point}
                      initial={reduce ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 * i, duration: 0.28 }}
                    >
                      {point}
                    </motion.li>
                  ))}
                </ul>
              </motion.article>
            </AnimatePresence>

            <div className={styles.beatNav} role="tablist" aria-label="Story steps">
              {BEATS.map((b, i) => (
                <button
                  key={b.title}
                  type="button"
                  role="tab"
                  aria-selected={i === beat}
                  className={`${styles.beatChip} ${i === beat ? styles.beatChipOn : ""}`}
                  onClick={() => jumpToBeat(i)}
                >
                  <span className={styles.beatChipNum}>0{i + 1}</span>
                  {b.short}
                </button>
              ))}
            </div>
          </FadeUp>

          <FadeUp className={styles.viz} delay={0.08}>
            <div className={styles.glow} aria-hidden="true" />
            <AnimatePresence mode="wait">
              <motion.div
                key={item.visual}
                className={styles.vizInner}
                initial={reduce ? false : { opacity: 0, x: 24, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, x: -16 }}
                transition={{ duration: 0.35 }}
              >
                <BeatVisual type={item.visual} />
              </motion.div>
            </AnimatePresence>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
