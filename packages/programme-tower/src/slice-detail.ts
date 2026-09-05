import type { ControlSnapshot, SliceRecord, WorkStatus } from "@maison-doclar/programme-domain";

export interface SliceDetail {
  record: SliceRecord;
  status: WorkStatus;
  dependents: string[];
  nextEligibleAction: string;
  openItems: ControlSnapshot["openItems"];
}

export function buildSliceDetail(snapshot: ControlSnapshot, sliceId: string): SliceDetail | undefined {
  const record = snapshot.slices.find((slice) => slice.id === sliceId);
  if (!record) return undefined;
  const status = snapshot.statuses[sliceId] ?? "NOT_STARTED";
  const dependents = snapshot.slices.filter((slice) => slice.dependsOn.includes(sliceId)).map((slice) => slice.id);
  const nextEligibleAction =
    status === "ACCEPTED"
      ? "No further implementation action; protected acceptance already recorded."
      : status === "IN_REVIEW"
        ? "Named reviewer must accept; this UI cannot approve."
        : status === "BLOCKED"
          ? "Resolve blocking open items before implementation continues."
          : status === "READY"
            ? "Slice is eligible for implementation."
            : "Wait for accepted or approved predecessors.";
  return {
    record,
    status,
    dependents,
    nextEligibleAction,
    openItems: snapshot.openItems.filter((item) => item.sliceId === sliceId),
  };
}

export function listEvidence(snapshot: ControlSnapshot) {
  return snapshot.slices.flatMap((slice) =>
    slice.evidence.map((evidence) => ({
      ...evidence,
      sliceId: slice.id,
      href: `/programme/slices/${slice.id}#evidence`,
    })),
  );
}

export function listCommits(snapshot: ControlSnapshot) {
  return snapshot.slices.flatMap((slice) =>
    slice.commits.map((sha) => ({
      sha,
      sliceId: slice.id,
      href: `/programme/slices/${slice.id}#commits`,
      unlinked: false,
    })),
  );
}
