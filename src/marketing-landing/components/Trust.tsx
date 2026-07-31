import { motion, useReducedMotion } from "framer-motion";
import { FadeUp } from "./FadeUp";
import SectionMotion from "./SectionMotion";
import styles from "./Trust.module.css";

const ITEMS = [
  {
    title: "Processed once",
    body: "Your statements are processed for this run and matched against each other — then deleted.",
  },
  {
    title: "Never stored",
    body: "We never keep a copy on our servers after the run.",
  },
  {
    title: "Bank-grade encryption",
    body: "Your data is locked in transit while we analyze it.",
  },
  {
    title: "Never sold or shared",
    body: "We never sell or share what's in your statements.",
  },
];

export default function Trust() {
  const reduce = useReducedMotion();

  return (
    <section className={styles.section} id="trust">
      <SectionMotion kind="security" />
      <div className={`wrap ${styles.content}`}>
        <FadeUp>
          <div className="section-head">
            <p className="section-label">Security</p>
            <h2 className="section-title">Nothing left behind</h2>
            <p className="section-lead">
              We lock your data, then let it go. Your statements are processed for
              this run and matched against each other — then deleted. We never keep
              a copy on our servers, and we never sell or share what&apos;s in them.
            </p>
          </div>
        </FadeUp>

        <div className={styles.grid}>
          {ITEMS.map((item, i) => (
            <motion.article
              key={item.title}
              className={styles.card}
              initial={false}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                opacity: { duration: 0.4, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] },
                scale: { duration: 0.4, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] },
              }}
              whileHover={
                reduce
                  ? undefined
                  : {
                      y: -8,
                      scale: 1.02,
                      transition: { duration: 0.22 },
                    }
              }
            >
              <motion.div
                className={styles.icon}
                aria-hidden="true"
                animate={
                  reduce
                    ? undefined
                    : {
                        boxShadow: [
                          "0 0 0 0 rgba(124,255,178,0)",
                          "0 0 16px 2px rgba(124,255,178,0.4)",
                          "0 0 0 0 rgba(124,255,178,0)",
                        ],
                      }
                }
                transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4 }}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M7 10V7a5 5 0 0 1 10 0v3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="12"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="15.5" r="1.5" fill="currentColor" />
                  <path
                    d="M12 17v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
