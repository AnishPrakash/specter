import { getFileContent } from '@/lib/github';
import type { DockerFinding, Severity } from '@/types';

interface Instruction { instr: string; args: string; line: number; }

function parseDockerfile(content: string): Instruction[] {
  const result: Instruction[] = [];
  let buf = '';
  content.split('\n').forEach((raw, i) => {
    const t = raw.trim();
    if (!t || t.startsWith('#')) return;
    if (t.endsWith('\\')) { buf += ' ' + t.slice(0, -1); return; }
    buf += ' ' + t;
    const parts = buf.trim().split(/\s+/);
    const instr = parts[0].toUpperCase();
    const valid = ['FROM','RUN','CMD','EXPOSE','ENV','ADD','COPY','ENTRYPOINT','VOLUME','USER','WORKDIR','ARG','HEALTHCHECK'];
    if (valid.includes(instr)) result.push({ instr, args: parts.slice(1).join(' '), line: i + 1 });
    buf = '';
  });
  return result;
}

const DANGEROUS_PORTS = new Set(['22','23','3306','5432','27017','6379','9200','2375','2376','8080']);
const SECRET_RE = /password|secret|key|token|credential|auth|pwd|apikey/i;

export async function runLayerScan(owner: string, repo: string) {
  const candidates = ['Dockerfile', 'dockerfile', 'Dockerfile.prod', 'docker/Dockerfile', 'deploy/Dockerfile'];
  let content: string | null = null;
  let baseImage = 'No Dockerfile found';

  for (const c of candidates) {
    content = await getFileContent(owner, repo, c);
    if (content) break;
  }

  if (!content) return { findings: [], baseImage };

  const instructions = parseDockerfile(content);
  const findings: DockerFinding[] = [];
  let hasUser = false;
  let fromCount = 0;

  for (const { instr, args, line } of instructions) {
    if (instr === 'FROM') {
      fromCount++;
      baseImage = args.split(' ')[0];
      if (baseImage.endsWith(':latest') || !baseImage.includes(':')) {
        findings.push({ layer: line, instruction: args, severity: 'high', issue: 'Using :latest or unversioned base image — non-reproducible builds', fix: `Pin: FROM ${baseImage.split(':')[0]}:x.y.z@sha256:<digest>` });
      }
    }
    if (instr === 'USER') hasUser = true;
    if (instr === 'RUN') {
      if (/curl\s.+\|\s*(ba)?sh|wget\s.+\|\s*(ba)?sh/.test(args)) findings.push({ layer: line, instruction: args.substring(0,60)+'...', severity: 'critical', issue: 'Piping curl/wget to shell — executes arbitrary remote code at build time', fix: 'Download to file, verify sha256 checksum, then execute' });
      if (SECRET_RE.test(args) && /=["']?[A-Za-z0-9+/=_\-]{8,}/.test(args)) findings.push({ layer: line, instruction: '[REDACTED]', severity: 'critical', issue: 'Hardcoded secret in RUN — visible in image layer history via docker history', fix: 'Use: RUN --mount=type=secret,id=mysecret cat /run/secrets/mysecret' });
      if (/npm install(?!\s+(ci|--production))/.test(args)) findings.push({ layer: line, instruction: args, severity: 'medium', issue: 'npm install instead of npm ci — lockfile not enforced', fix: 'Use: npm ci --only=production' });
    }
    if (instr === 'ENV' && SECRET_RE.test(args)) findings.push({ layer: line, instruction: '[REDACTED]', severity: 'critical', issue: 'Secret in ENV — baked into all layers, visible via docker inspect', fix: 'Pass at runtime: docker run --env-file .env' });
    if (instr === 'EXPOSE') {
      const port = args.trim().split('/')[0];
      if (DANGEROUS_PORTS.has(port)) findings.push({ layer: line, instruction: args, severity: 'high', issue: `Port ${port} exposed — commonly attacked service`, fix: `Remove EXPOSE ${port} or restrict with firewall` });
    }
    if (instr === 'ADD' && /https?:\/\//.test(args)) findings.push({ layer: line, instruction: args, severity: 'high', issue: 'ADD with URL — no checksum verification', fix: 'Use curl + sha256sum check instead' });
    if (instr === 'COPY' && args.trim() === '. .') findings.push({ layer: line, instruction: args, severity: 'high', issue: 'COPY . . — copies .env, .git, secrets into image', fix: 'Create .dockerignore: .env, .git, *.key, *.pem, .DS_Store' });
  }

  if (!hasUser) findings.push({ layer: 0, instruction: 'missing USER', severity: 'critical', issue: 'No USER directive — container runs as root', fix: 'Add: RUN addgroup -S app && adduser -S app -G app\nUSER app' });
  if (fromCount === 1 && instructions.length > 6) findings.push({ layer: 0, instruction: 'single-stage', severity: 'medium', issue: 'Single-stage build includes build tools in final image', fix: 'Use multi-stage: one builder stage, one minimal runtime stage' });

  return { findings, baseImage };
}