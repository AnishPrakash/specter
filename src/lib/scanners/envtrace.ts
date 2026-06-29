import { getFileContent, getRepoTree } from '@/lib/github';
import type { EnvFinding, Severity } from '@/types';

const CRED_PATTERNS = [
  { name: 'Database URL',    re: /(?:DATABASE_URL|DB_URL|MONGO_URI|REDIS_URL|POSTGRES_URL)\s*=\s*["']?[a-z]+:\/\/[^\s"']+/gi },
  { name: 'AWS Credentials', re: /(?:AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)\s*=\s*["']?[A-Za-z0-9+/]{16,}/gi },
  { name: 'API Key',         re: /(?:API_KEY|SECRET_KEY|PRIVATE_KEY|AUTH_TOKEN)\s*=\s*["']?[A-Za-z0-9_\-]{16,}["']?/gi },
  { name: 'OAuth Secret',    re: /(?:CLIENT_SECRET|OAUTH_SECRET|APP_SECRET)\s*=\s*["']?[A-Za-z0-9_\-]{8,}["']?/gi },
  { name: 'Stripe Key',      re: /(?:sk_live|pk_live)_[A-Za-z0-9]{24,}/gi },
];

const ENV_NAMES = ['.env', '.env.production', '.env.staging', '.env.local', '.env.development', '.env.prod'];

function isPlaceholder(val: string): boolean {
  return !val || val.startsWith('your_') || val.startsWith('xxx') || val.startsWith('<') || val.length < 5;
}

export async function runEnvTrace(owner: string, repo: string) {
  const findings: EnvFinding[] = [];
  const tree = await getRepoTree(owner, repo);

  // Detect committed .env files with real values
  const envFiles = tree.filter((f) => ENV_NAMES.includes(f.path.split('/').pop() ?? ''));
  for (const ef of envFiles) {
    const content = await getFileContent(owner, repo, ef.path);
    if (!content) continue;
    let hasReal = false;
    content.split('\n').forEach((line, i) => {
      if (line.startsWith('#') || !line.includes('=')) return;
      const val = line.split('=').slice(1).join('=').trim().replace(/["']/g, '');
      if (!isPlaceholder(val)) {
        hasReal = true;
        findings.push({
          file: ef.path, type: 'exposed_env', severity: 'critical',
          detail: `Real value on line ${i + 1}: ${line.split('=')[0]}=[REDACTED]`, line: i + 1,
        });
      }
    });
    if (!hasReal) findings.push({ file: ef.path, type: 'exposed_env', severity: 'medium', detail: 'Env file in repo — even placeholders expose your env var schema to attackers' });
  }

  // Check .gitignore
  const gitignore = await getFileContent(owner, repo, '.gitignore');
  if (!gitignore?.includes('.env')) {
    findings.push({ file: '.gitignore', type: 'missing_gitignore', severity: 'high', detail: '.env not in .gitignore — any future .env commit will be immediately tracked by git' });
  }

  // Check .env.example for real values
  const examples = tree.filter((f) => f.path.includes('.env.example') || f.path.includes('.env.sample'));
  for (const ex of examples) {
    const content = await getFileContent(owner, repo, ex.path);
    if (!content) continue;
    for (const { name, re } of CRED_PATTERNS) {
      re.lastIndex = 0;
      const m = content.match(re);
      if (m) findings.push({ file: ex.path, type: 'hardcoded_secret', severity: 'high', detail: `${name} with real-looking value in example file: ${m[0].split('=')[0]}=[REDACTED]` });
    }
  }

  // Check source files for hardcoded creds
  const sources = tree.filter((f) =>
    (f.path.endsWith('.ts') || f.path.endsWith('.js') || f.path.endsWith('.py') || f.path.endsWith('.go')) &&
    !f.path.includes('node_modules') && !f.path.includes('.min.')
  ).slice(0, 25);

  for (const src of sources) {
    const content = await getFileContent(owner, repo, src.path);
    if (!content) continue;
    content.split('\n').forEach((line, i) => {
      for (const { name, re } of CRED_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(line)) {
          findings.push({ file: src.path, type: 'hardcoded_secret', severity: 'critical', detail: `${name} hardcoded in source code at line ${i + 1}`, line: i + 1 });
        }
      }
    });
    await new Promise((r) => setTimeout(r, 60));
  }

  return { findings };
}