'use client';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

interface Props { score: number; repoUrl: string; }

const THRESHOLDS = [
  { min: 70, color: '#ef4444', label: 'CRITICAL RISK', glow: '0 0 40px rgba(239,68,68,0.25)' },
  { min: 40, color: '#f97316', label: 'HIGH RISK',     glow: '0 0 30px rgba(249,115,22,0.2)' },
  { min: 10, color: '#eab308', label: 'MEDIUM RISK',   glow: '0 0 20px rgba(234,179,8,0.15)' },
  { min: 0,  color: '#22c55e', label: 'LOW RISK',      glow: '0 0 20px rgba(34,197,94,0.15)' },
];

export default function ThreatScore({ score, repoUrl }: Props) {
  const t = THRESHOLDS.find(th => score >= th.min) ?? THRESHOLDS[3];
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));

  useEffect(() => {
    const ctrl = animate(count, score, { duration: 1.4, ease: 'easeOut' });
    return ctrl.stop;
  }, [score, count]);

  return (
    <div className="hud-bracket p-2 md:p-3">
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: 'var(--muted)' }}>
          threat score
        </span>
        <span
          className="font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-sm"
          style={{ color: t.color, background: t.color + '18', border: `1px solid ${t.color}30` }}
        >
          {t.label}
        </span>
      </div>

      {/* The number — responsive font size for mobile/desktop */}
      <div className="flex items-end gap-3 mb-2">
        <motion.span
          className="font-display font-bold leading-none text-7xl md:text-[88px]"
          style={{
            letterSpacing: '-0.05em',
            color: t.color,
            textShadow: t.glow,
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.span>{rounded}</motion.span>
        </motion.span>
        <div className="mb-3 flex flex-col">
          <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>/100</span>
        </div>
      </div>

      {/* Severity bar — thin, precise */}
      <div className="h-px rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${t.color}88, ${t.color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </div>

      {/* Repo URL — mono, truncated, dim */}
      <p className="font-mono text-[9px] mt-2 md:mt-3 truncate" style={{ color: 'var(--muted)' }}>
        {repoUrl.replace('https://github.com/', '')}
      </p>
    </div>
  );
}