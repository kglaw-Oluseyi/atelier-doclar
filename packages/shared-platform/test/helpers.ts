import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import type { PlatformClock } from "../src/platform-clock.js";
import type { ActorContext, PlatformServiceOptions } from "../src/service.js";

export const TEST_CLOCK_INSTANT = "2026-09-05T15:00:00.000Z";

export function testClock(instant = TEST_CLOCK_INSTANT): PlatformClock {
  return { now: () => new Date(instant) };
}

export function fixtureService(options: PlatformServiceOptions = {}) {
  const store = new MemoryPlatformStore();
  const service = loadNonProductionFixtures(store, { clock: testClock(), ...options });
  return { store, service };
}

export function actor(personId: string, extras?: Partial<ActorContext>): ActorContext {
  return {
    personId,
    correlationId: extras?.correlationId ?? "corr-test",
    now: extras?.now ?? TEST_CLOCK_INSTANT,
    actorKind: extras?.actorKind ?? "HUMAN",
    allowScaffoldedTransitions: extras?.allowScaffoldedTransitions,
  };
}

export const people = FIXTURE_IDS;
