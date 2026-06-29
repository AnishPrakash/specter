import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { clearFileCache } from '@/lib/github';
import { runDepChain } from '@/lib/scanners/depchain';
import { runGhostCommit } from '@/lib/scanners/ghostcommit';
import { runLayerScan } from '@/lib/scanners/layerscan';
import { runAPIBleed } from '@/lib/scanners/apibleed';
import { runEnvTrace } from '@/lib/scanners/envtrace';

export const maxDuration = 60;

function calcThreatScore(r: {
  depchain: any; ghostcommit: any; layerscan: any; apibleed: any; envtrace: any;
}): number {
  const sevWeight: Record<string, number> = {
    critical: 15, high: 8, medium: 4, low: 1, info: 0,
  };

  const envFindings = r.envtrace?.findings ?? [];
  const layerFindings = r.layerscan?.findings ?? [];
  const envScore = envFindings.reduce((acc: number, f: any) => acc + (sevWeight[f.severity] ?? 0), 0);
  const layerScore = layerFindings.reduce((acc: number, f: any) => acc + (sevWeight[f.severity] ?? 0), 0);

  const vulnDeps = r.depchain?.vulnCount ?? 0;
  const secrets = r.ghostcommit?.findings?.length ?? 0;
  const unsecuredApis = r.apibleed?.unsecuredCount ?? 0;

  return Math.min(
    Math.min(envScore + layerScore, 40) +
    Math.min(vulnDeps * 8, 30) +
    Math.min(secrets * 10, 20) +
    Math.min(unsecuredApis * 5, 10),
    100
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const secret = req.headers.get('x-internal-secret');
  if (secret !== (process.env.INTERNAL_SECRET ?? 'specter-internal')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { scanId } = await params;

  const { data: scan } = await supabaseAdmin
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  const { repo_owner: owner, repo_name: repo, repo_url: repoUrl } = scan;

  clearFileCache();

  try {
    const [dep, ghost, layer, api, env] = await Promise.allSettled([
      runDepChain(owner, repo),
      runGhostCommit(owner, repo),
      runLayerScan(owner, repo),
      runAPIBleed(owner, repo),
      runEnvTrace(owner, repo),
    ]);

    const results = {
      depchain:    dep.status    === 'fulfilled' ? dep.value    : null,
      ghostcommit: ghost.status  === 'fulfilled' ? ghost.value  : null,
      layerscan:   layer.status  === 'fulfilled' ? layer.value  : null,
      apibleed:    api.status    === 'fulfilled' ? api.value    : null,
      envtrace:    env.status    === 'fulfilled' ? env.value    : null,
    };

    const threatScore = calcThreatScore(results);

    const allFindings = [
      ...(results.depchain?.nodes?.filter((n: any) => n.cves?.length > 0).flatMap((n: any) =>
        n.cves.map((c: any) => ({
          scan_id: scanId, scanner: 'depchain', severity: c.severity,
          title: `Vulnerable: ${n.name}@${n.version}`, detail: c.summary,
          package_name: n.name, metadata: { cve_id: c.id, score: c.score, fixed_in: c.fixed_in },
        }))
      ) ?? []),
      ...(results.ghostcommit?.findings?.map((f: any) => ({
        scan_id: scanId, scanner: 'ghostcommit', severity: 'critical',
        title: `${f.type} in commit`, detail: `${f.file}:${f.line} — entropy ${f.entropy.toFixed(2)}`,
        file_path: f.file, line_number: f.line, commit_sha: f.commit_sha,
        metadata: { author: f.author, preview: f.preview },
      })) ?? []),
      ...(results.layerscan?.findings?.map((f: any) => ({
        scan_id: scanId, scanner: 'layerscan', severity: f.severity,
        title: f.issue.substring(0, 100), detail: f.fix, metadata: { layer: f.layer },
      })) ?? []),
      ...(results.apibleed?.endpoints?.filter((e: any) => e.issues.length > 0).map((e: any) => ({
        scan_id: scanId, scanner: 'apibleed', severity: e.severity,
        title: `${e.method} ${e.path}`, detail: e.issues.join(' | '),
        file_path: e.file, metadata: { hasAuth: e.hasAuth },
      })) ?? []),
      ...(results.envtrace?.findings?.map((f: any) => ({
        scan_id: scanId, scanner: 'envtrace', severity: f.severity,
        title: f.type.replace(/_/g, ' '), detail: f.detail,
        file_path: f.file, line_number: f.line,
      })) ?? []),
    ];

    if (allFindings.length > 0) {
      await supabaseAdmin.from('findings').insert(allFindings);
    }

    await supabaseAdmin
      .from('scans')
      .update({ status: 'completed', threat_score: threatScore, completed_at: new Date().toISOString() })
      .eq('id', scanId);

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

    return NextResponse.json({ ok: true, threatScore });

  } catch (err) {
    console.error('Run route error:', err);
    await supabaseAdmin
      .from('scans')
      .update({ status: 'failed' })
      .eq('id', scanId);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}