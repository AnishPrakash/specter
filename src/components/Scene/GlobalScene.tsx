'use client';
import dynamic from 'next/dynamic';

// Safe to use ssr: false here because we are inside a 'use client' file
const SpectreScene = dynamic(() => import('./SpectreScene'), { ssr: false });

export default function GlobalScene() {
  return <SpectreScene />;
}