// src/components/ui/ScanLoader.tsx
'use client';
import { motion } from 'framer-motion';

const SCANNERS = [
  { label: 'DepChain',    desc: 'resolving dependency tree...' },
  { label: 'GhostCommit', desc: 'scanning commit history...' },
  { label: 'LayerScan',   desc: 'parsing dockerfile layers...' },
  { label: 'APIBleed',    desc: 'mapping api surface...' },
  { label: 'EnvTrace',    desc: 'tracing env exposure...' },
];

export default function ScanLoader() {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Radar ring */}
      <div className="relative mb-10">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{
              inset: -(i * 18),
              borderColor: `rgba(37,99,235,${0.4 - i * 0.12})`,
            }}
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
          />
        ))}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.4)' }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
        </div>
      </div>

      {/* Scanner list */}
      <div className="flex flex-col gap-2.5 min-w-48">
        {SCANNERS.map((s, i) => (
          <motion.div
            key={s.label}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.18 }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: 'var(--accent)' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
            />
            <span className="font-mono text-[11px]" style={{ color: 'var(--specter)' }}>
              {s.label}
            </span>
            <motion.span
              className="font-mono text-[10px]"
              style={{ color: 'var(--muted)' }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
            >
              {s.desc}
            </motion.span>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="font-mono text-[9px] tracking-widest uppercase mt-8"
        style={{ color: 'var(--muted)' }}
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        initial={{ opacity: 0 }}
      >
        5 SCANNERS RUNNING IN PARALLEL
      </motion.p>
    </motion.div>
  );
}