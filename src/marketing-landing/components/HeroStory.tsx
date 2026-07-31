import { motion, useReducedMotion } from "framer-motion";
import styles from "./HeroStory.module.css";

const PANELS = [
  {
    id: "pile",
    step: "01",
    title: "Statements everywhere",
    caption: "Bank · POS · Ecommerce — three piles, one month.",
    mood: "busy",
    image: "/hero/owner-busy.webp",
    alt: "Small business owner holding bank, POS, and ecommerce statements",
  },
  {
    id: "confused",
    step: "02",
    title: "Still unclear",
    caption: "What matched? What’s risk? Needs a plain explanation.",
    mood: "confused",
    image: "/hero/owner-confused.webp",
    alt: "Small business owner looking confused about finances",
  },
  {
    id: "found",
    step: "03",
    title: "Finds AskTill",
    caption: "Upload once. Cash flow, risk, and AT Letter — clear.",
    mood: "relieved",
    image: "/hero/owner-relieved.webp",
    alt: "Small business owner relieved after finding AskTill",
  },
] as const;

const ease = [0.16, 1, 0.3, 1] as const;

function OwnerPhoto({
  src,
  alt,
  mood,
  reduce,
}: {
  src: string;
  alt: string;
  mood: "busy" | "confused" | "relieved";
  reduce: boolean | null;
}) {
  return (
    <motion.div
      className={`${styles.photoWrap} ${styles[mood]}`}
      animate={
        reduce
          ? undefined
          : mood === "confused"
            ? { y: [0, -4, 0], rotate: [0, -1.2, 0] }
            : mood === "relieved"
              ? { y: [0, -5, 0], scale: [1, 1.02, 1] }
              : { y: [0, -3, 0] }
      }
      transition={
        reduce
          ? undefined
          : { duration: mood === "confused" ? 3.2 : 4.2, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <img className={styles.photo} src={src} alt={alt} width={160} height={160} loading="eager" />
      {mood === "confused" && !reduce ? (
        <>
          <motion.span
            className={`${styles.q} ${styles.qA}`}
            animate={{ y: [0, -8, 0], opacity: [0.55, 1, 0.55], scale: [0.9, 1.08, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            ?
          </motion.span>
          <motion.span
            className={`${styles.q} ${styles.qB}`}
            animate={{ y: [0, -6, 0], opacity: [0.4, 0.95, 0.4] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
          >
            ?
          </motion.span>
        </>
      ) : null}
      {mood === "relieved" && !reduce ? (
        <motion.span
          className={styles.check}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.15, 1], opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.85, ease }}
        >
          ✓
        </motion.span>
      ) : null}
    </motion.div>
  );
}

function StmtStack({ reduce }: { reduce: boolean | null }) {
  const labels = [
    { text: "BANK", cls: styles.bank },
    { text: "POS", cls: styles.pos },
    { text: "ECOM", cls: styles.ecom },
  ];
  return (
    <div className={styles.stmts} aria-hidden="true">
      {labels.map((item, i) => (
        <motion.span
          key={item.text}
          className={`${styles.stmt} ${item.cls}`}
          initial={reduce ? false : { opacity: 0, x: 18, rotate: 0 }}
          animate={
            reduce
              ? { opacity: 1 }
              : {
                  opacity: 1,
                  x: [0, i === 1 ? 4 : -2, 0],
                  y: [0, i % 2 === 0 ? -3 : 2, 0],
                }
          }
          transition={
            reduce
              ? undefined
              : {
                  opacity: { duration: 0.35, delay: 0.35 + i * 0.12 },
                  x: { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
                  y: { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
                }
          }
        >
          {item.text}
        </motion.span>
      ))}
    </div>
  );
}

function ConfusedTags({ reduce }: { reduce: boolean | null }) {
  const tags = ["Match?", "Fees?", "Risk?"];
  return (
    <div className={styles.mess} aria-hidden="true">
      {tags.map((tag, i) => (
        <motion.span
          key={tag}
          initial={reduce ? false : { opacity: 0, scale: 0.7, y: 8 }}
          animate={
            reduce
              ? { opacity: 1 }
              : { opacity: [0.7, 1, 0.7], scale: [0.96, 1.04, 0.96], y: [0, -3, 0] }
          }
          transition={
            reduce
              ? undefined
              : {
                  opacity: { duration: 0.3, delay: 0.45 + i * 0.1 },
                  scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 },
                  y: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 },
                }
          }
        >
          {tag}
        </motion.span>
      ))}
    </div>
  );
}

function AskTillMini({ reduce }: { reduce: boolean | null }) {
  return (
    <motion.div
      className={styles.appCard}
      aria-hidden="true"
      initial={reduce ? false : { opacity: 0, x: 24, scale: 0.86 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.7, ease }}
    >
      <div className={styles.appTop}>
        <span className={styles.appMark}>AT</span>
        <span>AskTill</span>
      </div>
      <div className={styles.appBars}>
        {[42, 68, 55, 82].map((h, i) => (
          <motion.i
            key={h}
            style={{ height: `${h}%` }}
            initial={reduce ? false : { scaleY: 0.2 }}
            animate={reduce ? undefined : { scaleY: [0.55, 1, 0.7, 1] }}
            transition={
              reduce
                ? undefined
                : { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.9 + i * 0.12 }
            }
          />
        ))}
      </div>
      <motion.p
        className={styles.appLine}
        animate={reduce ? undefined : { opacity: [0.65, 1, 0.65] }}
        transition={reduce ? undefined : { duration: 2.2, repeat: Infinity }}
      >
        AT Letter ready
      </motion.p>
    </motion.div>
  );
}

function PanelArt({
  id,
  image,
  alt,
  mood,
  reduce,
}: {
  id: (typeof PANELS)[number]["id"];
  image: string;
  alt: string;
  mood: "busy" | "confused" | "relieved";
  reduce: boolean | null;
}) {
  return (
    <div className={styles.art}>
      <OwnerPhoto src={image} alt={alt} mood={mood} reduce={reduce} />
      {id === "pile" ? <StmtStack reduce={reduce} /> : null}
      {id === "confused" ? <ConfusedTags reduce={reduce} /> : null}
      {id === "found" ? <AskTillMini reduce={reduce} /> : null}
    </div>
  );
}

export default function HeroStory() {
  const reduce = useReducedMotion();

  return (
    <div className={styles.root} aria-label="How an SMB owner finds AskTill">
      <div className={styles.glow} aria-hidden="true" />
      <ol className={styles.panels}>
        {PANELS.map((panel, i) => (
          <motion.li
            key={panel.id}
            className={`${styles.panel} ${styles[panel.id]}`}
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 + i * 0.18, ease }}
            whileHover={reduce ? undefined : { y: -3, transition: { duration: 0.2 } }}
          >
            <motion.div
              className={styles.step}
              animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
              transition={reduce ? undefined : { duration: 3.5, repeat: Infinity, delay: i * 0.4 }}
            >
              {panel.step}
            </motion.div>
            <div className={styles.body}>
              <PanelArt
                id={panel.id}
                image={panel.image}
                alt={panel.alt}
                mood={panel.mood}
                reduce={reduce}
              />
              <h3>{panel.title}</h3>
              <p>{panel.caption}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
