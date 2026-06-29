'use client';
import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useScanStore } from '@/store/scanStore';
import type { ScanResult } from '@/types';

const SpectreScene = dynamic(() => import('@/components/Scene/SpectreScene'), { ssr: false });

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();
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
    <main className="relative w-full h-screen overflow-hidden bg-gray-950">
      {/* Full-screen 3D background */}
      <div className="absolute inset-0">
        <SpectreScene />
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
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

          {/* Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && url && startScan(url)}
              placeholder="https://github.com/owner/repo"
              disabled={loading}
              className="flex-1 bg-gray-900/80 border border-blue-500/40 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 text-sm backdrop-blur-sm transition-all"
            />
            <button
              onClick={() => url && startScan(url)}
              disabled={loading || !url}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              {loading ? 'Scanning...' : 'Scan Repo'}
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadDemo('event-stream.json')}
              disabled={loading}
              className="bg-red-900/50 hover:bg-red-800/60 border border-red-500/30 hover:border-red-400/50 text-red-300 text-xs font-medium px-4 py-2.5 rounded-lg transition-all backdrop-blur-sm"
            >
              ⚡ Demo: event-stream attack (2018)
            </button>
            <button
              onClick={() => loadDemo('node-ipc.json')}
              disabled={loading}
              className="bg-orange-900/50 hover:bg-orange-800/60 border border-orange-500/30 hover:border-orange-400/50 text-orange-300 text-xs font-medium px-4 py-2.5 rounded-lg transition-all backdrop-blur-sm"
            >
              ⚡ Demo: node-ipc protestware (2022)
            </button>
          </div>

          {/* Scanner badges */}
          <div className="flex gap-2 justify-center mt-8 flex-wrap">
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