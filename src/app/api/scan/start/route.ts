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

  // Normalize the URL to lowercase to prevent case-sensitive cache misses
  const normalizedUrl = `https://github.com/${owner}/${repo}`.toLowerCase();

  // Check cache first (6-hour TTL)
  const { data: cached } = await supabaseAdmin
    .from('scan_cache')
    .select('*')
    .eq('repo_url', normalizedUrl)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    const { data: existingScan } = await supabaseAdmin
      .from('scans')
      .insert({
        repo_url: normalizedUrl,
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
    .insert({ repo_url: normalizedUrl, repo_owner: owner, repo_name: repo, status: 'scanning' })
    .select()
    .single();

  if (error || !scan) {
    console.error('Supabase insert failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to create scan' }, { status: 500 });
  }

  // Trigger the run route — AWAITED with a short timeout.
  // This guarantees the request actually leaves before this function
  // terminates. We don't wait for the full scan, just for /run to
  // accept the trigger (it runs the real work independently afterward).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://specter-seven.vercel.app';
  try {
    await fetch(`${appUrl}/api/scan/${scan.id}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET ?? 'specter-internal',
      },
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.error('Failed to trigger run route:', err);
    // Don't fail the whole request — the scan row exists, the frontend
    // can still poll it. But this log line is how we'll catch this
    // happening again in Vercel logs.
  }

  return NextResponse.json({ scanId: scan.id });
}