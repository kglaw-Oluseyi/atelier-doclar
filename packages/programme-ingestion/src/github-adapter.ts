import { AUTHORISED_REPOSITORY } from "./constants.js";
import type { CommitEvidence, WorkflowRunEvidence } from "./provider.js";
import type { PushPayload, WorkflowRunPayload } from "./inbound.js";

export function commitsFromPush(payload: PushPayload): CommitEvidence[] {
  return payload.commits.map((commit) => {
    const evidence: CommitEvidence = {
      sha: commit.id,
      message: commit.message,
      timestamp: commit.timestamp,
      repository: payload.repository.full_name,
      ref: payload.ref,
    };
    const authorName = commit.author?.name ?? commit.committer?.name;
    const authorLogin = commit.author?.username ?? commit.committer?.username;
    if (authorName !== undefined) evidence.authorName = authorName;
    if (authorLogin !== undefined) evidence.authorLogin = authorLogin;
    return evidence;
  });
}

export function workflowFromPayload(payload: WorkflowRunPayload): WorkflowRunEvidence {
  const run = payload.workflow_run;
  return {
    runId: String(run.id),
    name: run.name,
    sha: run.head_sha,
    repository: payload.repository.full_name,
    ref: run.head_branch,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    updatedAt: run.updated_at,
  };
}

export function authorisedSource(): string {
  return `github:${AUTHORISED_REPOSITORY}`;
}
