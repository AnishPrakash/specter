import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { scanId: string } }) {
  const { data: scan } = await supabaseAdmin.from('scans').select('*').eq('id', params.scanId).single();
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });

  const { data: cache } = await supabaseAdmin.from('scan_cache').select('*').eq('repo_url', scan.repo_url).single();
  return NextResponse.json({ scan, cache });
}