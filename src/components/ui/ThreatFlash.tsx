// src/components/ui/ThreatFlash.tsx
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const color = score > 70
    ? 'rgba(239,68,68,0.10)'
    : score > 40
    ? 'rgba(249,115,22,0.07)'
    : 'rgba(234,179,8,0.05)';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ background: color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 0] }}
          transition={{ duration: 0.8, times: [0, 0.2, 0.6, 1] }}
        />
      )}
    </AnimatePresence>
  );
}