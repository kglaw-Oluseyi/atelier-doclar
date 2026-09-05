import { AUTHORISED_REPOSITORY } from "./constants.js";
import { IngestionError } from "./errors.js";
import type { CommitEvidence, RepositoryEvidenceProvider, SourceFreshness, WorkflowRunEvidence } from "./provider.js";

export interface GitHubHttpOptions {
  live: boolean;
  token?: string;
  repository?: string;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
  now?: () => string;
}

const API = "https://api.github.com";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class GitHubHttpProvider implements RepositoryEvidenceProvider {
  private readonly repo: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;
  private lastError?: string;
  private lastAttempt?: string;

  constructor(private readonly options: GitHubHttpOptions) {
    if (!options.live) {
      throw new IngestionError("LIVE_MODE_DISABLED", "GitHub HTTP client requires explicit live=true");
    }
    this.repo = options.repository ?? AUTHORISED_REPOSITORY;
    if (this.repo !== AUTHORISED_REPOSITORY) {
      throw new IngestionError("UNAUTHORISED_REPOSITORY", `repository ${this.repo} is not authorised`, "repository", this.repo);
    }
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.retries = options.retries ?? 2;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }

  private async request(path: string): Promise<unknown> {
    const allowedPrefix = `/repos/${AUTHORISED_REPOSITORY}/`;
    if (!path.startsWith(allowedPrefix)) {
      throw new IngestionError("UNAUTHORISED_REPOSITORY", "GitHub path is outside the authorised repository", "path", path);
    }
    this.lastAttempt = this.now();
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "maison-doclar-programme-ingestion",
        };
        if (this.options.token) headers.Authorization = `Bearer ${this.options.token}`;
        const response = await this.fetchImpl(`${API}${path}`, { headers, signal: controller.signal });
        if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
          throw new IngestionError("RATE_LIMITED", "GitHub rate limit exhausted");
        }
        if (response.status >= 500 && attempt < this.retries) {
          await sleep(50 * (attempt + 1));
          continue;
        }
        if (!response.ok) {
          throw new IngestionError("PROVIDER_UNAVAILABLE", `GitHub HTTP ${response.status}`, "status", String(response.status));
        }
        this.lastError = undefined;
        return (await response.json()) as unknown;
      } catch (error) {
        lastError = error;
        if (error instanceof IngestionError && error.code === "RATE_LIMITED") throw error;
        if (attempt < this.retries) {
          await sleep(50 * (attempt + 1));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    this.lastError = lastError instanceof Error ? lastError.message : "github request failed";
    if (lastError instanceof IngestionError) throw lastError;
    throw new IngestionError("PROVIDER_UNAVAILABLE", this.lastError);
  }

  async getCommit(sha: string): Promise<CommitEvidence | undefined> {
    const raw = (await this.request(`/repos/${AUTHORISED_REPOSITORY}/commits/${sha}`)) as {
      sha?: string;
      commit?: { message?: string; author?: { date?: string; name?: string }; committer?: { name?: string } };
      author?: { login?: string };
    };
    if (!raw.sha) return undefined;
    return {
      sha: raw.sha,
      message: raw.commit?.message ?? "",
      timestamp: raw.commit?.author?.date ?? this.now(),
      repository: AUTHORISED_REPOSITORY,
      ref: "refs/heads/main",
      ...(raw.commit?.author?.name ? { authorName: raw.commit.author.name } : {}),
      ...(raw.author?.login ? { authorLogin: raw.author.login } : {}),
    };
  }

  async listCommits(): Promise<CommitEvidence[]> {
    const raw = (await this.request(`/repos/${AUTHORISED_REPOSITORY}/commits?sha=main&per_page=30`)) as Array<{
      sha?: string;
      commit?: { message?: string; author?: { date?: string; name?: string } };
      author?: { login?: string };
    }>;
    const out: CommitEvidence[] = [];
    for (const item of raw) {
      if (!item.sha) continue;
      out.push({
        sha: item.sha,
        message: item.commit?.message ?? "",
        timestamp: item.commit?.author?.date ?? this.now(),
        repository: AUTHORISED_REPOSITORY,
        ref: "refs/heads/main",
        ...(item.commit?.author?.name ? { authorName: item.commit.author.name } : {}),
        ...(item.author?.login ? { authorLogin: item.author.login } : {}),
      });
    }
    return out;
  }

  async getWorkflowRun(runId: string): Promise<WorkflowRunEvidence | undefined> {
    const raw = (await this.request(`/repos/${AUTHORISED_REPOSITORY}/actions/runs/${runId}`)) as {
      id?: number;
      name?: string;
      head_sha?: string;
      head_branch?: string;
      status?: string;
      conclusion?: string | null;
      html_url?: string;
      updated_at?: string;
    };
    if (!raw.id) return undefined;
    return {
      runId: String(raw.id),
      name: raw.name ?? "unknown",
      sha: raw.head_sha ?? "",
      repository: AUTHORISED_REPOSITORY,
      ref: raw.head_branch ?? "main",
      status: raw.status ?? "unknown",
      conclusion: raw.conclusion ?? null,
      htmlUrl: raw.html_url ?? "",
      updatedAt: raw.updated_at ?? this.now(),
    };
  }

  async listWorkflowRuns(): Promise<WorkflowRunEvidence[]> {
    const raw = (await this.request(`/repos/${AUTHORISED_REPOSITORY}/actions/runs?per_page=20`)) as {
      workflow_runs?: Array<{
        id?: number;
        name?: string;
        head_sha?: string;
        head_branch?: string;
        status?: string;
        conclusion?: string | null;
        html_url?: string;
        updated_at?: string;
      }>;
    };
    return (raw.workflow_runs ?? []).flatMap((run) =>
      run.id
        ? [
            {
              runId: String(run.id),
              name: run.name ?? "unknown",
              sha: run.head_sha ?? "",
              repository: AUTHORISED_REPOSITORY,
              ref: run.head_branch ?? "main",
              status: run.status ?? "unknown",
              conclusion: run.conclusion ?? null,
              htmlUrl: run.html_url ?? "",
              updatedAt: run.updated_at ?? this.now(),
            },
          ]
        : [],
    );
  }

  freshness(): SourceFreshness {
    return {
      source: "github",
      repository: AUTHORISED_REPOSITORY,
      state: this.lastError ? "ERROR" : this.lastAttempt ? "FRESH" : "UNKNOWN",
      ...(this.lastAttempt ? { lastAttemptedIngestion: this.lastAttempt } : {}),
      ...(this.lastError ? { error: this.lastError } : {}),
    };
  }
}

export function createLiveGitHubProvider(env: NodeJS.ProcessEnv = process.env): GitHubHttpProvider {
  if (env.PROGRAMME_GITHUB_LIVE !== "1") {
    throw new IngestionError("LIVE_MODE_DISABLED", "live GitHub client requires PROGRAMME_GITHUB_LIVE=1");
  }
  return new GitHubHttpProvider({
    live: true,
    ...(env.PROGRAMME_GITHUB_TOKEN ? { token: env.PROGRAMME_GITHUB_TOKEN } : {}),
  });
}
