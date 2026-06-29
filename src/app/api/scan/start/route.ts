import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseRepoUrl, clearFileCache } from '@/lib/github';
import { runDepChain } from '@/lib/scanners/depchain';
import { runGhostCommit } from '@/lib/scanners/ghostcommit';
import { runLayerScan } from '@/lib/scanners/layerscan';
import { runAPIBleed } from '@/lib/scanners/apibleed';
import { runEnvTrace } from '@/lib/scanners/envtrace';

// TODO: Ensure you import your rateLimit function here
import { rateLimit } from '@/lib/rateLimit'; 

function calcThreatScore(r: { depchain: any; ghostcommit: any; layerscan: any; apibleed: any; envtrace: any }): number {
  const critDockerEnv =
    (r.layerscan?.findings?.filter((f: any) => f.severity === 'critical').length ?? 0) +
    (r.envtrace?.findings?.filter((f: any) => f.severity === 'critical').length ?? 0);
  const vulnDeps = r.depchain?.vulnCount ?? 0;
  const secrets = r.ghostcommit?.findings?.length ?? 0;
  const unsecuredApis = r.apibleed?.unsecuredCount ?? 0;
  return Math.min(
    Math.min(critDockerEnv * 15, 40) +
    Math.min(vulnDeps * 8, 30) +
    Math.min(secrets * 10, 20) +
    Math.min(unsecuredApis * 5, 10),
    100
  );
}

export async function POST(req: NextRequest) {
  // Rate limiting check added to the top
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
      .insert({ repo_url: repoUrl, repo_owner: owner, repo_name: repo, status: 'completed', threat_score: cached.threat_score })
      .select()
      .single();
    return NextResponse.json({ scanId: existingScan?.id });
  }

  // Create scan record
  const { data: scan } = await supabaseAdmin
    .from('scans')
    .insert({ repo_url: repoUrl, repo_owner: owner, repo_name: repo, status: 'scanning' })
    .select()
    .single();

  const scanId = scan.id;
  clearFileCache();

  // Fire-and-forget background scan
  (async () => {
    try {
      const [dep, ghost, layer, api, env] = await Promise.allSettled([
        runDepChain(owner, repo),
        runGhostCommit(owner, repo),
        runLayerScan(owner, repo),
        runAPIBleed(owner, repo),
        runEnvTrace(owner, repo),
      ]);

      const results = {
        depchain:   dep.status   === 'fulfilled' ? dep.value   : null,
        ghostcommit:ghost.status === 'fulfilled' ? ghost.value : null,
        layerscan:  layer.status === 'fulfilled' ? layer.value : null,
        apibleed:   api.status   === 'fulfilled' ? api.value   : null,
        envtrace:   env.status   === 'fulfilled' ? env.value   : null,
      };

      const threatScore = calcThreatScore(results);

      // Insert all findings
      const allFindings = [
        ...(results.depchain?.nodes?.filter((n: any) => n.cves?.length > 0).flatMap((n: any) =>
          n.cves.map((c: any) => ({ scan_id: scanId, scanner: 'depchain', severity: c.severity, title: `Vulnerable: ${n.name}@${n.version}`, detail: c.summary, package_name: n.name, metadata: { cve_id: c.id, score: c.score, fixed_in: c.fixed_in } }))
        ) ?? []),
        ...(results.ghostcommit?.findings?.map((f: any) => ({ scan_id: scanId, scanner: 'ghostcommit', severity: 'critical', title: `${f.type} in commit`, detail: `${f.file}:${f.line} — entropy ${f.entropy.toFixed(2)}`, file_path: f.file, line_number: f.line, commit_sha: f.commit_sha, metadata: { author: f.author, preview: f.preview } })) ?? []),
        ...(results.layerscan?.findings?.map((f: any) => ({ scan_id: scanId, scanner: 'layerscan', severity: f.severity, title: f.issue.substring(0, 100), detail: f.fix, metadata: { layer: f.layer } })) ?? []),
        ...(results.apibleed?.endpoints?.filter((e: any) => e.issues.length > 0).map((e: any) => ({ scan_id: scanId, scanner: 'apibleed', severity: e.severity, title: `${e.method} ${e.path}`, detail: e.issues.join(' | '), file_path: e.file, metadata: { hasAuth: e.hasAuth } })) ?? []),
        ...(results.envtrace?.findings?.map((f: any) => ({ scan_id: scanId, scanner: 'envtrace', severity: f.severity, title: f.type.replace(/_/g, ' '), detail: f.detail, file_path: f.file, line_number: f.line })) ?? []),
      ];

      if (allFindings.length > 0) await supabaseAdmin.from('findings').insert(allFindings);

      await supabaseAdmin.from('scans').update({ status: 'completed', threat_score: threatScore, completed_at: new Date().toISOString() }).eq('id', scanId);

      await supabaseAdmin.from('scan_cache').upsert({
        repo_url: repoUrl,
        dep_data: results.depchain,
        secret_data: results.ghostcommit,
        docker_data: results.layerscan,
        api_data: results.apibleed,
        env_data: results.envtrace,
        threat_score: threatScore,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      });
    } catch {
      await supabaseAdmin.from('scans').update({ status: 'failed' }).eq('id', scanId);
    }
  })();

  return NextResponse.json({ scanId });
}