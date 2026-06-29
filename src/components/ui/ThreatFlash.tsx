'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThreatFlash({ score }: { score: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (score > 10) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(t);
    }
  }, [score]);

  const color = score > 70
    ? 'rgba(239, 68, 68, 0.12)'
    : score > 40
    ? 'rgba(249, 115, 22, 0.08)'
    : 'rgba(234, 179, 8, 0.06)';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-20 pointer-events-none"
          style={{ background: color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 0] }}
          transition={{ duration: 0.8, times: [0, 0.15, 0.5, 1], ease: "easeOut" }}
        />
      )}
    </AnimatePresence>
  );
}