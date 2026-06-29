'use client';
import { motion } from 'framer-motion';
import type { ScanResult } from '@/types';

interface Props { result: ScanResult; }

const SCANNERS = [
  { key: 'depchain',    label: 'DepChain',   abbr: 'DEP' },
  { key: 'ghostcommit', label: 'GhostCommit',abbr: 'GST' },
  { key: 'layerscan',   label: 'LayerScan',  abbr: 'LYR' },
  { key: 'apibleed',    label: 'APIBleed',   abbr: 'API' },
  { key: 'envtrace',    label: 'EnvTrace',   abbr: 'ENV' },
];

export default function ScannerBadges({ result }: Props) {
  return (
    <div>
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase block mb-2"
        style={{ color: 'var(--muted)' }}>
        scanner status
      </span>
      <div className="grid grid-cols-5 gap-1">
        {SCANNERS.map(({ key, label, abbr }, i) => {
          const active = !!result[key as keyof ScanResult];
          
          return (
            <motion.div
              key={key}
              className="relative flex flex-col items-center py-2 px-1 rounded-sm"
              style={{
                background: active ? 'var(--safe-dim)' : 'var(--surface)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--safe) 20%, transparent)' : 'var(--border)'}`,
              }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
            >
              {/* Status LED */}
              <div
                className="w-1.5 h-1.5 rounded-full mb-1.5"
                style={{
                  background: active ? 'var(--safe)' : 'var(--muted)',
                  boxShadow: active ? '0 0 6px color-mix(in srgb, var(--safe) 60%, transparent)' : 'none',
                }}
              />
              {/* Abbreviation — the primary HUD read */}
              <span
                className="font-mono text-[9px] font-bold tracking-wider leading-none mb-0.5"
                style={{ color: active ? 'var(--safe)' : 'var(--muted)' }}
              >
                {abbr}
              </span>
              {/* Full label — secondary */}
              <span className="font-mono text-[7px] leading-none" style={{ color: 'var(--muted)' }}>
                {active ? 'OK' : '—'}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}