import { octokit } from '@/lib/github';
import type { SecretFinding } from '@/types';

function shannon(str: string): number {
  const freq: Record<string, number> = {};
  for (const c of str) freq[c] = (freq[c] ?? 0) + 1;
  return -Object.values(freq).reduce((s, n) => {
    const p = n / str.length;
    return s + p * Math.log2(p);
  }, 0);
}

const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'AWS Access Key',     regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key',     regex: /aws_secret[_\s]*[=:]\s*["']?([A-Za-z0-9/+=]{40})/gi },
  { name: 'GitHub Token',       regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: 'Stripe Secret Key',  regex: /sk_live_[A-Za-z0-9]{24,}/g },
  { name: 'OpenAI Key',         regex: /sk-[A-Za-z0-9]{48}/g },
  { name: 'Anthropic Key',      regex: /sk-ant-[A-Za-z0-9\-_]{90,}/g },
  { name: 'JWT Token',          regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Private Key Block',  regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Slack Token',        regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'Database URL',       regex: /(?:mysql|postgres|mongodb|redis):\/\/[^\s"'<>]+:[^\s"'<>]+@[^\s"'<>]+/gi },
  { name: 'Generic API Key',    regex: /(?:api_key|apikey|auth_token|secret_key)\s*[=:]\s*["']?[A-Za-z0-9_\-]{20,}["']?/gi },
];

const SKIP_EXT = ['.png','.jpg','.jpeg','.gif','.svg','.ico','.woff','.ttf','.eot','.mp4','.zip','.lock','.sum'];

function scanLine(
  line: string,
  lineNum: number,
  file: string,
  commit: { sha: string; message: string; author: string; date: string }
): SecretFinding[] {
  const findings: SecretFinding[] = [];
  if (line.startsWith('-')) return findings;
  const content = line.replace(/^\+/, '');

  for (const { name, regex } of PATTERNS) {
    regex.lastIndex = 0;
    for (const match of content.matchAll(regex)) {
      findings.push({
        commit_sha: commit.sha,
        commit_message: commit.message,
        author: commit.author,
        date: commit.date,
        file,
        line: lineNum,
        type: name,
        entropy: shannon(match[0]),
        preview: match[0].substring(0, 8) + '••••••••',
      });
    }
  }

  // High-entropy token detection
  const tokens = content
    .split(/[\s"'`=:,{}[\]()\n\r]+/)
    .filter((t) => t.length >= 20 && t.length <= 120 && /^[A-Za-z0-9+/=_\-]+$/.test(t));

  for (const token of tokens) {
    const ent = shannon(token);
    if (ent > 4.5 && !findings.some((f) => content.includes(f.preview.split('•')[0]))) {
      findings.push({
        commit_sha: commit.sha,
        commit_message: commit.message,
        author: commit.author,
        date: commit.date,
        file,
        line: lineNum,
        type: 'High-entropy string',
        entropy: ent,
        preview: token.substring(0, 8) + '••••••••',
      });
    }
  }

  return findings;
}

export async function runGhostCommit(owner: string, repo: string) {
  const commitsRes = await octokit.repos.listCommits({ owner, repo, per_page: 50 });
  const commits = commitsRes.data.slice(0, 30);
  const findings: SecretFinding[] = [];

  for (const commit of commits) {
    try {
      const detail = await octokit.repos.getCommit({ owner, repo, ref: commit.sha });
      for (const file of detail.data.files ?? []) {
        if (!file.patch) continue;
        if (SKIP_EXT.some((ext) => file.filename.endsWith(ext))) continue;
        if (file.filename.includes('node_modules') || file.filename.includes('.min.')) continue;

        const lines = file.patch.split('\n');
        let lineNum = 0;
        for (const line of lines) {
          if (line.startsWith('@@')) {
            const m = line.match(/@@ \+(\d+)/);
            lineNum = m ? parseInt(m[1]) : lineNum;
            continue;
          }
          if (line.startsWith('+') && !line.startsWith('+++')) {
            findings.push(
              ...scanLine(line, lineNum, file.filename, {
                sha: commit.sha,
                message: commit.commit.message.substring(0, 72),
                author: commit.commit.author?.name ?? 'unknown',
                date: commit.commit.author?.date ?? '',
              })
            );
          }
          if (!line.startsWith('-')) lineNum++;
        }
      }
      await new Promise((r) => setTimeout(r, 120)); // rate limit guard
    } catch {}
  }

  const deduped = findings.filter(
    (f, i, arr) =>
      arr.findIndex((x) => x.file === f.file && x.line === f.line && x.type === f.type) === i
  );

  return { findings: deduped, totalCommitsScanned: commits.length };
}