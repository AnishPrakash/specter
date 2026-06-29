export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CVE {
  id: string;
  severity: Severity;
  score: number;
  summary: string;
  fixed_in?: string;
}

export interface DepNode {
  id: string;
  name: string;
  version: string;
  cves: CVE[];
  ecosystem: string;
  isDirect?: boolean;
  isRoot?: boolean;
}

export interface DepEdge {
  from: string;
  to: string;
}

export interface DepChainResult {
  nodes: DepNode[];
  edges: DepEdge[];
  vulnCount: number;
}

export interface SecretFinding {
  commit_sha: string;
  commit_message: string;
  author: string;
  date: string;
  file: string;
  line: number;
  type: string;
  entropy: number;
  preview: string;
}

export interface GhostCommitResult {
  findings: SecretFinding[];
  totalCommitsScanned: number;
}

export interface DockerFinding {
  layer: number;
  instruction: string;
  issue: string;
  severity: Severity;
  fix: string;
}

export interface LayerScanResult {
  findings: DockerFinding[];
  baseImage: string;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  file: string;
  hasAuth: boolean;
  issues: string[];
  severity: Severity;
}

export interface APIBleedResult {
  endpoints: ApiEndpoint[];
  unsecuredCount: number;
}

export interface EnvFinding {
  file: string;
  type: string;
  severity: Severity;
  detail: string;
  line?: number;
}

export interface EnvTraceResult {
  findings: EnvFinding[];
}

export interface ScanResult {
  scanId: string;
  repoUrl: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  threatScore: number;
  depchain?: DepChainResult;
  ghostcommit?: GhostCommitResult;
  layerscan?: LayerScanResult;
  apibleed?: APIBleedResult;
  envtrace?: EnvTraceResult;
  aiExplanation?: AIExplanation;
}

export interface AIExplanation {
  summary: string;
  items: {
    title: string;
    why_dangerous: string;
    exact_fix: string;
    real_example: string;
  }[];
}