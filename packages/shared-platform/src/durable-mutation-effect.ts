export const ACTION_APPLICATIONS = ["APPLIED", "NOT_APPLIED", "REPLAYED"] as const;
export type ActionApplication = (typeof ACTION_APPLICATIONS)[number];

export type DurableMutationEffect = {
  application: ActionApplication;
  didDataChange: boolean;
  createdRecordIds: string[];
  updatedRecordIds: string[];
  reusedRecordIds: string[];
  retrySafe: boolean;
};

export type ActionResultTarget = {
  actionScope: string;
  subjectId: string;
  targetId: string;
  correlationId: string;
  createdAt: string;
};

export type RetryLock = {
  actionScope: string;
  subjectId: string;
  attemptedVersion: number;
  correlationId: string;
};

export const ACTION_RESULT_FOCUS_TARGETS = [
  "operational-state",
  "operational-state-title",
  "resolved-contradiction-heading",
  "placeholder-validation",
] as const;

export type ActionResultFocusTarget = (typeof ACTION_RESULT_FOCUS_TARGETS)[number];

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isActionApplication(value: unknown): value is ActionApplication {
  return typeof value === "string" && (ACTION_APPLICATIONS as readonly string[]).includes(value);
}

export function isAllowedActionResultTarget(targetId: string): boolean {
  return (ACTION_RESULT_FOCUS_TARGETS as readonly string[]).includes(targetId);
}

export function safeActionResultTargetId(targetId: string | undefined): ActionResultFocusTarget {
  return targetId && isAllowedActionResultTarget(targetId) ? (targetId as ActionResultFocusTarget) : "operational-state-title";
}

export function retryLockApplies(
  lock: RetryLock | undefined,
  identity: { actionScope: string; subjectId: string; attemptedVersion?: number },
): boolean {
  if (!lock) return false;
  if (lock.actionScope !== identity.actionScope) return false;
  if (lock.subjectId !== identity.subjectId) return false;
  return true;
}

export function appliedMutationEffect(recordId?: string): DurableMutationEffect {
  return {
    application: "APPLIED",
    didDataChange: true,
    createdRecordIds: recordId ? [recordId] : [],
    updatedRecordIds: [],
    reusedRecordIds: [],
    retrySafe: true,
  };
}

export function replayedMutationEffect(recordId?: string): DurableMutationEffect {
  return {
    application: "REPLAYED",
    didDataChange: false,
    createdRecordIds: [],
    updatedRecordIds: [],
    reusedRecordIds: recordId ? [recordId] : [],
    retrySafe: true,
  };
}

export function notAppliedMutationEffect(retrySafe = false): DurableMutationEffect {
  return {
    application: "NOT_APPLIED",
    didDataChange: false,
    createdRecordIds: [],
    updatedRecordIds: [],
    reusedRecordIds: [],
    retrySafe,
  };
}

export function budgetGeneratedTimeLabel(scenario: {
  calculationGeneratedAt?: string;
  createdAt?: string;
}): string {
  return scenario.calculationGeneratedAt ?? scenario.createdAt ?? "Generation time unavailable for this legacy result";
}

export function parseUuidList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && UUID.test(item)).slice(0, 20);
}
