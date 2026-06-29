import type { DepNode, DepEdge, CVE, Severity } from '@/types';
import { getFileContent } from '@/lib/github';

const REGISTRY_BASE = 'https://registry.npmjs.org';
const OSV_API = 'https://api.osv.dev/v1/querybatch';
const npmCache = new Map<string, Record<string, string>>();

function severityFromScore(score: number): Severity {
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  if (score > 0) return 'low';
  return 'info';
}

function cleanVersion(v: string): string {
  return v.replace(/[\^~>=<]/g, '').split(' ')[0].split('||')[0].trim() || 'latest';
}

async function getNpmDeps(name: string, version: string): Promise<Record<string, string>> {
  const key = `${name}@${cleanVersion(version)}`;
  if (npmCache.has(key)) return npmCache.get(key)!;
  try {
    const clean = cleanVersion(version);
    const url = `${REGISTRY_BASE}/${encodeURIComponent(name)}/${clean}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) { npmCache.set(key, {}); return {}; }
    const data = await res.json();
    const deps = data.dependencies ?? {};
    npmCache.set(key, deps);
    return deps;
  } catch {
    npmCache.set(key, {});
    return {};
  }
}

async function buildTree(
  name: string,
  version: string,
  nodes: Map<string, DepNode>,
  edges: DepEdge[],
  depth: number,
  parentId: string | null
): Promise<void> {
  if (depth > 3) return;
  const id = `${name}@${cleanVersion(version)}`;
  if (nodes.has(id)) {
    if (parentId) edges.push({ from: parentId, to: id });
    return;
  }
  nodes.set(id, {
    id,
    name,
    version: cleanVersion(version),
    cves: [],
    ecosystem: 'npm',
    isDirect: depth === 1,
  });
  if (parentId) edges.push({ from: parentId, to: id });

  const deps = await getNpmDeps(name, version);
  await Promise.allSettled(
    Object.entries(deps)
      .slice(0, 10)
      .map(([n, v]) => buildTree(n, v, nodes, edges, depth + 1, id))
  );
}

async function queryOSV(packages: { name: string; version: string }[]): Promise<Map<string, CVE[]>> {
  const cveMap = new Map<string, CVE[]>();
  const batchSize = 50;

  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize);
    try {
      const res = await fetch(OSV_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: batch.map((p) => ({
            package: { name: p.name, ecosystem: 'npm' },
            version: p.version,
          })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      (data.results ?? []).forEach(
        (result: { vulns?: any[] }, idx: number) => {
          const pkg = batch[idx];
          const cves: CVE[] = (result.vulns ?? []).map((v) => {
            // OSV returns severity as an array of objects with type and score
            // CVSS score can be nested under severity[].score (numeric)
            // or as a string in database_specific or ecosystem_specific
            let score = 5.0;
            if (v.severity?.length > 0) {
              // Try numeric score first
              const numericSev = v.severity.find((s: any) => typeof s.score === 'number');
              if (numericSev) {
                score = numericSev.score;
              } else {
                // CVSS string score — parse the base score from the vector
                const stringSev = v.severity.find((s: any) => typeof s.score === 'string');
                if (stringSev?.score) {
                  const match = stringSev.score.match(/\/(\d+\.\d+)$/);
                  if (match) score = parseFloat(match[1]);
                }
              }
            }
            // database_specific fallback
            if (score === 5.0 && v.database_specific?.severity) {
              const dbSev = v.database_specific.severity.toLowerCase();
              score = dbSev === 'critical' ? 9.5 : dbSev === 'high' ? 7.5 : dbSev === 'moderate' ? 5.0 : 2.0;
            }

            // Summary fallback chain
            const summary =
              (v.summary && v.summary.trim()) ||
              (v.details && v.details.trim().split('\n')[0].substring(0, 120)) ||
              v.id;

            return {
              id: v.id,
              severity: severityFromScore(score),
              score,
              summary,
              fixed_in: v.affected?.[0]?.ranges?.[0]?.events?.find((e: any) => e.fixed)?.fixed,
            };
          });
          if (cves.length > 0) cveMap.set(`${pkg.name}@${pkg.version}`, cves);
        }
      );
    } catch {}
  }
  return cveMap;
}

export async function runDepChain(owner: string, repo: string) {
  const pkgContent = await getFileContent(owner, repo, 'package.json');
  if (!pkgContent) return { nodes: [], edges: [], vulnCount: 0 };

  let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  try { parsed = JSON.parse(pkgContent); } catch { return { nodes: [], edges: [], vulnCount: 0 }; }

  const allDeps = { ...parsed.dependencies, ...parsed.devDependencies };
  const nodes = new Map<string, DepNode>();
  const edges: DepEdge[] = [];
  const rootId = `${owner}/${repo}@root`;

  nodes.set(rootId, {
    id: rootId,
    name: `${owner}/${repo}`,
    version: 'root',
    isRoot: true,
    cves: [],
    ecosystem: 'npm',
  });

  await Promise.allSettled(
    Object.entries(allDeps)
      .slice(0, 25)
      .map(([name, version]) => buildTree(name, version, nodes, edges, 1, rootId))
  );

  const pkgList = Array.from(nodes.values())
    .filter((n) => !n.isRoot)
    .map((n) => ({ name: n.name, version: n.version }));

  const cveMap = await queryOSV(pkgList);

  let vulnCount = 0;
  nodes.forEach((node) => {
    const cves = cveMap.get(`${node.name}@${node.version}`) ?? [];
    node.cves = cves;
    if (cves.length > 0) vulnCount++;
  });

  return { nodes: Array.from(nodes.values()), edges, vulnCount };
}