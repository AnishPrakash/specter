'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useScanStore } from '@/store/scanStore';
import { generateReport } from '@/lib/report';

const SpectreScene = dynamic(() => import('@/components/Scene/SpectreScene'), { ssr: false });

const SCANNER_LABELS: Record<string, string> = {
  depchain: 'DepChain', ghostcommit: 'GhostCommit', layerscan: 'LayerScan',
  apibleed: 'APIBleed', envtrace: 'EnvTrace',
};

const SEV_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-950 border-red-500/30',
  high: 'text-orange-400 bg-orange-950 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-950 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-950 border-blue-500/30',
  info: 'text-gray-400 bg-gray-900 border-gray-700',
};

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const { scanResult, isPolling, isLoading, error, reset } = useScanStore();
  const aiRef = useRef<{ fetched: boolean }>({ fetched: false });

  // Fetch AI explanation once scan completes
  useEffect(() => {
    if (!scanResult || scanResult.status !== 'completed' || aiRef.current.fetched) return;
    if (scanResult.aiExplanation) return;
    aiRef.current.fetched = true;

    const allFindings = [
      ...(scanResult.depchain?.nodes?.filter((n) => (n.cves?.length ?? 0) > 0).flatMap((n) =>
        n.cves.map((c) => ({ scanner: 'depchain', title: `${n.name}@${n.version}`, detail: c.summary, severity: c.severity }))
      ) ?? []),
      ...(scanResult.ghostcommit?.findings?.map((f) => ({ scanner: 'ghostcommit', title: f.type, detail: f.file, severity: 'critical' as const })) ?? []),
      ...(scanResult.layerscan?.findings?.map((f) => ({ scanner: 'layerscan', title: f.issue.substring(0, 60), detail: f.fix, severity: f.severity })) ?? []),
      ...(scanResult.apibleed?.endpoints?.filter((e) => e.issues.length > 0).map((e) => ({ scanner: 'apibleed', title: `${e.method} ${e.path}`, detail: e.issues[0], severity: e.severity })) ?? []),
      ...(scanResult.envtrace?.findings?.map((f) => ({ scanner: 'envtrace', title: f.type, detail: f.detail, severity: f.severity })) ?? []),
    ];

    if (allFindings.length > 0) {
      fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ findings: allFindings }) })
        .then((r) => r.json())
        .then((data) => {
          useScanStore.setState((s) => ({ scanResult: s.scanResult ? { ...s.scanResult, aiExplanation: data } : s.scanResult }));
        })
        .catch(() => {});
    }
  }, [scanResult?.status]);

  const score = scanResult?.threatScore ?? 0;
  const scoreColor = score > 70 ? 'text-red-400' : score > 40 ? 'text-orange-400' : 'text-blue-400';

  const scannerStatus = {
    depchain: !!scanResult?.depchain,
    ghostcommit: !!scanResult?.ghostcommit,
    layerscan: !!scanResult?.layerscan,
    apibleed: !!scanResult?.apibleed,
    envtrace: !!scanResult?.envtrace,
  };

  const allFindings = scanResult ? [
    ...(scanResult.depchain?.nodes?.filter((n) => (n.cves?.length ?? 0) > 0).flatMap((n) =>
      n.cves.map((c) => ({ scanner: 'depchain', severity: c.severity, title: `${n.name}@${n.version}`, detail: c.summary, id: `${n.id}-${c.id}` }))
    ) ?? []),
    ...(scanResult.ghostcommit?.findings?.map((f, i) => ({ scanner: 'ghostcommit', severity: 'critical' as const, title: f.type, detail: `${f.file}:${f.line}`, id: `ghost-${i}` })) ?? []),
    ...(scanResult.layerscan?.findings?.map((f, i) => ({ scanner: 'layerscan', severity: f.severity, title: f.issue.substring(0, 60), detail: f.fix, id: `layer-${i}` })) ?? []),
    ...(scanResult.apibleed?.endpoints?.filter((e) => e.issues.length > 0).map((e, i) => ({ scanner: 'apibleed', severity: e.severity, title: `${e.method} ${e.path}`, detail: e.issues[0], id: `api-${i}` })) ?? []),
    ...(scanResult.envtrace?.findings?.map((f, i) => ({ scanner: 'envtrace', severity: f.severity, title: f.type, detail: f.detail, id: `env-${i}` })) ?? []),
  ].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[a.severity as keyof typeof order] ?? 5) - (order[b.severity as keyof typeof order] ?? 5);
  }) : [];

  return (
    <main className="relative w-full h-screen overflow-hidden bg-gray-950">
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <SpectreScene />
      </div>

      {/* Back button */}
      <button
        onClick={() => { reset(); router.push('/'); }}
        className="absolute top-4 left-4 z-50 bg-gray-900/80 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors backdrop-blur-sm"
      >
        ← New Scan
      </button>

      {/* Loading state */}
      {(isPolling || isLoading) && !scanResult && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="text-blue-400 text-lg font-medium mb-2 animate-pulse">Scanning repository...</div>
            <div className="text-gray-500 text-sm">Running 5 scanners in parallel</div>
          </motion.div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-red-400 text-lg font-medium mb-2">{error}</div>
            <button onClick={() => { reset(); router.push('/'); }} className="text-blue-400 text-sm underline pointer-events-auto">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Right sidebar */}
      <AnimatePresence>
        {scanResult && (
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-[400px] bg-gray-950/95 border-l border-gray-800 flex flex-col backdrop-blur-md z-40 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-800 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">threat score</span>
                <button
                  onClick={() => generateReport(scanResult)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors"
                >
                  Export PDF
                </button>
              </div>
              <div className={`text-6xl font-black mb-1 ${scoreColor}`}>{score}</div>
              <div className="text-gray-500 text-xs">/100 — {score > 70 ? 'CRITICAL RISK' : score > 40 ? 'HIGH RISK' : score > 10 ? 'MEDIUM RISK' : 'LOW RISK'}</div>
              <div className="text-gray-600 text-xs mt-2 font-mono truncate">{scanResult.repoUrl}</div>
            </div>

            {/* Scanner status */}
            <div className="p-4 border-b border-gray-800 shrink-0">
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(scannerStatus).map(([key, ok]) => (
                  <div key={key} className={`text-center p-2 rounded text-xs font-mono ${ok ? 'bg-green-950/50 text-green-400 border border-green-800/30' : 'bg-gray-900 text-gray-600 border border-gray-800'}`}>
                    <div className="text-lg mb-0.5">{ok ? '✓' : '○'}</div>
                    <div className="text-[9px] leading-none">{SCANNER_LABELS[key]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Findings list */}
            <div className="flex-1 overflow-y-auto">
              {allFindings.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">No findings detected.</div>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="text-xs text-gray-500 mb-3 font-mono uppercase tracking-widest px-1">
                    {allFindings.length} findings
                  </div>
                  {allFindings.map((f) => (
                    <div
                      key={f.id}
                      className={`p-3 rounded-lg border text-xs cursor-pointer hover:opacity-90 transition-opacity ${SEV_COLORS[f.severity] ?? SEV_COLORS.info}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="uppercase font-bold text-[10px] opacity-80">{f.severity}</span>
                        <span className="opacity-50">·</span>
                        <span className="opacity-60 font-mono text-[10px]">{SCANNER_LABELS[f.scanner] ?? f.scanner}</span>
                      </div>
                      <div className="font-medium leading-snug mb-1">{f.title}</div>
                      <div className="opacity-60 leading-relaxed line-clamp-2">{f.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Explanation */}
              {scanResult.aiExplanation && (
                <div className="p-3 border-t border-gray-800 mt-2">
                  <div className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-3">AI Analysis</div>
                  <p className="text-gray-300 text-xs leading-relaxed mb-4">{scanResult.aiExplanation.summary}</p>
                  {scanResult.aiExplanation.items.map((item, i) => (
                    <div key={i} className="mb-4 bg-gray-900/60 rounded-lg p-3 border border-gray-800">
                      <div className="text-red-400 font-medium text-xs mb-2">{item.title}</div>
                      <div className="text-gray-400 text-xs mb-2"><span className="text-gray-500">Why dangerous: </span>{item.why_dangerous}</div>
                      <div className="text-gray-400 text-xs mb-2"><span className="text-gray-500">Fix: </span>{item.exact_fix}</div>
                      <div className="text-gray-500 text-xs italic">{item.real_example}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}