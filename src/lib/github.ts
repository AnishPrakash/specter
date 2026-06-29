import { Octokit } from '@octokit/rest';

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: { timeout: 10000 },
});

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const cleaned = url
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid GitHub URL. Use: https://github.com/owner/repo');
  }
  return { owner: parts[0], repo: parts[1] };
}

// In-memory cache to avoid redundant GitHub API calls within the same scan
const fileCache = new Map<string, string | null>();

export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const key = `${owner}/${repo}/${path}`;
  if (fileCache.has(key)) return fileCache.get(key)!;
  try {
    const res = await octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(res.data) || res.data.type !== 'file') {
      fileCache.set(key, null);
      return null;
    }
    const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
    fileCache.set(key, content);
    return content;
  } catch {
    fileCache.set(key, null);
    return null;
  }
}

export async function getRepoTree(
  owner: string,
  repo: string
): Promise<{ path: string; type: string }[]> {
  try {
    const ref = await octokit.repos.get({ owner, repo });
    const defaultBranch = ref.data.default_branch;
    const res = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: 'true',
    });
    return res.data.tree
      .filter((f) => f.type === 'blob')
      .map((f) => ({ path: f.path || '', type: f.type || '' }));
  } catch {
    return [];
  }
}

export function clearFileCache() {
  fileCache.clear();
}