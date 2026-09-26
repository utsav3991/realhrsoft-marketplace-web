"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from "framer-motion";

/*
 * Content entry motion (DESIGN.md → Motion). Content eases in when it arrives; the chrome never
 * animates on its own. People who ask for reduced motion get content in place, with no entry
 * animation (`MotionConfig reducedMotion="user"` in the app providers covers the rest).
 */

export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];

/** The entry `initial` state, or `false` (render settled) under reduced motion. */
export function useEntryInitial<T>(from: T): T | false {
  return useReducedMotion() ? false : from;
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

/** Fades and lifts its content in once, on mount. */
export function FadeIn({ delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={useEntryInitial({ opacity: 0, y: 8 })}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay }}
      {...props}
    />
  );
}

/** Reveals its `StaggerItem` children one after another (card grids, tiles, lists). */
export function Stagger({ step = 0.04, ...props }: HTMLMotionProps<"div"> & { step?: number }) {
  return (
    <motion.div
      initial={useEntryInitial("hidden")}
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: step } } }}
      {...props}
    />
  );
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return <motion.div variants={fadeUp} {...props} />;
}
