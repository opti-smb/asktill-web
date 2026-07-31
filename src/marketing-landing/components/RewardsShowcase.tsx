import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mesh } from "three";
import { FadeUp } from "./FadeUp";
import RewardsGuide from "./RewardsGuide";
import SectionMotion from "./SectionMotion";
import styles from "./RewardsShowcase.module.css";

/** Earn / redeem copy from landing rewards section */
const EARN = [
  {
    title: "Upload your monthly statements",
    sub: "bank, POS, or ecommerce",
    pts: "+25 pts",
  },
  {
    title: "Open your AT Letter",
    sub: "read your monthly summary",
    pts: "+10 pts",
  },
  {
    title: "Connect a new account",
    sub: "bank, POS, or store",
    pts: "+50 pts",
  },
  {
    title: "Refer another business",
    sub: "once they get started",
    pts: "+200 pts",
  },
] as const;

const REDEEM = [
  {
    title: "Cash credit",
    sub: "straight off your next bill",
    pts: "100 pts = $1",
  },
  {
    title: "Skip a monthly fee",
    sub: "one month, on us",
    pts: "1,200 pts",
  },
  {
    title: "Priority chargeback review",
    sub: "jump the queue",
    pts: "300 pts",
  },
  {
    title: "Extra connected account",
    sub: "add another store or bank",
    pts: "500 pts",
  },
] as const;

type Brand = {
  name: string;
  href: string;
  logo: string;
  tone: string;
  wide?: boolean;
};

const SHOPPING_VOUCHERS: Brand[] = [
  {
    name: "Amazon",
    href: "https://www.amazon.com/",
    logo: "/brands/amazon.svg",
    tone: "#131921",
  },
  {
    name: "Myntra",
    href: "https://www.myntra.com/",
    logo: "/brands/myntra.svg",
    tone: "#FF3F6C",
    wide: true,
  },
  {
    name: "Flipkart",
    href: "https://www.flipkart.com/",
    logo: "/brands/flipkart.svg",
    tone: "#047BD5",
  },
  {
    name: "AJIO",
    href: "https://www.ajio.com/",
    logo: "/brands/ajio.svg",
    tone: "#2C4152",
    wide: true,
  },
  {
    name: "Swiggy",
    href: "https://www.swiggy.com/",
    logo: "/brands/swiggy.svg",
    tone: "#FC8019",
  },
  {
    name: "Zomato",
    href: "https://www.zomato.com/",
    logo: "/brands/zomato.svg",
    tone: "#E23744",
  },
  {
    name: "bigbasket",
    href: "https://www.bigbasket.com/",
    logo: "/brands/bigbasket.svg",
    tone: "#84C225",
    wide: true,
  },
];

const TRAVEL_VOUCHERS: Brand[] = [
  {
    name: "Uber",
    href: "https://www.uber.com/",
    logo: "/brands/uber.svg",
    tone: "#000000",
  },
  {
    name: "Airbnb",
    href: "https://www.airbnb.com/",
    logo: "/brands/airbnb.svg",
    tone: "#FF5A5F",
  },
  {
    name: "Booking.com",
    href: "https://www.booking.com/",
    logo: "/brands/booking.svg",
    tone: "#003580",
  },
];

type VoucherPanel = "shopping" | "travel" | null;

function Coin({
  position,
  color,
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * speed;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.25;
  });
  return (
    <Float speed={1.5} floatIntensity={0.5} rotationIntensity={0.2}>
      <mesh ref={ref} position={position} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 48]} />
        <meshStandardMaterial
          color={color}
          metalness={0.85}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.25}
        />
      </mesh>
    </Float>
  );
}

function RewardsScene() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} />
      <pointLight position={[-2, 1, 2]} color="#4dc8a0" intensity={1.2} />
      <pointLight position={[2, -1, 1]} color="#0e6ba8" intensity={0.9} />
      <Coin position={[-1.35, 0.45, -0.2]} color="#4dc8a0" speed={0.9} />
      <Coin position={[-0.55, -0.35, 0.2]} color="#f5c451" speed={1.2} />
      <Coin position={[0.35, 0.55, -0.45]} color="#5b8cff" speed={0.75} />
      <Coin position={[-0.95, 0.9, -0.55]} color="#7cffb2" speed={1.05} />
      <Coin position={[0.15, -0.85, -0.15]} color="#ffc857" speed={0.85} />
    </>
  );
}

function VoucherPanelView({
  brands,
  reduce,
}: {
  brands: Brand[];
  reduce: boolean | null;
}) {
  return (
    <motion.div
      className={styles.vouchers}
      initial={reduce ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={reduce ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.ul
        className={styles.voucherList}
        initial="hidden"
        animate="show"
        variants={
          reduce
            ? undefined
            : {
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.07, delayChildren: 0.04 },
                },
              }
        }
      >
        {brands.map((brand) => (
          <motion.li
            key={brand.name}
            variants={
              reduce
                ? undefined
                : {
                    hidden: { opacity: 0, x: -12 },
                    show: {
                      opacity: 1,
                      x: 0,
                      transition: {
                        type: "spring",
                        stiffness: 380,
                        damping: 24,
                      },
                    },
                  }
            }
          >
            <a
              className={styles.voucherLink}
              href={brand.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.voucherBrand}>
                <span
                  className={`${styles.voucherLogo} ${brand.wide ? styles.voucherLogoWide : ""}`}
                  style={{ background: brand.tone }}
                >
                  <img src={brand.logo} alt="" width={28} height={28} />
                </span>
                <span className={styles.voucherName}>{brand.name}</span>
              </span>
              <b>Voucher</b>
            </a>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}

export default function RewardsShowcase() {
  const reduce = useReducedMotion();
  const [openPanel, setOpenPanel] = useState<VoucherPanel>(null);

  const togglePanel = (panel: "shopping" | "travel") => {
    setOpenPanel((cur) => (cur === panel ? null : panel));
  };

  return (
    <section className={styles.section} id="rewards">
      <SectionMotion kind="rewards" />
      <div className={`wrap ${styles.content}`}>
        <FadeUp>
          <div className={styles.introRow}>
            <RewardsGuide />

            <div className={`section-head ${styles.head}`}>
              <p className="section-label">Ways to earn &amp; redeem</p>
              <h2 className="section-title">
                Get a little back for staying on top of it.
              </h2>
              <p className="section-lead">
                Every upload, every letter, every referral — it all adds up. 100
                points is a dollar back in your pocket.
              </p>
            </div>
          </div>
        </FadeUp>

        <div className={styles.stage}>
          <div className={styles.walletWrap}>
            <motion.div
              className={styles.walletFrame}
              initial={reduce ? false : { opacity: 0, y: 24, rotateY: -6 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <img
                src="/product/rewards.webp"
                alt="AskTill AT Rewards live wallet and recent activity"
                width={1100}
                height={880}
                loading="lazy"
                decoding="async"
              />
            </motion.div>

            {!reduce ? (
              <div className={styles.canvas3d} aria-hidden="true">
                <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.2, 4.2], fov: 40 }}>
                  <RewardsScene />
                </Canvas>
              </div>
            ) : null}
          </div>

          <div className={styles.lists}>
            <div className={styles.listsBg} aria-hidden="true">
              <span className={styles.listsOrb} />
              <span className={styles.listsRing} />
              <span className={styles.listsRing2} />
              <span className={styles.listsDotA} />
              <span className={styles.listsDotB} />
              <span className={styles.listsDotC} />
            </div>

            <div className={styles.listsInner}>
              <div className={styles.listBlock}>
                <h3>Ways to earn</h3>
                <ul className={styles.earnList}>
                  {EARN.map((row, i) => (
                    <motion.li
                      key={row.title}
                      className={styles.earnRow}
                      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: false, amount: 0.2, margin: "-6% 0px" }}
                      transition={{
                        delay: 0.05 * i,
                        duration: 0.35,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      whileHover={
                        reduce
                          ? undefined
                          : { y: -2, scale: 1.01, transition: { duration: 0.18 } }
                      }
                    >
                      <span>
                        {row.title}
                        {row.sub ? ` · ${row.sub}` : null}
                      </span>
                      <b>{row.pts}</b>
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div className={styles.listBlock}>
                <h3>Ways to redeem</h3>
                <ul className={styles.redeemList}>
                  {REDEEM.map((row, i) => {
                    const panel =
                      "panel" in row ? (row.panel as "shopping" | "travel") : null;
                    const isOpen = panel !== null && openPanel === panel;
                    return (
                      <li key={row.title} className={styles.redeemBlock}>
                        <motion.div
                          initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
                          whileInView={{ opacity: 1, y: 0, scale: 1 }}
                          viewport={{ once: false, amount: 0.2, margin: "-6% 0px" }}
                          transition={{
                            delay: 0.05 * i,
                            duration: 0.35,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          whileHover={
                            reduce
                              ? undefined
                              : { y: -2, scale: 1.01, transition: { duration: 0.18 } }
                          }
                          className={`${styles.redeemRow} ${
                            panel ? styles.redeemClick : ""
                          } ${isOpen ? styles.redeemClickOn : ""}`}
                        >
                          {panel ? (
                            <button
                              type="button"
                              className={styles.redeemBtn}
                              aria-expanded={isOpen}
                              aria-label={`${row.title}. ${isOpen ? "Hide" : "Show"} brands`}
                              onClick={() => togglePanel(panel)}
                            >
                              <span>
                                {row.title}
                                {"sub" in row && row.sub ? ` · ${row.sub}` : null}
                              </span>
                              <b>{row.pts}</b>
                            </button>
                          ) : (
                            <>
                              <span>
                                {row.title}
                                {"sub" in row && row.sub ? ` · ${row.sub}` : null}
                              </span>
                              <b>{row.pts}</b>
                            </>
                          )}
                        </motion.div>

                        <AnimatePresence initial={false}>
                          {isOpen && panel === "travel" ? (
                            <VoucherPanelView
                              key="travel"
                              brands={TRAVEL_VOUCHERS}
                              reduce={reduce}
                            />
                          ) : null}
                          {isOpen && panel === "shopping" ? (
                            <VoucherPanelView
                              key="shopping"
                              brands={SHOPPING_VOUCHERS}
                              reduce={reduce}
                            />
                          ) : null}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
