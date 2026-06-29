'use client';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useScanStore } from '@/store/scanStore';
import type { ScanResult } from '@/types';

const DEMOS = [
  { id: 'event-stream', label: 'event-stream attack', year: '2018' },
  { id: 'node-ipc',     label: 'node-ipc protest',    year: '2022' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { setScanResult, startPolling, setLoading: setStoreLoading } = useScanStore();

  const startScan = useCallback(async (repoUrl: string) => {
    setErr('');
    setLoading(true);
    setStoreLoading(true);
    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scan failed to start');
      startPolling(data.scanId);
      router.push(`/scan/${data.scanId}`);
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
      setStoreLoading(false);
    }
  }, [router, startPolling, setStoreLoading]);

  const loadDemo = useCallback(async (file: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/demos/${file}`);
      const data: ScanResult = await res.json();
      setScanResult(data);
      router.push(`/scan/${data.scanId}`);
    } catch {
      setErr('Failed to load demo');
      setLoading(false);
    }
  }, [router, setScanResult]);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-transparent">
      {/* Overlay UI - Added pt-24 to push content down slightly */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-auto text-center px-6 max-w-2xl w-full"
        >
          {/* Logo */}
          <div className="mb-2">
            <span className="text-6xl font-black tracking-tighter text-white">SPECTER</span>
          </div>
          <p className="text-blue-400 text-lg mb-10 tracking-wide">
            The ghosts in your codebase. Made visible.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 mb-8 justify-center">
            {[
              { value: '742%', label: 'supply chain attacks up', sub: '2022 → 2024' },
              { value: '8M+',  label: 'devs hit by event-stream', sub: 'Nov 2018' },
              { value: '10B',  label: 'estimated log4shell damage', sub: 'USD' },
            ].map(s => (
              <div key={s.value} className="text-center">
                <div
                  className="font-display font-bold leading-none mb-0.5"
                  style={{ fontSize: 28, color: '#ef4444', letterSpacing: '-0.03em' }}
                >
                  {s.value}
                </div>
                <div className="font-mono text-[9px]" style={{ color: 'var(--muted)' }}>
                  {s.label}
                </div>
                <div className="font-mono text-[8px]" style={{ color: 'var(--border-hi)' }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* URL Input */}
          <div className="relative w-full mb-4">
            <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none"
              style={{ borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)' }} />
            <div className="absolute bottom-0 right-[100px] w-3 h-3 pointer-events-none"
              style={{ borderBottom: '1px solid var(--accent)', borderRight: '1px solid var(--accent)' }} />

            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && url && startScan(url)}
              placeholder="https://github.com/owner/repo"
              disabled={loading}
              className="w-full px-4 py-3.5 rounded-sm outline-none transition-all duration-200 font-mono text-sm disabled:opacity-50"
              style={{
                background: 'rgba(8,13,24,0.9)',
                border: '1px solid var(--border-hi)',
                color: 'var(--specter)',
                caretColor: 'var(--accent)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
            />

            <button
              onClick={() => url && startScan(url)}
              disabled={loading || !url.trim()}
              className="absolute right-0 top-0 bottom-0 px-5 rounded-r-sm font-mono text-[11px] font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer"
              style={{
                background: loading || !url.trim() ? 'var(--surface)' : 'var(--accent)',
                color: loading || !url.trim() ? 'var(--muted)' : 'white',
                borderLeft: '1px solid var(--border-hi)',
              }}
            >
              {loading ? '...' : 'SCAN →'}
            </button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {err && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-red-400 text-sm mb-4"
              >
                {err}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Demo buttons */}
          <div className="flex gap-2.5 w-full mb-8 mt-2">
            {DEMOS.map(d => (
              <button
                key={d.id}
                onClick={() => loadDemo(`${d.id}.json`)}
                disabled={loading}
                className="group relative flex-1 py-3 px-3 rounded overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)')}
                onMouseLeave={e => !loading && (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <span
                  className="block font-mono text-[8px] tracking-[0.2em] uppercase mb-1"
                  style={{ color: '#ef4444' }}
                >
                  {d.year} · CONFIRMED ATTACK
                </span>
                <span
                  className="block font-mono text-[11px] transition-colors duration-200"
                  style={{ color: 'var(--ink)' }}
                >
                  {d.label}
                </span>
                <div
                  className="absolute bottom-0 left-0 right-0 h-px transition-all duration-300"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)' }}
                />
              </button>
            ))}
          </div>

          {/* Scanner badges */}
          <div className="flex gap-2 justify-center flex-wrap">
            {['DepChain','GhostCommit','LayerScan','APIBleed','EnvTrace'].map((s) => (
              <span key={s} className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-1">
                {s}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}