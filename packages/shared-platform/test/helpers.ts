import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import type { ActorContext } from "../src/service.js";

export function fixtureService() {
  const store = new MemoryPlatformStore();
  const service = loadNonProductionFixtures(store);
  return { store, service };
}

export function actor(personId: string, extras?: Partial<ActorContext>): ActorContext {
  return {
    personId,
    correlationId: extras?.correlationId ?? "corr-test",
    now: extras?.now ?? "2026-09-05T15:00:00.000Z",
    actorKind: extras?.actorKind ?? "HUMAN",
    allowScaffoldedTransitions: extras?.allowScaffoldedTransitions,
  };
}

export const people = FIXTURE_IDS;
