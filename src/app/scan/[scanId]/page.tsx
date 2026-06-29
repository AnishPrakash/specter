'use client';
import ThreatScore from '@/components/ui/ThreatScore';
import ScannerBadges from '@/components/ui/ScannerBadges';
import FindingsList from '@/components/ui/FindingsList';
import AIPanel from '@/components/ui/AIPanel';
import ThreatFlash from '@/components/ui/ThreatFlash';
import ScanLoader from '@/components/ui/ScanLoader';
import SpecterLogo from '@/components/ui/SpecterLogo';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useScanStore } from '@/store/scanStore';
import { generateReport } from '@/lib/report';

const SCANNER_LABELS: Record<string, string> = {
  depchain: 'DepChain', ghostcommit: 'GhostCommit', layerscan: 'LayerScan',
  apibleed: 'APIBleed', envtrace: 'EnvTrace',
};

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const { scanResult, isPolling, isLoading, error, reset } = useScanStore();
  const aiRef = useRef<{ fetched: boolean }>({ fetched: false });
  
  // ── SLIDER STATE FOR MOBILE ──
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const handleBack = () => {
    reset();
    router.push('/');
  };

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

  const isReady = !!scanResult;

  const SidebarContent = () => (
    <>
      <div className="scan-line-effect absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-none" />
      <div className="px-5 md:pt-16 pt-2 pb-4 shrink-0 relative z-20" style={{ borderBottom: '1px solid var(--border)' }}>
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
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 1v7M3 6l3 3 3-3M2 10h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="font-mono text-[10px] tracking-wider">EXPORT PDF</span>
          </button>
        </div>
        <ThreatScore score={scanResult!.threatScore} repoUrl={scanResult!.repoUrl} />
      </div>

      <div className="px-5 py-3 shrink-0 relative z-20" style={{ borderBottom: '1px solid var(--border)' }}>
        <ScannerBadges result={scanResult!} />
      </div>

      <div className="flex-1 overflow-y-auto relative z-20">
        <FindingsList result={scanResult!} />
        {scanResult!.aiExplanation && <AIPanel explanation={scanResult!.aiExplanation} />}
      </div>

      <div
        className="px-5 py-2.5 shrink-0 flex items-center justify-between relative z-20 bg-void/50 backdrop-blur-sm"
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
    </>
  );

  return (
    <main className="relative w-full h-screen overflow-hidden bg-transparent">
      {isReady && <ThreatFlash score={scanResult!.threatScore} />}

      <button
        onClick={handleBack}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 group transition-all duration-200 px-4 py-2.5 rounded shadow-lg pointer-events-auto cursor-pointer"
        style={{
          background: 'rgba(37,99,235,0.15)',
          border: '1px solid var(--accent)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <SpecterLogo size="sm" />
        <span
          className="font-mono text-[10px] tracking-widest uppercase font-bold text-white group-hover:text-accent-hi transition-colors"
        >
          ← NEW SCAN
        </span>
      </button>

      <AnimatePresence>
        {(isPolling || isLoading) && !isReady && (
          <ScanLoader />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center p-6 rounded-lg border backdrop-blur-md pointer-events-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border-hi)' }}>
              <p className="font-mono text-[11px] mb-4" style={{ color: 'var(--critical)' }}>{error}</p>
              <button 
                onClick={handleBack} 
                className="pointer-events-auto cursor-pointer font-mono text-[10px] tracking-widest uppercase px-4 py-2 rounded-sm transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--ink)', border: '1px solid var(--border-hi)' }}
              >
                TRY ANOTHER REPO →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReady && (
          <>
            {/* Desktop Panel */}
            <motion.aside
              className="hidden md:flex absolute top-0 right-0 h-full w-[380px] lg:w-[400px] flex-col z-30 overflow-hidden pointer-events-auto"
              style={{
                background: 'rgba(4,8,15,0.96)',
                borderLeft: '1px solid var(--border-hi)',
                backdropFilter: 'blur(8px)',
              }}
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            >
              <SidebarContent />
            </motion.aside>

            {/* Mobile Sheet — Now fully draggable and toggleable */}
            <motion.aside
              className="flex md:hidden absolute bottom-0 left-0 right-0 flex-col z-40 overflow-hidden pointer-events-auto"
              style={{
                background: 'rgba(4,8,15,0.97)',
                borderTop: '1px solid var(--border-hi)',
                borderRadius: '20px 20px 0 0',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              }}
              initial={{ y: '100%', height: '40vh' }}
              animate={{ y: 0, height: isMobileExpanded ? '85vh' : '40vh' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Interactive Pull Handle */}
              <motion.div 
                className="flex justify-center pt-4 pb-3 shrink-0 w-full relative z-20 cursor-grab active:cursor-grabbing touch-none"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (info.offset.y < -20) setIsMobileExpanded(true);  // Dragged up
                  if (info.offset.y > 20) setIsMobileExpanded(false); // Dragged down
                }}
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              >
                <div 
                  className="w-12 h-1.5 rounded-full transition-colors" 
                  style={{ background: isMobileExpanded ? 'var(--accent)' : 'var(--border-hi)' }} 
                />
              </motion.div>
              
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}