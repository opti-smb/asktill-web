import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** How far the block rises from (px). Default feels like text coming toward you. */
  y?: number;
};

/** Text / blocks arrive as you scroll — stay visible after first reveal. */
export function FadeUp({ children, className, delay = 0, y = 36 }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      whileInView="show"
      viewport={{ once: true, amount: 0.12, margin: "0px" }}
      variants={{
        hidden: { opacity: 0, y, scale: 0.985 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.45,
            delay,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
