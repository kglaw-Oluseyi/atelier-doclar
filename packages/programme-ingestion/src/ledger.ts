import { evaluateFreshness, unknownFreshness } from "./freshness.js";
import type { CommitEvidence, SourceFreshness } from "./provider.js";
import type { IngestionFailureCode } from "./errors.js";
import type { ParsedCommitMetadata } from "./linkage.js";

export type QuarantineReason =
  | "UNLINKED_COMMIT"
  | "UNKNOWN_SLICE"
  | "METADATA_CONFLICT"
  | "UNKNOWN_COMMIT"
  | "UNRECOGNISED_WORKFLOW"
  | "STALE_OR_OUT_OF_ORDER"
  | "MALFORMED"
  | "PENDING_CI"
  | "NON_SUCCESS_CI";

export interface ObservedCommit {
  sha: string;
  repository: string;
  ref: string;
  message: string;
  timestamp: string;
  linkage: "linked" | "unlinked" | "unknown_slice" | "conflict";
  sliceId?: string;
  metadata: ParsedCommitMetadata;
  ingestedAt: string;
}

export interface ObservedRun {
  runId: string;
  sha: string;
  name: string;
  status: string;
  conclusion: string | null;
  recordedAs: "PASS" | "FAIL" | "LEDGER_ONLY";
  ingestedAt: string;
}

export interface QuarantineRecord {
  id: string;
  reason: QuarantineReason;
  code?: IngestionFailureCode;
  sha?: string;
  runId?: string;
  message: string;
  recordedAt: string;
  payload?: unknown;
}

export class IngestionLedger {
  readonly commits = new Map<string, ObservedCommit>();
  readonly runs = new Map<string, ObservedRun>();
  readonly quarantine: QuarantineRecord[] = [];
  freshness: SourceFreshness = unknownFreshness();

  hasCommit(sha: string): boolean {
    return this.commits.has(sha);
  }

  hasRun(runId: string): boolean {
    return this.runs.has(runId);
  }

  recordCommit(record: ObservedCommit): void {
    this.commits.set(record.sha, record);
    this.freshness.latestObservedCommit = record.sha;
  }

  recordRun(record: ObservedRun): void {
    this.runs.set(record.runId, record);
    this.freshness.latestObservedCi = {
      runId: record.runId,
      conclusion: record.conclusion,
      at: record.ingestedAt,
    };
  }

  addQuarantine(record: QuarantineRecord): void {
    this.quarantine.push(record);
  }

  unlinkedCommits(): ObservedCommit[] {
    return [...this.commits.values()].filter((item) => item.linkage !== "linked");
  }

  pendingRunsForSha(sha: string): QuarantineRecord[] {
    return this.quarantine.filter(
      (item) => item.sha === sha && (item.reason === "UNKNOWN_COMMIT" || item.reason === "STALE_OR_OUT_OF_ORDER"),
    );
  }

  markAttempt(now: string): void {
    this.freshness.lastAttemptedIngestion = now;
    this.freshness = evaluateFreshness(this.freshness, now);
  }

  markSuccess(now: string): void {
    this.freshness.lastSuccessfulIngestion = now;
    this.freshness.lastAttemptedIngestion = now;
    delete this.freshness.error;
    this.freshness = evaluateFreshness(this.freshness, now);
  }

  markReconciliation(now: string): void {
    this.freshness.lastReconciliation = now;
    this.markSuccess(now);
  }

  markError(now: string, error: string): void {
    this.freshness.lastAttemptedIngestion = now;
    this.freshness.state = "ERROR";
    this.freshness.error = error;
  }
}

export function commitFromEvidence(
  commit: CommitEvidence,
  linkage: ObservedCommit["linkage"],
  metadata: ParsedCommitMetadata,
  ingestedAt: string,
  sliceId?: string,
): ObservedCommit {
  const record: ObservedCommit = {
    sha: commit.sha,
    repository: commit.repository,
    ref: commit.ref,
    message: commit.message,
    timestamp: commit.timestamp,
    linkage,
    metadata,
    ingestedAt,
  };
  if (sliceId !== undefined) record.sliceId = sliceId;
  return record;
}
