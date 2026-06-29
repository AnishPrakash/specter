'use client';
import ThreatScore from '@/components/ui/ThreatScore';
import ScannerBadges from '@/components/ui/ScannerBadges';
import FindingsList from '@/components/ui/FindingsList';
import AIPanel from '@/components/ui/AIPanel';
import ThreatFlash from '@/components/ui/ThreatFlash';
import ScanLoader from '@/components/ui/ScanLoader';
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

  const handleBack = () => {
    reset();
    router.back();
  };

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

      {scanResult && <ThreatFlash score={scanResult.threatScore} />}

      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 group transition-all duration-200 z-50 relative p-6"
      >
        <span
          className="font-mono text-[9px] tracking-widest uppercase"
          style={{ color: 'var(--muted)' }}
        >
          ← NEW SCAN
        </span>
      </button>

      {/* Loading state */}
      {(isPolling || isLoading) && !scanResult && (
        <AnimatePresence>
          <ScanLoader />
        </AnimatePresence>
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
            className="absolute top-0 right-0 h-full z-30 w-[380px] flex flex-col"
            style={{
              background: 'rgba(4,8,15,0.96)',
              borderLeft: '1px solid var(--border-hi)',
              backdropFilter: 'blur(8px)',
            }}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
          >
            {/* Scan-line sweep effect */}
            <div className="scan-line-effect absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-none" />

            {/* Score header — generous top padding to clear the top bar */}
            <div className="px-5 pt-16 pb-4 shrink-0 relative" style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Export PDF Button positioned correctly within the new layout */}
              <div className="absolute top-4 right-5 z-20">
                <button
                  onClick={() => generateReport(scanResult!)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-200 cursor-pointer"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-hi)',
                    color: 'var(--ink)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-hi)';
                    e.currentTarget.style.color = 'var(--white)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-hi)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }}
                >
                  {/* Download icon — SVG, never emoji */}
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 1v7M3 6l3 3 3-3M2 10h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span className="font-mono text-[10px] tracking-wider">EXPORT PDF</span>
                </button>
              </div>
              
              <ThreatScore score={scanResult!.threatScore} repoUrl={scanResult!.repoUrl} />
            </div>

            {/* Scanner badges */}
            <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <ScannerBadges result={scanResult!} />
            </div>

            {/* Scrollable findings + AI */}
            <div className="flex-1 overflow-y-auto relative z-20">
              <FindingsList result={scanResult!} />
              {scanResult!.aiExplanation && <AIPanel explanation={scanResult!.aiExplanation} />}
            </div>

            {/* Footer — repo URL, mono, dim */}
            <div
              className="px-5 py-2.5 shrink-0 flex items-center justify-between relative z-20"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span className="font-mono text-[9px]" style={{ color: 'var(--muted)' }}>
                {scanResult!.repoUrl.replace('https://github.com/', '')}
              </span>
              <div
                className="w-1.5 h-1.5 rounded-full animate-threat-pulse"
                style={{ background: 'var(--safe)', boxShadow: '0 0 4px rgba(34,197,94,0.6)' }}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}