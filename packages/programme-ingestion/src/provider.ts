export interface CommitEvidence {
  sha: string;
  message: string;
  timestamp: string;
  repository: string;
  ref: string;
  authorName?: string;
  authorLogin?: string;
}

export interface WorkflowRunEvidence {
  runId: string;
  name: string;
  sha: string;
  repository: string;
  ref: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  updatedAt: string;
}

export interface SourceFreshness {
  source: "github";
  repository: string;
  lastSuccessfulIngestion?: string;
  lastAttemptedIngestion?: string;
  lastReconciliation?: string;
  latestObservedCommit?: string;
  latestObservedCi?: {
    runId: string;
    conclusion: string | null;
    at: string;
  };
  state: "UNKNOWN" | "FRESH" | "STALE" | "ERROR";
  error?: string;
}

export interface RepositoryEvidenceProvider {
  getCommit(sha: string): Promise<CommitEvidence | undefined>;
  listCommits(): Promise<CommitEvidence[]>;
  getWorkflowRun(runId: string): Promise<WorkflowRunEvidence | undefined>;
  listWorkflowRuns(): Promise<WorkflowRunEvidence[]>;
  freshness(): SourceFreshness;
}

export type ProviderFailure = "PROVIDER_UNAVAILABLE" | "RATE_LIMITED";
