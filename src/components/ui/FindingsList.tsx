'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScanResult, Severity } from '@/types';

interface Props { result: ScanResult; }

interface Finding {
  id: string; scanner: string; severity: Severity; title: string; detail: string;
}

// Severity config strictly using CSS tokens for perfect consistency
const SEV_CONFIG: Record<Severity, {
  dotColor: string; textColor: string; bgColor: string; borderColor: string; label: string;
}> = {
  critical: {
    dotColor:    'var(--critical)',
    textColor:   'var(--critical)',
    bgColor:     'var(--critical-dim)',
    borderColor: 'color-mix(in srgb, var(--critical) 25%, transparent)',
    label:       'CRIT',
  },
  high: {
    dotColor:    'var(--high)',
    textColor:   'var(--high)',
    bgColor:     'var(--high-dim)',
    borderColor: 'color-mix(in srgb, var(--high) 25%, transparent)',
    label:       'HIGH',
  },
  medium: {
    dotColor:    'var(--medium)',
    textColor:   'var(--medium)',
    bgColor:     'var(--medium-dim)',
    borderColor: 'color-mix(in srgb, var(--medium) 25%, transparent)',
    label:       'MED',
  },
  low: {
    dotColor:    'var(--ink)',
    textColor:   'var(--ink)',
    bgColor:     'var(--surface)',
    borderColor: 'var(--border)',
    label:       'LOW',
  },
  info: {
    dotColor:    'var(--muted)',
    textColor:   'var(--muted)',
    bgColor:     'var(--surface)',
    borderColor: 'var(--border)',
    label:       'INFO',
  },
};

function extractFindings(r: ScanResult): Finding[] {
  const out: Finding[] = [];
  const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

  r.depchain?.nodes
    .filter(n => (n.cves?.length ?? 0) > 0)
    .forEach(n => n.cves.forEach(c => out.push({
      id: `dep-${n.id}-${c.id}`, scanner: 'DepChain',
      severity: c.severity, title: `${n.name}@${n.version}`, detail: c.summary,
    })));

  r.ghostcommit?.findings.forEach((f, i) => out.push({
    id: `ghost-${i}`, scanner: 'GhostCommit', severity: 'critical',
    title: f.type, detail: `${f.file}:${f.line} · entropy ${f.entropy.toFixed(1)}`,
  }));

  r.layerscan?.findings.forEach((f, i) => out.push({
    id: `layer-${i}`, scanner: 'LayerScan',
    severity: f.severity, title: f.issue.substring(0, 55), detail: f.fix.substring(0, 90),
  }));

  r.apibleed?.endpoints
    .filter(e => e.issues.length > 0)
    .forEach((e, i) => out.push({
      id: `api-${i}`, scanner: 'APIBleed',
      severity: e.severity, title: `${e.method} ${e.path}`, detail: e.issues[0],
    }));

  r.envtrace?.findings.forEach((f, i) => out.push({
    id: `env-${i}`, scanner: 'EnvTrace',
    severity: f.severity, title: f.file, detail: f.detail.substring(0, 90),
  }));

  return out.sort((a, b) => (SEV_ORDER[a.severity] ?? 5) - (SEV_ORDER[b.severity] ?? 5));
}

export default function FindingsList({ result }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const findings = extractFindings(result);

  return (
    <div className="px-5 py-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--muted)' }}>
          {findings.length} finding{findings.length !== 1 ? 's' : ''}
        </span>
        {findings.length > 0 && (
          <div
            className="h-px flex-1 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }}
          />
        )}
      </div>

      {findings.length === 0 ? (
        <div className="text-center py-8">
          <div className="font-mono text-xl mb-2" style={{ color: 'var(--safe)' }}>ALL CLEAR</div>
          <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
            0 threats detected across 5 scanners
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {findings.map((f, i) => {
            const cfg = SEV_CONFIG[f.severity] ?? SEV_CONFIG.info;
            const isOpen = expanded === f.id;
            
            return (
              <motion.div
                key={f.id}
                className="rounded-sm overflow-hidden cursor-pointer"
                style={{
                  background: cfg.bgColor,
                  border: `1px solid ${cfg.borderColor}`,
                }}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, duration: 0.22 }}
                onClick={() => setExpanded(isOpen ? null : f.id)}
              >
                {/* Primary row */}
                <div className="flex items-start gap-2.5 p-2.5">
                  {/* Severity LED */}
                  <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: cfg.dotColor,
                        boxShadow: `0 0 6px color-mix(in srgb, ${cfg.dotColor} 50%, transparent)`,
                      }}
                    />
                    <span
                      className="font-mono text-[8px] font-bold tracking-wider leading-none"
                      style={{ color: cfg.textColor }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      {/* Title — mono, this is the data */}
                      <span
                        className="font-mono text-[11px] font-bold leading-snug truncate"
                        style={{ color: cfg.textColor }}
                      >
                        {f.title}
                      </span>
                      {/* Scanner label */}
                      <span
                        className="font-mono text-[8px] tracking-wider shrink-0"
                        style={{ color: 'var(--muted)' }}
                      >
                        {f.scanner.toUpperCase()}
                      </span>
                    </div>

                    {/* Detail — body font, truncated until expanded */}
                    <p
                      className={`font-body text-[10px] mt-1 leading-relaxed ${isOpen ? '' : 'line-clamp-1'}`}
                      style={{ color: 'var(--ink)' }}
                    >
                      {f.detail}
                    </p>
                  </div>
                </div>

                {/* Expanded fix section */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="mx-2.5 mb-2.5 p-2.5 rounded-sm text-[10px] font-mono leading-relaxed"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--ink)',
                        }}
                      >
                        {f.detail}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}