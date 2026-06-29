import { getFileContent, getRepoTree } from '@/lib/github';
import type { ApiEndpoint, Severity } from '@/types';

const ROUTE_PATTERNS = [
  { re: /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, fw: 'express' },
  { re: /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, fw: 'fastapi' },
  { re: /@app\.route\s*\(\s*['"`]([^'"`]+)['"`]/gi, fw: 'flask' },
];

const AUTH_HINTS = [
  'authenticate','authorize','requireAuth','isAuthenticated','verifyToken',
  'authMiddleware','passport.authenticate','jwt.verify','verifyJWT',
  'checkAuth','requireLogin','withAuth','getSession','getServerSession',
  'currentUser','req.user','session.user','Bearer','Authorization',
];

const SENSITIVE = [
  { re: /\/admin/i, msg: 'Admin route exposed without auth check' },
  { re: /\/debug/i, msg: 'Debug endpoint exposed' },
  { re: /\/internal/i, msg: 'Internal route exposed publicly' },
  { re: /\/secret/i, msg: 'Route named "secret" — high-value target' },
  { re: /\/config/i, msg: 'Config endpoint may leak sensitive settings' },
];

function analyzeFile(content: string, filepath: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  // Next.js App Router handlers
  if (filepath.includes('/api/') && (filepath.endsWith('.ts') || filepath.endsWith('.js'))) {
    const path = filepath.replace(/^src\/app/, '').replace(/\/route\.(ts|js)$/, '').replace(/\/page\.(tsx|jsx)$/, '') || '/';
    const methods: string[] = [];
    if (/export\s+(?:async\s+)?function\s+GET/.test(content)) methods.push('GET');
    if (/export\s+(?:async\s+)?function\s+POST/.test(content)) methods.push('POST');
    if (/export\s+(?:async\s+)?function\s+PUT/.test(content)) methods.push('PUT');
    if (/export\s+(?:async\s+)?function\s+DELETE/.test(content)) methods.push('DELETE');
    if (/export\s+(?:async\s+)?function\s+PATCH/.test(content)) methods.push('PATCH');
    if (methods.length === 0 && /export\s+default/.test(content)) methods.push('ANY');

    for (const method of methods) {
      const hasAuth = AUTH_HINTS.some((h) => content.includes(h));
      const issues: string[] = [];
      SENSITIVE.forEach(({ re, msg }) => { if (re.test(path)) issues.push(msg); });
      if (!hasAuth && ['POST','PUT','DELETE','PATCH','ANY'].includes(method)) issues.push('No authentication detected on write endpoint');
      if (content.includes('cors') && content.includes('*')) issues.push('CORS wildcard (*) detected');
      if (!/rateLimit|rateLimiter|rate-limit/.test(content)) issues.push('No rate limiting detected');

      let severity: Severity = 'info';
      if (issues.some((i) => i.includes('Admin') || i.includes('No authentication'))) severity = 'critical';
      else if (issues.some((i) => i.includes('CORS') || i.includes('exposed'))) severity = 'high';
      else if (issues.length > 0) severity = 'medium';

      endpoints.push({ path, method, file: filepath, hasAuth, issues, severity });
    }
    return endpoints;
  }

  // Framework route patterns
  for (const { re, fw } of ROUTE_PATTERNS) {
    re.lastIndex = 0;
    for (const match of content.matchAll(re)) {
      const method = (match[1] ?? 'GET').toUpperCase();
      const path = match[2] ?? '/unknown';
      const surrounding = content.substring(Math.max(0, match.index! - 400), match.index! + 400);
      const hasAuth = AUTH_HINTS.some((h) => surrounding.includes(h));
      const issues: string[] = [];
      if (!hasAuth && ['POST','PUT','DELETE','PATCH'].includes(method)) issues.push(`No authentication on ${method} ${path}`);
      SENSITIVE.forEach(({ re: sre, msg }) => { if (sre.test(path)) issues.push(msg); });

      const severity: Severity = !hasAuth && ['POST','PUT','DELETE','PATCH'].includes(method) ? 'high' : issues.length > 0 ? 'medium' : 'info';
      endpoints.push({ path, method, file: filepath, hasAuth, issues, severity });
    }
  }

  return endpoints;
}

export async function runAPIBleed(owner: string, repo: string) {
  const tree = await getRepoTree(owner, repo);
  const files = tree.filter((f) =>
    (f.path.endsWith('.ts') || f.path.endsWith('.js') || f.path.endsWith('.py')) &&
    !f.path.includes('node_modules') && !f.path.includes('.min.') && !f.path.includes('.d.ts') &&
    (f.path.includes('/api/') || f.path.includes('route') || f.path.includes('controller') || f.path.includes('router') || f.path.includes('handler'))
  ).slice(0, 35);

  const endpoints: ApiEndpoint[] = [];
  for (const file of files) {
    const content = await getFileContent(owner, repo, file.path);
    if (content) endpoints.push(...analyzeFile(content, file.path));
    await new Promise((r) => setTimeout(r, 80));
  }

  const deduped = endpoints.filter((e, i, arr) =>
    arr.findIndex((x) => x.path === e.path && x.method === e.method) === i
  );

  return {
    endpoints: deduped,
    unsecuredCount: deduped.filter((e) => !e.hasAuth && ['POST','PUT','DELETE','PATCH'].includes(e.method)).length,
  };
}