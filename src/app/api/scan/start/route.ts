import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseRepoUrl } from '@/lib/github';
import { rateLimit } from '@/lib/rateLimit';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit: 5 scans per hour' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { repoUrl } = body;
  if (!repoUrl) return NextResponse.json({ error: 'repoUrl required' }, { status: 400 });

  let owner: string, repo: string;
  try {
    ({ owner, repo } = parseRepoUrl(repoUrl));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // Check cache first (6-hour TTL)
  const { data: cached } = await supabaseAdmin
    .from('scan_cache')
    .select('*')
    .eq('repo_url', repoUrl)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    const { data: existingScan } = await supabaseAdmin
      .from('scans')
      .insert({
        repo_url: repoUrl,
        repo_owner: owner,
        repo_name: repo,
        status: 'completed',
        threat_score: cached.threat_score,
      })
      .select()
      .single();
    return NextResponse.json({ scanId: existingScan?.id });
  }

  // Create scan record
  const { data: scan, error } = await supabaseAdmin
    .from('scans')
    .insert({ repo_url: repoUrl, repo_owner: owner, repo_name: repo, status: 'scanning' })
    .select()
    .single();

  if (error || !scan) {
    console.error('Supabase insert failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to create scan' }, { status: 500 });
  }

  // Trigger the run route — don't await, use waitUntil pattern via headers
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://specter-seven.vercel.app';
  fetch(`${appUrl}/api/scan/${scan.id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET ?? 'specter-internal' },
  }).catch(() => {}); // intentional — we don't await this

  return NextResponse.json({ scanId: scan.id });
}