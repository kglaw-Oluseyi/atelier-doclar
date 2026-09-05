import type { Check, Decision, EvidenceRef, Gate, OpenItem, Phase, Product, SliceManifest, SliceRecord, WorkStatus } from "./schemas.js";

export interface SliceFacts {
  id: string;
  implementationObserved: boolean;
  reviewRequested: boolean;
  superseded: boolean;
  supersededBy?: string;
  supersessionDecisionId?: string;
  commits: string[];
  evidence: EvidenceRef[];
  openItemIds: string[];
  checks: Check[];
  acceptedAt?: string;
  acceptedBy?: string;
  updatedAt: string;
  version: string;
}

export interface ProgrammeProjection {
  eventPosition: number;
  aggregateRevisions: Record<string, number>;
  manifests: SliceManifest[];
  products: Product[];
  phases: Phase[];
  slices: Record<string, SliceFacts>;
  openItems: Record<string, OpenItem>;
  gates: Record<string, Gate>;
  decisions: Record<string, Decision>;
}

export interface DeclarationBaseline {
  products: Product[];
  phases: Phase[];
  manifests: SliceManifest[];
  gates: Gate[];
  openItems: OpenItem[];
}

export interface PercentageUnavailable {
  available: false;
  reason: "WEIGHTS_ABSENT";
}

export interface PercentageAvailable {
  available: true;
  acceptedWeight: number;
  totalWeight: number;
  value: number;
}

export type PercentageResult = PercentageUnavailable | PercentageAvailable;

export interface OutstandingWork {
  unacceptedMandatorySlices: string[];
  unlockedUnacceptedSlices: string[];
  blockedSlices: string[];
  blockingOpenItems: string[];
  incompleteGates: string[];
  blockingDecisions: string[];
  missingRequiredEvidence: string[];
  percentage: PercentageResult;
}

export interface ControlSnapshot {
  snapshotId: string;
  revision: number;
  generatedAt: string;
  sourceEventPosition: number;
  sourceCommit?: string;
  calculationVersion: string;
  products: Array<{ code: string; name: string; route: string; order: number }>;
  phases: Array<{ id: string; title: string; order: number }>;
  slices: SliceRecord[];
  openItems: OpenItem[];
  gates: Gate[];
  decisions: Decision[];
  statuses: Record<string, WorkStatus>;
  outstanding: OutstandingWork;
  freshness: {
    source: string;
    eventPosition: number;
  };
}

export interface SliceWeights {
  [sliceId: string]: number;
}
