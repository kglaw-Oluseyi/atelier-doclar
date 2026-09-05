import {
  CORPUS_SEED_TIME,
  corpusSeedEvents,
  createEngine,
  loadCorpusBaseline,
  MemoryProgrammeStore,
  type ControlSnapshot,
} from "@maison-doclar/programme-domain";
import { LATER_SURFACES } from "./constants.js";
import { buildPortfolio, type PortfolioView } from "./portfolio.js";
import { buildFreshness, classifySurface, type SurfaceState } from "./surface.js";
import type { SessionActor } from "./session.js";

export const VIEW_FIXTURES = ["empty", "stale", "degraded", "error", "conflict", "recovery"] as const;
export type ViewFixture = (typeof VIEW_FIXTURES)[number];

export function isViewFixture(value: string | undefined): value is ViewFixture {
  return value !== undefined && (VIEW_FIXTURES as readonly string[]).includes(value);
}

export function loadCurrentSnapshot(now = new Date().toISOString()): ControlSnapshot {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of corpusSeedEvents()) engine.append(event);
  return engine.currentView({
    snapshotId: "SNAP-TOWER-CURRENT",
    generatedAt: now,
    source: "corpus-seed",
  });
}

export function loadCorpusPortfolio(input: {
  actor?: SessionActor;
  now?: string;
  fixture?: ViewFixture;
  allowFixtures?: boolean;
  snapshot?: ControlSnapshot;
}): PortfolioView {
  const now = input.now ?? new Date().toISOString();
  if (input.fixture && !input.allowFixtures) {
    throw new Error("view fixtures are disabled");
  }

  if (input.fixture === "error") {
    const freshness = buildFreshness({
      source: "unavailable",
      generatedAt: now,
      now,
      ingestionState: "ERROR",
    });
    return deniedOrSpecial("error", freshness, input.actor, "programme snapshot could not be loaded");
  }

  const snapshot = input.snapshot ?? loadCurrentSnapshot(now);

  if (input.fixture === "empty") {
    const emptyFresh = buildFreshness({
      source: snapshot.freshness.source,
      generatedAt: now,
      now,
      ingestionState: "FRESH",
      lastSuccessfulIngestion: now,
    });
    return {
      ...buildPortfolio({
        snapshot: { ...snapshot, slices: [], products: [], statuses: {}, outstanding: { ...snapshot.outstanding, unacceptedMandatorySlices: [] } },
        freshness: emptyFresh,
        state: "empty",
        reservedSurfaces: LATER_SURFACES,
        ...(input.actor ? { actor: { actorId: input.actor.actorId, role: input.actor.role } } : {}),
        message: "no programme slices are available in this fixture",
      }),
    };
  }

  const ingestionState =
    input.fixture === "stale" ? "STALE" : input.fixture === "degraded" ? "UNKNOWN" : "FRESH";
  const freshness = buildFreshness({
    source: snapshot.freshness.source,
    generatedAt: input.fixture === "stale" ? "2020-01-01T00:00:00.000Z" : snapshot.generatedAt,
    now,
    ingestionState,
    liveGithub: input.fixture === "degraded" ? "ERROR" : "UNKNOWN",
    lastSuccessfulIngestion: ingestionState === "FRESH" ? now : undefined,
  });

  const state: SurfaceState = classifySurface({
    authenticated: Boolean(input.actor),
    snapshotCount: snapshot.slices.length,
    freshness,
    conflict: input.fixture === "conflict",
    loadError: input.fixture === "recovery" ? "last load failed" : undefined,
    allowRecovery: input.fixture === "recovery",
  });

  return buildPortfolio({
    snapshot,
    freshness,
    state,
    reservedSurfaces: LATER_SURFACES,
    ...(input.actor ? { actor: { actorId: input.actor.actorId, role: input.actor.role } } : {}),
    ...(state !== "ok"
      ? {
          message:
            state === "denied"
              ? "private Control Tower requires an authenticated session"
              : state === "stale"
                ? "snapshot or source freshness is stale; unknown is not healthy"
                : state === "degraded"
                  ? "source has not been successfully checked; unknown is not healthy"
                  : state === "conflict"
                    ? "projection conflict: do not treat this view as authoritative"
                    : state === "recovery"
                      ? "restore the last verified corpus snapshot and re-run programme:project"
                      : undefined,
        }
      : {}),
  });
}

function deniedOrSpecial(
  state: SurfaceState,
  freshness: ReturnType<typeof buildFreshness>,
  actor: SessionActor | undefined,
  message: string,
): PortfolioView {
  return {
    state,
    snapshotId: "SNAP-UNAVAILABLE",
    generatedAt: freshness.generatedAt,
    calculationVersion: "unavailable",
    products: [],
    acceptedTotal: 0,
    remainingTotal: 0,
    blockers: [],
    criticalPath: [],
    horizon: [],
    commits: [],
    checks: [],
    gates: [],
    freshness,
    percentageAvailable: false,
    cannotApprove: true,
    reservedSurfaces: LATER_SURFACES,
    message,
    ...(actor ? { actor: { actorId: actor.actorId, role: actor.role } } : {}),
  };
}

export function deniedPortfolio(now = new Date().toISOString()): PortfolioView {
  const freshness = buildFreshness({
    source: "unauthenticated",
    generatedAt: now,
    now,
    ingestionState: "UNKNOWN",
  });
  return deniedOrSpecial(
    "denied",
    freshness,
    undefined,
    "private Control Tower requires an authenticated session",
  );
}
