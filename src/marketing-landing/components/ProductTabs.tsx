import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ProductGuide from "./ProductGuide";
import SectionMotion from "./SectionMotion";
import styles from "./ProductTabs.module.css";

/** Real AskTill assets — Letter PDF, Rewards, Uploads, Health, Ledger screenshots. */
const TABS = [
  {
    id: "uploads",
    label: "Uploads",
    blurb:
      "Bank, POS, and ecommerce land here first — one drop, same flow your team already knows.",
    image: "/product/uploads.webp",
  },
  {
    id: "letter",
    label: "AT Letter",
    blurb:
      "Your monthly shareable story — cash, matches, commissions, and rewards in one letter.",
    image: "/product/at-letter.webp",
  },
  {
    id: "ledger",
    label: "AT Ledger",
    blurb:
      "Cash flow, reconciliation, overview, and reports — the books you open every month.",
    image: "/product/at-ledger.webp",
  },
  {
    id: "health",
    label: "AT Health",
    blurb:
      "Runway, risk bands, and watch items — calculator health without digging through sheets.",
    image: "/product/at-health.webp",
  },
  {
    id: "rewards",
    label: "AT Rewards",
    blurb:
      "Live wallet for every analysis — upload points, letter points, and 100 pts = $1.",
    image: "/product/rewards.webp",
  },
] as const;

export default function ProductTabs() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const tab = TABS[active];

  return (
    <section className={styles.section} id="product">
      <SectionMotion kind="product" />
      <div className={`wrap ${styles.content}`}>
        <div className={styles.split}>
          <div className={styles.left}>
            <div className={`section-head ${styles.intro}`}>
              <p className="section-label">Product</p>
              <h2 className="section-title">Your AskTill product</h2>
              <p className="section-lead">
                Pick a heading — the real screen opens on the right.
              </p>
            </div>

            <div
              className={styles.tabs}
              role="tablist"
              aria-label="AskTill product tabs"
            >
              {TABS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className={`${styles.tab} ${i === active ? styles.tabOn : ""}`}
                  onClick={() => setActive(i)}
                >
                  <span className={styles.tabLabel}>{item.label}</span>
                  {i === active ? (
                    <span className={styles.tabBlurb}>{item.blurb}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.right}>
            <ProductGuide tabKey={tab.id} />
            <div className={styles.stage}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab.id}
                  className={styles.panel}
                  initial={reduce ? false : { opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.frame}>
                    <div className={styles.chrome} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={styles.viewport}>
                      <img
                        src={tab.image}
                        alt={`${tab.label} — AskTill`}
                        width={900}
                        height={1273}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
