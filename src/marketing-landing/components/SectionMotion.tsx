import type { CSSProperties } from "react";
import styles from "./SectionMotion.module.css";

type Kind =
  | "hero"
  | "product"
  | "story"
  | "rewards"
  | "pricing"
  | "cta"
  | "how"
  | "features"
  | "security";

type Tone = "mint" | "sky" | "gold";

type Props = { kind: Kind };

/** Shared background motion — same cosmic rhythm on every section. */
export default function SectionMotion({ kind }: Props) {
  const tone: Tone =
    kind === "rewards" || kind === "pricing"
      ? "gold"
      : kind === "product" || kind === "how" || kind === "security"
        ? "sky"
        : "mint";

  return (
    <div className={`${styles.root} ${styles[kind]}`} aria-hidden="true">
      <CosmicAtmosphere tone={tone} />
      {kind === "security" ? <SecurityBot /> : null}
    </div>
  );
}

/** Soft background bot — suggests locking data, never competes with content. */
function SecurityBot() {
  return (
    <div className={styles.secBot} aria-hidden="true">
      <svg
        className={styles.secBotSvg}
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* soft glow */}
        <ellipse cx="100" cy="210" rx="58" ry="12" fill="rgba(91,140,255,0.18)" />

        {/* body */}
        <rect
          x="58"
          y="108"
          width="84"
          height="78"
          rx="18"
          stroke="currentColor"
          strokeWidth="3"
          fill="rgba(6,16,31,0.35)"
        />
        {/* chest lock plate */}
        <rect
          x="82"
          y="128"
          width="36"
          height="40"
          rx="8"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="rgba(124,255,178,0.06)"
        />
        <path
          d="M91 128v-7a9 9 0 0 1 18 0v7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="100" cy="148" r="3.5" fill="currentColor" />
        <path d="M100 152v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

        {/* head */}
        <rect
          x="66"
          y="48"
          width="68"
          height="54"
          rx="16"
          stroke="currentColor"
          strokeWidth="3"
          fill="rgba(6,16,31,0.4)"
        />
        {/* antenna */}
        <path d="M100 48v-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="28" r="5" fill="currentColor" opacity="0.85" />
        {/* eyes */}
        <circle cx="86" cy="74" r="6" fill="currentColor" opacity="0.9" />
        <circle cx="114" cy="74" r="6" fill="currentColor" opacity="0.9" />
        {/* smile line */}
        <path
          d="M88 90c4 5 20 5 24 0"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* arms holding lock energy */}
        <path
          d="M58 130c-18 4-28 18-30 34"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M142 130c18 4 28 18 30 34"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* floating shield rings */}
        <ellipse
          className={styles.secBotRing}
          cx="100"
          cy="150"
          rx="78"
          ry="34"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          opacity="0.45"
        />
        <ellipse
          className={styles.secBotRingB}
          cx="100"
          cy="150"
          rx="98"
          ry="46"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 10"
          opacity="0.3"
        />
      </svg>
      <p className={styles.secBotCaption}>Locking your data</p>
    </div>
  );
}

/**
 * Space theme for gutters: nebula, aurora, empty orbits, constellation,
 * sparks, shooting stars — no solid moons / eggs.
 */
function CosmicAtmosphere({ tone }: { tone: Tone }) {
  const toneClass =
    tone === "mint"
      ? styles.cosmic_mint
      : tone === "sky"
        ? styles.cosmic_sky
        : styles.cosmic_gold;

  const sparks = [
    { x: "3.5%", y: "14%" },
    { x: "6%", y: "32%" },
    { x: "4.5%", y: "55%" },
    { x: "7%", y: "74%" },
    { x: "92%", y: "16%" },
    { x: "95%", y: "38%" },
    { x: "91%", y: "58%" },
    { x: "96%", y: "76%" },
  ];

  return (
    <div className={`${styles.cosmic} ${toneClass}`}>
      <span className={styles.cosmicAuraL} />
      <span className={styles.cosmicAuraR} />
      <span className={styles.cosmicAurora} />
      <span className={styles.cosmicHorizon} />
      <span className={styles.cosmicOrbit} />
      <span className={styles.cosmicConstellation} />

      {sparks.map((s, i) => (
        <span
          key={i}
          className={styles.cosmicSpark}
          style={
            {
              "--x": s.x,
              "--y": s.y,
              "--delay": `${-i * 0.9}s`,
              "--d": `${4.2 + i * 0.55}s`,
            } as CSSProperties
          }
        />
      ))}

      <span className={styles.cosmicShoot} />
      <span className={`${styles.cosmicShoot} ${styles.cosmicShootB}`} />
    </div>
  );
}
