"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

interface DetailChartAnimationProps {
  show: boolean;
  children: ReactNode;
}

export function DetailChartAnimation({
  show,
  children,
}: DetailChartAnimationProps) {
  return (
    <AnimatePresence initial={true}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0, scale: 0.92, x: 20, y: -10 }}
          animate={{ height: "auto", opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ height: 0, opacity: 0, scale: 0.6, x: 20, y: -10 }}
          transition={{
            height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
            scale: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            x: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            y: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.3 },
          }}
          style={{ transformOrigin: "top right" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
