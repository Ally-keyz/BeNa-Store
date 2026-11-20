import { useCallback, useEffect, useState } from 'react';
import { Lottie } from 'lottie-react';
import { AnimatePresence, motion } from 'framer-motion';
import shoppingBagAnimation from '@/assets/shopping-bag.json';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

const INTRO_KEY = 'bena-oriring-intro-seen';

function hasSeenIntro(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    window.sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    return;
  }
}

export function OpeningScreen() {
  const [visible, setVisible] = useState(() => !hasSeenIntro());
  useLockBodyScroll(visible);

  const dismiss = useCallback(() => {
    markIntroSeen();
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(dismiss, 2800);
    return () => window.clearTimeout(timer);
  }, [visible, dismiss]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="dialog"
          aria-label="Opening animation"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-paper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="h-[min(42vh,20rem)] w-[min(42vh,20rem)]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <Lottie
              src={shoppingBagAnimation}
              loop
              autoplay
              rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
