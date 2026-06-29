// src/components/ui/AIPanel.tsx
'use client';
import { motion } from 'framer-motion';
import type { AIExplanation } from '@/types';

interface Props { explanation: AIExplanation; }

export default function AIPanel({ explanation }: Props) {
  return (
    <motion.div
      className="px-4 pb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      {/* Section divider — not a full-width line, a terminal-style header */}
      <div className="flex items-center gap-2 my-4">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--accent-hi)' }}>
          ▶ AI INTELLIGENCE BRIEF
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(90deg, var(--accent)33, transparent)' }}
        />
      </div>

      {/* Summary — this is the analyst's overall assessment */}
      <div
        className="p-3 rounded mb-4"
        style={{
          background: 'rgba(37,99,235,0.05)',
          border: '1px solid rgba(37,99,235,0.15)',
        }}
      >
        <p className="font-body text-[11px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          {explanation.summary}
        </p>
      </div>

      {/* Individual items — analyst breakdown per finding */}
      <div className="space-y-3">
        {explanation.items.map((item, i) => (
          <motion.div
            key={i}
            className="rounded overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            {/* Item header — critical color, mono font */}
            <div
              className="px-3 py-2 flex items-center gap-2"
              style={{
                background: 'rgba(239,68,68,0.06)',
                borderBottom: '1px solid rgba(239,68,68,0.12)',
              }}
            >
              <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#ef4444', boxShadow: '0 0 4px #ef444480' }} />
              <span className="font-mono text-[10px] font-bold leading-snug" style={{ color: '#f87171' }}>
                {item.title}
              </span>
            </div>

            {/* Fields */}
            <div className="p-3 space-y-2.5">
              {[
                { label: 'Why dangerous', value: item.why_dangerous, color: 'var(--ink)' },
                { label: 'Fix', value: item.exact_fix, color: 'var(--specter)' },
                { label: 'Real example', value: item.real_example, color: 'var(--muted)', italic: true },
              ].map(({ label, value, color, italic }) => (
                <div key={label}>
                  <span
                    className="font-mono text-[8px] tracking-widest uppercase block mb-0.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    {label}
                  </span>
                  <p
                    className={`font-body text-[11px] leading-relaxed ${italic ? 'italic' : ''}`}
                    style={{ color }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}