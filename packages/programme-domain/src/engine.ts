import { ProgrammeEventError } from "./event-errors.js";
import { parseProgrammeEvent } from "./events.js";
import { replay, replayFrom } from "./projector.js";
import type { ControlSnapshot, DeclarationBaseline, ProgrammeProjection, SliceWeights } from "./projection-types.js";
import { generateControlSnapshot } from "./snapshot.js";
import {
  type AppendResult,
  type ProgrammeStore,
  type StoredSnapshot,
} from "./store.js";

export interface SnapshotRequest {
  snapshotId: string;
  generatedAt: string;
  source?: string;
  sourceCommit?: string;
  weights?: SliceWeights;
}

export class ProgrammeEngine {
  constructor(
    private readonly store: ProgrammeStore,
    private readonly baseline: DeclarationBaseline,
    private readonly baselineUpdatedAt: string,
  ) {}

  append(input: unknown): AppendResult {
    const event = parseProgrammeEvent(input);
    if (event.causationId && !this.store.getById(event.causationId)) {
      throw new ProgrammeEventError(
        "SCHEMA_INVALID",
        `causationId ${event.causationId} does not reference a stored event`,
        "causationId",
        event.causationId,
      );
    }
    if (event.eventType === "CORRECTION_APPENDED" && !this.store.getById(event.payload.correctsEventId)) {
      throw new ProgrammeEventError(
        "SCHEMA_INVALID",
        `correction target ${event.payload.correctsEventId} does not exist`,
        "payload.correctsEventId",
        event.payload.correctsEventId,
      );
    }
    return this.store.append(event);
  }

  projectionAt(position?: number): ProgrammeProjection {
    const events =
      position === undefined ? this.store.listAll() : this.store.listUpTo(position);
    return replay(events, this.baseline, this.baselineUpdatedAt);
  }

  snapshot(request: SnapshotRequest, position?: number): StoredSnapshot {
    const projection = this.projectionAt(position);
    const view = generateControlSnapshot({
      snapshotId: request.snapshotId,
      generatedAt: request.generatedAt,
      projection,
      source: request.source,
      sourceCommit: request.sourceCommit,
      weights: request.weights,
    });
    const stored: StoredSnapshot = {
      snapshotId: request.snapshotId,
      createdAt: request.generatedAt,
      sourceEventPosition: projection.eventPosition,
      projection,
      view,
    };
    this.store.saveSnapshot(stored);
    return stored;
  }

  reconstructFromSnapshot(snapshotId: string, upToPosition?: number): ProgrammeProjection {
    const stored = this.store.getSnapshot(snapshotId);
    if (!stored) {
      throw new Error(`unknown snapshot ${snapshotId}`);
    }
    const end = upToPosition ?? this.store.eventCount();
    const tail = this.store.listUpTo(end).slice(stored.sourceEventPosition);
    return replayFrom(stored.projection, tail);
  }

  currentView(request: Omit<SnapshotRequest, "snapshotId"> & { snapshotId?: string }): ControlSnapshot {
    return generateControlSnapshot({
      snapshotId: request.snapshotId ?? "VIEW-CURRENT",
      generatedAt: request.generatedAt,
      projection: this.projectionAt(),
      source: request.source,
      sourceCommit: request.sourceCommit,
      weights: request.weights,
    });
  }
}

export function createEngine(
  store: ProgrammeStore,
  baseline: DeclarationBaseline,
  baselineUpdatedAt: string,
): ProgrammeEngine {
  return new ProgrammeEngine(store, baseline, baselineUpdatedAt);
}
