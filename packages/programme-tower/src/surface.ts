export const SURFACE_STATES = [
  "ok",
  "loading",
  "empty",
  "denied",
  "stale",
  "degraded",
  "conflict",
  "error",
  "recovery",
] as const;

export type SurfaceState = (typeof SURFACE_STATES)[number];

export interface SurfaceFreshness {
  source: string;
  generatedAt: string;
  lastSuccessfulIngestion?: string;
  lastAttemptedIngestion?: string;
  lastReconciliation?: string;
  latestObservedCommit?: string;
  latestObservedCi?: string;
  ingestionState: "UNKNOWN" | "FRESH" | "STALE" | "ERROR";
  liveGithub: "UNKNOWN" | "FRESH" | "STALE" | "ERROR";
  snapshotAgeSeconds: number;
  healthy: boolean;
}

export function classifySurface(input: {
  authenticated: boolean;
  loadError?: string;
  conflict?: boolean;
  snapshotCount: number;
  freshness: SurfaceFreshness;
  allowRecovery?: boolean;
}): SurfaceState {
  if (!input.authenticated) return "denied";
  if (input.loadError) return input.allowRecovery ? "recovery" : "error";
  if (input.conflict) return "conflict";
  if (input.snapshotCount === 0) return "empty";
  if (input.freshness.ingestionState === "ERROR") return "degraded";
  if (input.freshness.ingestionState === "STALE") return "stale";
  if (input.freshness.ingestionState === "UNKNOWN") return "degraded";
  return "ok";
}

export function buildFreshness(input: {
  source: string;
  generatedAt: string;
  now: string;
  lastSuccessfulIngestion?: string;
  lastAttemptedIngestion?: string;
  lastReconciliation?: string;
  latestObservedCommit?: string;
  latestObservedCi?: string;
  ingestionState: SurfaceFreshness["ingestionState"];
  liveGithub?: SurfaceFreshness["liveGithub"];
  staleAfterSeconds?: number;
}): SurfaceFreshness {
  const generated = Date.parse(input.generatedAt);
  const now = Date.parse(input.now);
  const age = Number.isNaN(generated) || Number.isNaN(now) ? Number.POSITIVE_INFINITY : Math.max(0, (now - generated) / 1000);
  const staleAfter = input.staleAfterSeconds ?? 24 * 60 * 60;
  const liveGithub = input.liveGithub ?? "UNKNOWN";
  const healthy =
    input.ingestionState === "FRESH" &&
    liveGithub === "FRESH" &&
    Number.isFinite(age) &&
    age <= staleAfter &&
    Boolean(input.lastSuccessfulIngestion);
  return {
    source: input.source,
    generatedAt: input.generatedAt,
    ingestionState: input.ingestionState,
    liveGithub,
    snapshotAgeSeconds: Number.isFinite(age) ? age : -1,
    healthy,
    ...(input.lastSuccessfulIngestion ? { lastSuccessfulIngestion: input.lastSuccessfulIngestion } : {}),
    ...(input.lastAttemptedIngestion ? { lastAttemptedIngestion: input.lastAttemptedIngestion } : {}),
    ...(input.lastReconciliation ? { lastReconciliation: input.lastReconciliation } : {}),
    ...(input.latestObservedCommit ? { latestObservedCommit: input.latestObservedCommit } : {}),
    ...(input.latestObservedCi ? { latestObservedCi: input.latestObservedCi } : {}),
  };
}
