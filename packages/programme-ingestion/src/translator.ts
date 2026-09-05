import { parseProgrammeEvent, type ProductCode, type ProgrammeEvent } from "@maison-doclar/programme-domain";
import { authorisedSource } from "./github-adapter.js";
import type { CommitEvidence, WorkflowRunEvidence } from "./provider.js";
import type { ParsedCommitMetadata } from "./linkage.js";

const ACTOR = { id: "github-ingestion", role: "SYSTEM" as const };

function envelope(input: {
  eventId: string;
  eventType: ProgrammeEvent["eventType"];
  aggregateType?: ProgrammeEvent["aggregateType"];
  aggregateId: string;
  product: ProductCode;
  sliceId?: string;
  occurredAt: string;
  idempotencyKey: string;
  payload: ProgrammeEvent["payload"];
}): ProgrammeEvent {
  return parseProgrammeEvent({
    eventId: input.eventId,
    eventType: input.eventType,
    schemaVersion: 1,
    aggregateType: input.aggregateType ?? "slice",
    aggregateId: input.aggregateId,
    product: input.product,
    sliceId: input.sliceId ?? input.aggregateId,
    occurredAt: input.occurredAt,
    recordedAt: input.occurredAt,
    actor: ACTOR,
    source: authorisedSource(),
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
  });
}

export function eventsForLinkedCommit(
  commit: CommitEvidence,
  sliceId: string,
  product: ProductCode,
  metadata: ParsedCommitMetadata,
  occurredAt: string,
): ProgrammeEvent[] {
  const events: ProgrammeEvent[] = [
    envelope({
      eventId: `EVT-GH-COMMIT-${commit.sha}-LINKED`,
      eventType: "COMMIT_LINKED",
      aggregateId: sliceId,
      product,
      occurredAt,
      idempotencyKey: `github:commit:${commit.sha}:COMMIT_LINKED`,
      payload: { sha: commit.sha },
    }),
    envelope({
      eventId: `EVT-GH-COMMIT-${commit.sha}-EVIDENCE`,
      eventType: "EVIDENCE_ATTACHED",
      aggregateId: sliceId,
      product,
      occurredAt,
      idempotencyKey: `github:commit:${commit.sha}:EVIDENCE_ATTACHED`,
      payload: {
        evidence: {
          id: `EV-GH-COMMIT-${commit.sha}`,
          kind: "COMMIT",
          uri: `git:${commit.sha}`,
          createdAt: occurredAt,
          sourceSystem: "github",
          immutable: true,
          summary: metadata.sliceId
            ? `GitHub commit ${commit.sha} linked to ${sliceId}`
            : `GitHub commit ${commit.sha}`,
        },
      },
    }),
    envelope({
      eventId: `EVT-GH-COMMIT-${commit.sha}-IMPL`,
      eventType: "SLICE_IMPLEMENTATION_OBSERVED",
      aggregateId: sliceId,
      product,
      occurredAt,
      idempotencyKey: `github:commit:${commit.sha}:SLICE_IMPLEMENTATION_OBSERVED`,
      payload: { summary: `implementation observed from commit ${commit.sha}` },
    }),
  ];
  if (metadata.reviewRequested) {
    events.push(
      envelope({
        eventId: `EVT-GH-COMMIT-${commit.sha}-REVIEW`,
        eventType: "REVIEW_REQUESTED",
        aggregateId: sliceId,
        product,
        occurredAt,
        idempotencyKey: `github:commit:${commit.sha}:REVIEW_REQUESTED`,
        payload: { summary: `review requested by commit ${commit.sha}` },
      }),
    );
  }
  return events;
}

export function eventForMetadataConflict(
  commit: CommitEvidence,
  sliceId: string,
  product: ProductCode,
  field: string,
  message: string,
  occurredAt: string,
): ProgrammeEvent {
  return envelope({
    eventId: `EVT-GH-OI-${commit.sha}-CONFLICT`,
    eventType: "OPEN_ITEM_CREATED",
    aggregateType: "open_item",
    aggregateId: `OI-INGEST-${commit.sha}-CONFLICT`,
    product,
    sliceId,
    occurredAt,
    idempotencyKey: `github:commit:${commit.sha}:OPEN_ITEM_CONFLICT`,
    payload: {
      openItem: {
        id: `OI-INGEST-${commit.sha}-CONFLICT`,
        product,
        sliceId,
        title: "Commit metadata conflict",
        severity: "MEDIUM",
        owner: "CEO",
        status: "OPEN",
        blocker: false,
        evidence: [],
        notes: `${field}: ${message}`,
      },
    },
  });
}

export function eventForCheck(
  run: WorkflowRunEvidence,
  sliceId: string,
  product: ProductCode,
  result: "PASS" | "FAIL",
  occurredAt: string,
): ProgrammeEvent {
  return envelope({
    eventId: `EVT-GH-CHECK-${run.runId}`,
    eventType: "CHECK_RECORDED",
    aggregateId: sliceId,
    product,
    occurredAt,
    idempotencyKey: `github:check:${run.runId}:${run.sha}`,
    payload: {
      check: {
        id: `CHK-GH-${run.runId}`,
        name: run.name,
        result,
        sha: run.sha,
        recordedAt: occurredAt,
        evidenceIds: [`EV-GH-CHECK-${run.runId}`],
      },
    },
  });
}

export function eventForCheckEvidence(
  run: WorkflowRunEvidence,
  sliceId: string,
  product: ProductCode,
  occurredAt: string,
): ProgrammeEvent {
  return envelope({
    eventId: `EVT-GH-CHECK-${run.runId}-EVIDENCE`,
    eventType: "EVIDENCE_ATTACHED",
    aggregateId: sliceId,
    product,
    occurredAt,
    idempotencyKey: `github:check:${run.runId}:${run.sha}:EVIDENCE`,
    payload: {
      evidence: {
        id: `EV-GH-CHECK-${run.runId}`,
        kind: "CHECK",
        uri: run.htmlUrl,
        createdAt: occurredAt,
        sourceSystem: "github",
        immutable: true,
        summary: `GitHub workflow ${run.name} ${run.conclusion ?? run.status}`,
      },
    },
  });
}

export function assertsNoAcceptance(events: ProgrammeEvent[]): void {
  if (events.some((event) => event.eventType === "ACCEPTANCE_RECORDED")) {
    throw new Error("ingestion must never emit ACCEPTANCE_RECORDED");
  }
}
