import { FadeUp } from "./FadeUp";
import SectionMotion from "./SectionMotion";
import styles from "./Features.module.css";

const FEATURES = [
  {
    title: "AT Ledger",
    body: "Cash flow, reconciliation, overview, and reports — the books you open every month, matched automatically against your bank.",
    tag: "Core",
    accent: "#7cffb2",
  },
  {
    title: "AT Health",
    body: "Runway, risk bands, and watch items — know where you stand before a lender or a bad month asks you first.",
    tag: "Insight",
    accent: "#ffc857",
  },
  {
    title: "AT Shield",
    body: "Chargebacks, fought for you. When a customer disputes a charge, we take it on and work to win your money back — automatically, no action needed from you.",
    tag: "Pay only on wins",
    note: "$20 per dispute we win. Nothing if we don't.",
    accent: "#ff6b4a",
  },
  {
    title: "AT Rewards",
    body: "Earn as you go — upload points, letter points, and 100 pts back in your pocket for every 100 you collect.",
    tag: "Bonus",
    accent: "#5b8cff",
  },
];

export default function Features() {
  return (
    <section className={styles.section} id="features">
      <SectionMotion kind="features" />
      <div className={`wrap ${styles.content}`}>
        <div className="section-head">
          <FadeUp>
            <p className="section-label">What AskTill does</p>
            <h2 className="section-title">Four ways we keep your money honest.</h2>
            <p className="section-lead">
              Each one answers a question you already ask yourself every month —
              just faster, and without the spreadsheet.
            </p>
          </FadeUp>
        </div>

        <div className={styles.list}>
          {FEATURES.map((item, i) => (
            <FadeUp key={item.title} delay={0.06 * i}>
              <article className={styles.row}>
                <div className={styles.rowTop}>
                  <div
                    className={styles.swatch}
                    style={{ background: item.accent }}
                    aria-hidden="true"
                  />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                    {item.note ? <p className={styles.note}>{item.note}</p> : null}
                  </div>
                </div>
                {item.tag ? <p className={styles.tag}>{item.tag}</p> : null}
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
