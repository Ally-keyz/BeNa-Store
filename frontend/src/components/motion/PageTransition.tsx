import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Swaps route content immediately and fades the incoming page in. The previous
 * implementation used `AnimatePresence mode="wait"`, which delayed every
 * navigation by the full exit duration before the new (lazy) route mounted.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.24, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
