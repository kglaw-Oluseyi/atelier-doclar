import { AUTHORISED_REPOSITORY } from "./constants.js";
import { IngestionError } from "./errors.js";
import type {
  CommitEvidence,
  ProviderFailure,
  RepositoryEvidenceProvider,
  SourceFreshness,
  WorkflowRunEvidence,
} from "./provider.js";

export class SyntheticEvidenceProvider implements RepositoryEvidenceProvider {
  constructor(
    private readonly data: {
      commits?: CommitEvidence[];
      runs?: WorkflowRunEvidence[];
      failWith?: ProviderFailure;
    } = {},
  ) {}

  private fail(): void {
    if (this.data.failWith === "RATE_LIMITED") {
      throw new IngestionError("RATE_LIMITED", "synthetic provider is rate limited");
    }
    if (this.data.failWith === "PROVIDER_UNAVAILABLE") {
      throw new IngestionError("PROVIDER_UNAVAILABLE", "synthetic provider is unavailable");
    }
  }

  async getCommit(sha: string): Promise<CommitEvidence | undefined> {
    this.fail();
    return this.data.commits?.find((item) => item.sha === sha);
  }

  async listCommits(): Promise<CommitEvidence[]> {
    this.fail();
    return [...(this.data.commits ?? [])];
  }

  async getWorkflowRun(runId: string): Promise<WorkflowRunEvidence | undefined> {
    this.fail();
    return this.data.runs?.find((item) => item.runId === runId);
  }

  async listWorkflowRuns(): Promise<WorkflowRunEvidence[]> {
    this.fail();
    return [...(this.data.runs ?? [])];
  }

  freshness(): SourceFreshness {
    return {
      source: "github",
      repository: AUTHORISED_REPOSITORY,
      state: "UNKNOWN",
    };
  }
}

export { GitHubHttpProvider as LiveGitHubProvider } from "./github-http.js";
