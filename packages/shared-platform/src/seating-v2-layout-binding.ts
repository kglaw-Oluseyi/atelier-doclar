import { PlatformError } from "./errors.js";
import { seatingV2TableCapacityTruth } from "./seating-v2-capacity.js";
import { uniqueSeatAnchors, type PublishedSpatialLayout } from "./seating-adapters.js";
import type { SeatingV2LayoutBinding } from "./seating-v2-state.js";
import type { PlatformSnapshot } from "./store.js";
import type { LayoutRevision } from "./venue-schemas.js";

export const SEATING_LAYOUT_BINDING_STATES = ["DRAFT", "ACTIVE", "SUPERSEDED", "WITHDRAWN"] as const;
export type SeatingLayoutBindingState = (typeof SEATING_LAYOUT_BINDING_STATES)[number];

export type SeatingLayoutAuthority =
  | {
      state: "BOUND";
      binding: SeatingV2LayoutBinding;
      layout: PublishedSpatialLayout;
    }
  | {
      state: "ABSENT";
      reason: "NO_ACTIVE_SEATING_LAYOUT_BINDING";
    }
  | {
      state: "AMBIGUOUS";
      reason: "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS";
      candidateCount: number;
    }
  | {
      state: "STALE";
      reason: "SEATING_LAYOUT_BINDING_STALE";
      binding: SeatingV2LayoutBinding;
    }
  | {
      state: "MISMATCH";
      reason: "SEATING_LAYOUT_PUBLICATION_MISMATCH";
      binding?: SeatingV2LayoutBinding;
    };

export function activeSeatingLayoutBindings(
  bindings: readonly SeatingV2LayoutBinding[],
  organisationId: string,
  eventId: string,
): SeatingV2LayoutBinding[] {
  return bindings.filter(
    (item) =>
      item.organisationId === organisationId && item.eventId === eventId && item.state === "ACTIVE",
  );
}

/**
 * Canonical pending-draft policy: at most one DRAFT seating layout binding per event.
 * Propose supersedes prior DRAFTs; projection and activation must agree on that single pending proposal.
 */
export function pendingSeatingLayoutBindings(
  bindings: readonly SeatingV2LayoutBinding[],
  organisationId: string,
  eventId: string,
): SeatingV2LayoutBinding[] {
  return bindings.filter(
    (item) =>
      item.organisationId === organisationId && item.eventId === eventId && item.state === "DRAFT",
  );
}

/** Selects the sole pending DRAFT; if residue left multiple, prefer the latest proposal (never silently pick the oldest). */
export function selectPendingSeatingLayoutBinding(
  bindings: readonly SeatingV2LayoutBinding[],
  organisationId: string,
  eventId: string,
): SeatingV2LayoutBinding | undefined {
  const pending = pendingSeatingLayoutBindings(bindings, organisationId, eventId);
  if (pending.length === 0) return undefined;
  if (pending.length === 1) return pending[0];
  return [...pending].sort((left, right) => {
    const byProposed = String(right.proposedAt).localeCompare(String(left.proposedAt));
    if (byProposed !== 0) return byProposed;
    return String(right.createdAt).localeCompare(String(left.createdAt)) || right.id.localeCompare(left.id);
  })[0];
}

export function projectPublishedLayoutFrom(
  publication: { id: string; contentHash: string; revisionId: string },
  revision: LayoutRevision | undefined,
): PublishedSpatialLayout | undefined {
  const objects = revision?.objects ?? [];
  const tables = objects
    .filter((item) => item.objectType === "TABLE" && !item.tombstoned)
    .map((table) => {
      const anchors = objects
        .filter(
          (item) =>
            item.objectType === "SEAT" &&
            !item.tombstoned &&
            (item.subtype as { tableId?: string } | undefined)?.tableId === table.id,
        )
        .map((seat) => ({
          id: seat.id,
          ordinal: Number((seat.subtype as { sequence?: number } | undefined)?.sequence ?? 0),
        }))
        .sort((left, right) => left.ordinal - right.ordinal);
      const declaredCapacity = Number((table.subtype as { declaredCapacity?: number } | undefined)?.declaredCapacity ?? 0);
      const truth = seatingV2TableCapacityTruth({
        tableObjectId: table.id,
        declaredCapacity,
        physicalPositionCount: anchors.length,
      });
      return {
        objectId: table.id,
        tableToken: truth.tableToken,
        capacity: truth.effectiveCapacity,
        declaredCapacity: truth.declaredCapacity,
        physicalPositionCount: truth.physicalPositionCount,
        positionSource: truth.positionSource,
        mismatch: truth.mismatch,
        zoneCodes: table.groupId ? [table.groupId] : ["ZONE_GENERAL"],
        capabilityCodes: [] as string[],
        seatAnchors: uniqueSeatAnchors(anchors),
      };
    });
  return {
    publicationId: publication.id,
    contentHash: publication.contentHash,
    tables,
  };
}

export function projectPublishedLayout(snap: PlatformSnapshot, publicationId: string): PublishedSpatialLayout | undefined {
  const publication = snap.layoutPublications.find((item) => item.id === publicationId);
  if (!publication) return undefined;
  const revision = snap.layoutRevisions.find((item) => item.id === publication.revisionId);
  return projectPublishedLayoutFrom(publication, revision);
}

export function boundLayoutFromLoadedPublication(
  organisationId: string,
  eventId: string,
  binding: Pick<SeatingV2LayoutBinding, "layoutId" | "layoutPublicationId" | "layoutContentHash">,
  publication:
    | {
        id: string;
        layoutId: string;
        eventId: string;
        organisationId: string;
        contentHash: string;
        status: string;
        revisionId: string;
      }
    | undefined,
  currentForLineage: { id: string; contentHash: string } | undefined,
  revision: Parameters<typeof projectPublishedLayoutFrom>[1],
): PublishedSpatialLayout {
  if (
    !publication ||
    publication.layoutId !== binding.layoutId ||
    publication.eventId !== eventId ||
    publication.organisationId !== organisationId
  ) {
    throw new PlatformError("SEATING_LAYOUT_PUBLICATION_MISMATCH", "bound layout publication was not found", {
      publicMessage:
        "The seating layout binding does not match a current publication. Resolve the layout record before freezing seating inputs.",
    });
  }
  if (publication.contentHash !== binding.layoutContentHash) {
    throw new PlatformError("SEATING_LAYOUT_PUBLICATION_MISMATCH", "bound layout publication hash does not match", {
      publicMessage:
        "The seating layout binding does not match a current publication. Resolve the layout record before freezing seating inputs.",
    });
  }
  if (publication.status !== "CURRENT") {
    throw new PlatformError("SEATING_LAYOUT_BINDING_STALE", "bound layout publication is no longer current", {
      publicMessage:
        "The seating layout binding is stale. Propose and activate a successor binding for the current publication.",
    });
  }
  if (!currentForLineage || currentForLineage.id !== publication.id || currentForLineage.contentHash !== publication.contentHash) {
    throw new PlatformError("SEATING_LAYOUT_BINDING_STALE", "bound layout publication is not the lineage current", {
      publicMessage:
        "The seating layout binding is stale. Propose and activate a successor binding for the current publication.",
    });
  }
  const layout = projectPublishedLayoutFrom(publication, revision);
  if (!layout) {
    throw new PlatformError("SEATING_LAYOUT_PUBLICATION_MISMATCH", "bound layout revision was not found", {
      publicMessage:
        "The seating layout binding does not match a current publication. Resolve the layout record before freezing seating inputs.",
    });
  }
  return layout;
}

export function snapshotBoundLayout(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  binding: Pick<SeatingV2LayoutBinding, "layoutId" | "layoutPublicationId" | "layoutContentHash">,
): PublishedSpatialLayout {
  const publication = snap.layoutPublications.find((item) => item.id === binding.layoutPublicationId);
  const currentForLineage = snap.layoutPublications.find(
    (item) =>
      item.layoutId === binding.layoutId &&
      item.eventId === eventId &&
      item.organisationId === organisationId &&
      item.status === "CURRENT",
  );
  const revision = publication ? snap.layoutRevisions.find((item) => item.id === publication.revisionId) : undefined;
  return boundLayoutFromLoadedPublication(organisationId, eventId, binding, publication, currentForLineage, revision);
}

export function resolveSeatingLayoutAuthority(
  snap: PlatformSnapshot,
  bindings: readonly SeatingV2LayoutBinding[],
  organisationId: string,
  eventId: string,
): SeatingLayoutAuthority {
  const active = activeSeatingLayoutBindings(bindings, organisationId, eventId);
  if (active.length === 0) return { state: "ABSENT", reason: "NO_ACTIVE_SEATING_LAYOUT_BINDING" };
  if (active.length > 1) {
    return { state: "AMBIGUOUS", reason: "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS", candidateCount: active.length };
  }
  const binding = active[0]!;
  try {
    const layout = snapshotBoundLayout(snap, organisationId, eventId, binding);
    return { state: "BOUND", binding, layout };
  } catch (error) {
    if (error instanceof PlatformError && error.code === "SEATING_LAYOUT_BINDING_STALE") {
      return { state: "STALE", reason: "SEATING_LAYOUT_BINDING_STALE", binding };
    }
    return { state: "MISMATCH", reason: "SEATING_LAYOUT_PUBLICATION_MISMATCH", binding };
  }
}

export function requireSeatingLayoutAuthority(
  snap: PlatformSnapshot,
  bindings: readonly SeatingV2LayoutBinding[],
  organisationId: string,
  eventId: string,
): Extract<SeatingLayoutAuthority, { state: "BOUND" }> {
  const resolved = resolveSeatingLayoutAuthority(snap, bindings, organisationId, eventId);
  if (resolved.state === "ABSENT") {
    throw new PlatformError("NO_ACTIVE_SEATING_LAYOUT_BINDING", "no active seating layout binding", {
      publicMessage: "Activate a seating layout binding before freezing seating inputs.",
    });
  }
  if (resolved.state === "AMBIGUOUS") {
    throw new PlatformError("MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS", "multiple active seating layout bindings", {
      publicMessage:
        "More than one seating layout binding is active for this event. Resolve the binding before freezing seating inputs.",
    });
  }
  if (resolved.state === "STALE") {
    throw new PlatformError("SEATING_LAYOUT_BINDING_STALE", "seating layout binding is stale", {
      publicMessage:
        "The seating layout binding is stale. Propose and activate a successor binding for the current publication.",
    });
  }
  if (resolved.state === "MISMATCH") {
    throw new PlatformError("SEATING_LAYOUT_PUBLICATION_MISMATCH", "seating layout binding publication mismatch", {
      publicMessage:
        "The seating layout binding does not match a current publication. Resolve the layout record before freezing seating inputs.",
    });
  }
  return resolved;
}

export function historicBindingFromPackage(input: {
  organisationId: string;
  eventId: string;
  layoutId: string;
  layoutPublicationId: string;
  layoutContentHash: string;
  frozenAt: string;
  frozenByPersonId: string;
}): Omit<SeatingV2LayoutBinding, "id"> {
  return {
    organisationId: input.organisationId,
    eventId: input.eventId,
    layoutId: input.layoutId,
    layoutPublicationId: input.layoutPublicationId,
    layoutContentHash: input.layoutContentHash,
    state: "SUPERSEDED",
    version: 1,
    proposedByPersonId: input.frozenByPersonId,
    proposedAt: input.frozenAt,
    reason: "Historic seating package proves this exact layout publication. Governed re-activation is required.",
    schemaVersion: 1,
    createdAt: input.frozenAt,
    updatedAt: input.frozenAt,
  };
}
