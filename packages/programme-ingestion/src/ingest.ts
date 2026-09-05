import type { ProgrammeEngine, ProgrammeEvent } from "@maison-doclar/programme-domain";
import { assertAuthorisedRef, assertAuthorisedRepository } from "./allowlist.js";
import { AUTHORISED_REPOSITORY, SUPPORTED_WEBHOOK_EVENTS, TRUSTED_WORKFLOWS } from "./constants.js";
import { IngestionError, type IngestionFailureCode } from "./errors.js";
import { authorisedSource, commitsFromPush, workflowFromPayload } from "./github-adapter.js";
import {
  headerValue,
  parseJsonBody,
  parsePingPayload,
  parsePushPayload,
  parseWorkflowRunPayload,
} from "./inbound.js";
import { commitFromEvidence, IngestionLedger } from "./ledger.js";
import { resolveCommitLinkage, type LinkageCatalog } from "./linkage.js";
import type { CommitEvidence, RepositoryEvidenceProvider, WorkflowRunEvidence } from "./provider.js";
import type { DeliveryStore } from "./replay.js";
import {
  assertsNoAcceptance,
  eventForCheck,
  eventForCheckEvidence,
  eventForMetadataConflict,
  eventsForLinkedCommit,
} from "./translator.js";
import { verifyGitHubSignature } from "./webhook.js";

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}

export interface IngestionResult {
  ok: boolean;
  kind: "accepted" | "duplicate" | "ignored" | "rejected" | "quarantined";
  code?: IngestionFailureCode;
  retryable: boolean;
  message: string;
  eventsAppended: number;
  duplicates: number;
  quarantined: number;
  unlinked: boolean;
}

export interface IngestionDependencies {
  engine: ProgrammeEngine;
  catalog: LinkageCatalog;
  ledger: IngestionLedger;
  deliveries: DeliveryStore;
  now: () => string;
  trustedRepository?: string;
}

function result(partial: Omit<IngestionResult, "retryable"> & { retryable?: boolean }): IngestionResult {
  return {
    retryable: partial.retryable ?? false,
    ...partial,
  };
}

function toIso(value: string, fallback: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return fallback;
  return new Date(ms).toISOString();
}

function appendEvents(engine: ProgrammeEngine, events: ProgrammeEvent[]): { appended: number; duplicates: number } {
  assertsNoAcceptance(events);
  let appended = 0;
  let duplicates = 0;
  for (const event of events) {
    const outcome = engine.append(event);
    if (outcome.kind === "duplicate") duplicates += 1;
    else appended += 1;
  }
  return { appended, duplicates };
}

function isTrustedWorkflow(name: string): boolean {
  return (TRUSTED_WORKFLOWS as readonly string[]).includes(name);
}

function classifyCi(run: WorkflowRunEvidence): "PASS" | "FAIL" | "LEDGER_ONLY" {
  if (run.status !== "completed") return "LEDGER_ONLY";
  if (run.conclusion === "success") return "PASS";
  if (run.conclusion === "failure" || run.conclusion === "timed_out") return "FAIL";
  return "LEDGER_ONLY";
}

export class IngestionService {
  constructor(private readonly deps: IngestionDependencies) {}

  freshness() {
    return this.deps.ledger.freshness;
  }

  unlinkedCommits() {
    return this.deps.ledger.unlinkedCommits();
  }

  quarantine() {
    return this.deps.ledger.quarantine;
  }

  ingestCommit(commit: CommitEvidence): IngestionResult {
    const now = this.deps.now();
    this.deps.ledger.markAttempt(now);
    try {
      assertAuthorisedRepository(commit.repository);
      assertAuthorisedRef(commit.ref);
    } catch (error) {
      if (error instanceof IngestionError) {
        return result({
          ok: false,
          kind: "rejected",
          code: error.code,
          retryable: error.retryable,
          message: error.message,
          eventsAppended: 0,
          duplicates: 0,
          quarantined: 0,
          unlinked: false,
        });
      }
      throw error;
    }

    const linkage = resolveCommitLinkage(commit.message, this.deps.catalog);
    const occurredAt = toIso(commit.timestamp, now);

    if (linkage.kind === "unlinked") {
      this.deps.ledger.recordCommit(commitFromEvidence(commit, "unlinked", linkage.metadata, now));
      this.deps.ledger.addQuarantine({
        id: `Q-UNLINKED-${commit.sha}`,
        reason: "UNLINKED_COMMIT",
        sha: commit.sha,
        message: "UNLINKED COMMIT: no valid Slice-ID trailer",
        recordedAt: now,
      });
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: "quarantined",
        message: "UNLINKED COMMIT",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 1,
        unlinked: true,
      });
    }

    if (linkage.kind === "unknown_slice") {
      this.deps.ledger.recordCommit(commitFromEvidence(commit, "unknown_slice", linkage.metadata, now, linkage.sliceId));
      this.deps.ledger.addQuarantine({
        id: `Q-UNKNOWN-SLICE-${commit.sha}`,
        reason: "UNKNOWN_SLICE",
        code: "UNKNOWN_SLICE",
        sha: commit.sha,
        message: `commit names unknown slice ${linkage.sliceId}`,
        recordedAt: now,
      });
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: "quarantined",
        code: "UNKNOWN_SLICE",
        message: `unknown slice ${linkage.sliceId}`,
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 1,
        unlinked: true,
      });
    }

    if (linkage.kind === "conflict") {
      this.deps.ledger.recordCommit(
        commitFromEvidence(commit, "conflict", linkage.metadata, now, linkage.metadata.sliceId),
      );
      this.deps.ledger.addQuarantine({
        id: `Q-CONFLICT-${commit.sha}`,
        reason: "METADATA_CONFLICT",
        code: "METADATA_CONFLICT",
        sha: commit.sha,
        message: linkage.message,
        recordedAt: now,
      });
      const claimed = linkage.metadata.sliceId;
      const entry = claimed ? this.deps.catalog.slices[claimed] : undefined;
      let appended = 0;
      let duplicates = 0;
      if (entry) {
        const counts = appendEvents(this.deps.engine, [
          eventForMetadataConflict(commit, entry.id, entry.product, linkage.field, linkage.message, occurredAt),
        ]);
        appended = counts.appended;
        duplicates = counts.duplicates;
      }
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: "quarantined",
        code: "METADATA_CONFLICT",
        message: linkage.message,
        eventsAppended: appended,
        duplicates,
        quarantined: 1,
        unlinked: true,
      });
    }

    const already = this.deps.ledger.hasCommit(commit.sha);
    this.deps.ledger.recordCommit(commitFromEvidence(commit, "linked", linkage.metadata, now, linkage.sliceId));
    const counts = appendEvents(
      this.deps.engine,
      eventsForLinkedCommit(commit, linkage.sliceId, linkage.product, linkage.metadata, occurredAt),
    );
    const recovered = this.recoverPendingChecks(commit.sha);
    this.deps.ledger.markSuccess(now);
    return result({
      ok: true,
      kind: already || (counts.appended === 0 && counts.duplicates > 0) ? "duplicate" : "accepted",
      message: `linked commit ${commit.sha} to ${linkage.sliceId}`,
      eventsAppended: counts.appended + recovered.appended,
      duplicates: counts.duplicates + recovered.duplicates,
      quarantined: 0,
      unlinked: false,
    });
  }

  ingestWorkflowRun(run: WorkflowRunEvidence): IngestionResult {
    const now = this.deps.now();
    this.deps.ledger.markAttempt(now);
    try {
      assertAuthorisedRepository(run.repository);
      assertAuthorisedRef(run.ref);
    } catch (error) {
      if (error instanceof IngestionError) {
        return result({
          ok: false,
          kind: "rejected",
          code: error.code,
          retryable: error.retryable,
          message: error.message,
          eventsAppended: 0,
          duplicates: 0,
          quarantined: 0,
          unlinked: false,
        });
      }
      throw error;
    }

    if (!isTrustedWorkflow(run.name)) {
      this.deps.ledger.recordRun({
        runId: run.runId,
        sha: run.sha,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        recordedAs: "LEDGER_ONLY",
        ingestedAt: now,
      });
      this.deps.ledger.addQuarantine({
        id: `Q-WORKFLOW-${run.runId}`,
        reason: "UNRECOGNISED_WORKFLOW",
        code: "UNRECOGNISED_WORKFLOW",
        sha: run.sha,
        runId: run.runId,
        message: `workflow ${run.name} is not on the trusted allow-list`,
        recordedAt: now,
      });
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: "quarantined",
        code: "UNRECOGNISED_WORKFLOW",
        message: `unrecognised workflow ${run.name}`,
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 1,
        unlinked: false,
      });
    }

    const observed = this.deps.ledger.commits.get(run.sha);
    if (!observed) {
      this.deps.ledger.addQuarantine({
        id: `Q-UNKNOWN-COMMIT-${run.runId}`,
        reason: "UNKNOWN_COMMIT",
        code: "UNKNOWN_COMMIT",
        sha: run.sha,
        runId: run.runId,
        message: "CI run for unknown commit",
        recordedAt: now,
        payload: run,
      });
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: "quarantined",
        code: "UNKNOWN_COMMIT",
        message: "CI run for unknown commit",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 1,
        unlinked: false,
      });
    }

    return this.recordKnownRun(run, observed.sliceId, now);
  }

  handleWebhook(request: WebhookRequest, secret: string): IngestionResult {
    const now = this.deps.now();
    this.deps.ledger.markAttempt(now);
    try {
      verifyGitHubSignature({
        rawBody: request.rawBody,
        signatureHeader: headerValue(request.headers, "x-hub-signature-256"),
        secret,
      });
    } catch (error) {
      if (error instanceof IngestionError) {
        this.deps.ledger.markError(now, error.code);
        return result({
          ok: false,
          kind: "rejected",
          code: error.code,
          retryable: false,
          message: error.message,
          eventsAppended: 0,
          duplicates: 0,
          quarantined: 0,
          unlinked: false,
        });
      }
      throw error;
    }

    const deliveryId = headerValue(request.headers, "x-github-delivery")?.trim();
    if (!deliveryId) {
      return result({
        ok: false,
        kind: "rejected",
        code: "MALFORMED_PAYLOAD",
        message: "X-GitHub-Delivery is required",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 0,
        unlinked: false,
      });
    }
    if (this.deps.deliveries.has(deliveryId)) {
      return result({
        ok: true,
        kind: "duplicate",
        code: "REPLAY",
        message: "delivery already processed",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 0,
        unlinked: false,
      });
    }

    const eventName = headerValue(request.headers, "x-github-event")?.trim();
    if (!eventName) {
      return result({
        ok: false,
        kind: "rejected",
        code: "MALFORMED_PAYLOAD",
        message: "X-GitHub-Event is required",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 0,
        unlinked: false,
      });
    }
    if (!(SUPPORTED_WEBHOOK_EVENTS as readonly string[]).includes(eventName)) {
      return result({
        ok: false,
        kind: "rejected",
        code: "UNSUPPORTED_EVENT",
        message: `unsupported webhook event ${eventName}`,
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 0,
        unlinked: false,
      });
    }

    try {
      const body = parseJsonBody(request.rawBody);
      const trusted = this.deps.trustedRepository ?? AUTHORISED_REPOSITORY;
      if (eventName === "ping") {
        const payload = parsePingPayload(body);
        this.assertTrustedRepository(payload.repository.full_name, trusted);
        this.deps.deliveries.remember(deliveryId);
        this.deps.ledger.markSuccess(now);
        return result({
          ok: true,
          kind: "ignored",
          message: "ping acknowledged",
          eventsAppended: 0,
          duplicates: 0,
          quarantined: 0,
          unlinked: false,
        });
      }
      if (eventName === "push") {
        const payload = parsePushPayload(body);
        this.assertTrustedRepository(payload.repository.full_name, trusted);
        assertAuthorisedRepository(payload.repository.full_name);
        assertAuthorisedRef(payload.ref);
        this.deps.deliveries.remember(deliveryId);
        let eventsAppended = 0;
        let duplicates = 0;
        let quarantined = 0;
        let unlinked = false;
        for (const commit of commitsFromPush(payload)) {
          const outcome = this.ingestCommit(commit);
          eventsAppended += outcome.eventsAppended;
          duplicates += outcome.duplicates;
          quarantined += outcome.quarantined;
          unlinked = unlinked || outcome.unlinked;
        }
        return result({
          ok: true,
          kind: eventsAppended > 0 ? "accepted" : quarantined > 0 ? "quarantined" : "accepted",
          message: `push ingested (${payload.commits.length} commits)`,
          eventsAppended,
          duplicates,
          quarantined,
          unlinked,
        });
      }
      const payload = parseWorkflowRunPayload(body);
      this.assertTrustedRepository(payload.repository.full_name, trusted);
      assertAuthorisedRepository(payload.repository.full_name);
      const run = workflowFromPayload(payload);
      this.deps.deliveries.remember(deliveryId);
      return this.ingestWorkflowRun(run);
    } catch (error) {
      if (error instanceof IngestionError) {
        const retryable = error.retryable;
        if (!retryable) this.deps.deliveries.remember(deliveryId);
        this.deps.ledger.markError(now, error.code);
        return result({
          ok: false,
          kind: "rejected",
          code: error.code,
          retryable,
          message: error.message,
          eventsAppended: 0,
          duplicates: 0,
          quarantined: 0,
          unlinked: false,
        });
      }
      throw error;
    }
  }

  async reconcile(provider: RepositoryEvidenceProvider): Promise<IngestionResult> {
    const now = this.deps.now();
    this.deps.ledger.markAttempt(now);
    try {
      const commits = await provider.listCommits();
      const runs = await provider.listWorkflowRuns();
      let eventsAppended = 0;
      let duplicates = 0;
      let quarantined = 0;
      let unlinked = false;
      for (const commit of commits) {
        const outcome = this.ingestCommit(commit);
        eventsAppended += outcome.eventsAppended;
        duplicates += outcome.duplicates;
        quarantined += outcome.quarantined;
        unlinked = unlinked || outcome.unlinked;
        if (!outcome.ok && outcome.retryable) {
          throw new IngestionError(outcome.code ?? "RECONCILIATION_INCOMPLETE", outcome.message);
        }
      }
      for (const run of runs) {
        const outcome = this.ingestWorkflowRun(run);
        eventsAppended += outcome.eventsAppended;
        duplicates += outcome.duplicates;
        quarantined += outcome.quarantined;
        if (!outcome.ok && outcome.retryable) {
          throw new IngestionError(outcome.code ?? "RECONCILIATION_INCOMPLETE", outcome.message);
        }
      }
      this.deps.ledger.markReconciliation(now);
      return result({
        ok: true,
        kind: eventsAppended > 0 ? "accepted" : "duplicate",
        message: "reconciliation complete",
        eventsAppended,
        duplicates,
        quarantined,
        unlinked,
      });
    } catch (error) {
      if (error instanceof IngestionError) {
        this.deps.ledger.markError(now, error.code);
        return result({
          ok: false,
          kind: "rejected",
          code: error.code,
          retryable: error.retryable,
          message: error.message,
          eventsAppended: 0,
          duplicates: 0,
          quarantined: 0,
          unlinked: false,
        });
      }
      this.deps.ledger.markError(now, "RECONCILIATION_INCOMPLETE");
      return result({
        ok: false,
        kind: "rejected",
        code: "RECONCILIATION_INCOMPLETE",
        retryable: true,
        message: error instanceof Error ? error.message : "reconciliation incomplete",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 0,
        unlinked: false,
      });
    }
  }

  private assertTrustedRepository(claimed: string, trusted: string): void {
    assertAuthorisedRepository(trusted);
    if (claimed !== trusted) {
      throw new IngestionError(
        "UNAUTHORISED_REPOSITORY",
        "payload repository does not match trusted source context",
        "repository",
        claimed,
      );
    }
    assertAuthorisedRepository(claimed);
  }

  private recoverPendingChecks(sha: string): { appended: number; duplicates: number } {
    const pending = this.deps.ledger.pendingRunsForSha(sha);
    let appended = 0;
    let duplicates = 0;
    for (const item of pending) {
      if (!item.payload || !item.runId) continue;
      const run = item.payload as WorkflowRunEvidence;
      const outcome = this.ingestWorkflowRun(run);
      appended += outcome.eventsAppended;
      duplicates += outcome.duplicates;
    }
    return { appended, duplicates };
  }

  private recordKnownRun(run: WorkflowRunEvidence, sliceId: string | undefined, now: string): IngestionResult {
    const classification = classifyCi(run);
    const already = this.deps.ledger.hasRun(run.runId);
    this.deps.ledger.recordRun({
      runId: run.runId,
      sha: run.sha,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      recordedAs: classification,
      ingestedAt: now,
    });

    if (!sliceId) {
      this.deps.ledger.addQuarantine({
        id: `Q-CI-UNLINKED-${run.runId}`,
        reason: "UNLINKED_COMMIT",
        code: "CI_LINKAGE_FAILURE",
        sha: run.sha,
        runId: run.runId,
        message: "CI run is attached to an unlinked commit",
        recordedAt: now,
      });
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: "quarantined",
        code: "CI_LINKAGE_FAILURE",
        message: "CI run for unlinked commit",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 1,
        unlinked: true,
      });
    }

    const entry = this.deps.catalog.slices[sliceId];
    if (!entry) {
      this.deps.ledger.addQuarantine({
        id: `Q-CI-SLICE-${run.runId}`,
        reason: "UNKNOWN_SLICE",
        code: "CI_LINKAGE_FAILURE",
        sha: run.sha,
        runId: run.runId,
        message: "CI run names a commit whose slice is unknown",
        recordedAt: now,
      });
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: "quarantined",
        code: "CI_LINKAGE_FAILURE",
        message: "CI linkage failure",
        eventsAppended: 0,
        duplicates: 0,
        quarantined: 1,
        unlinked: false,
      });
    }

    if (classification === "LEDGER_ONLY") {
      this.deps.ledger.addQuarantine({
        id: `Q-CI-PENDING-${run.runId}`,
        reason: run.status === "completed" ? "NON_SUCCESS_CI" : "PENDING_CI",
        sha: run.sha,
        runId: run.runId,
        message: `CI ${run.status}/${run.conclusion ?? "null"} is not successful check evidence`,
        recordedAt: now,
      });
      this.deps.ledger.markSuccess(now);
      return result({
        ok: true,
        kind: already ? "duplicate" : "ignored",
        message: `CI ${run.status}/${run.conclusion ?? "null"} recorded without CHECK_RECORDED`,
        eventsAppended: 0,
        duplicates: already ? 1 : 0,
        quarantined: 1,
        unlinked: false,
      });
    }

    const occurredAt = toIso(run.updatedAt, now);
    const counts = appendEvents(this.deps.engine, [
      eventForCheckEvidence(run, entry.id, entry.product, occurredAt),
      eventForCheck(run, entry.id, entry.product, classification, occurredAt),
    ]);
    this.deps.ledger.markSuccess(now);
    return result({
      ok: true,
      kind: counts.appended === 0 ? "duplicate" : "accepted",
      message: `CI ${classification} recorded for ${entry.id}`,
      eventsAppended: counts.appended,
      duplicates: counts.duplicates,
      quarantined: 0,
      unlinked: false,
    });
  }
}

export function describeSource(): string {
  return authorisedSource();
}
