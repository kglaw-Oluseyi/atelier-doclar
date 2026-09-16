import {
  CAP1000_EDITION,
  CAP1000_EVENT_CODE,
  CAP1000_EVENT_NAME,
  CAP1000_EXPECTED,
  CAP600_EDITION,
  CAP600_EVENT_CODE,
  CAP600_EVENT_NAME,
  CAP600_EXPECTED,
  CAP600_QUALIFICATION_EVIDENCE_COMMIT,
  assertCapacityLiveInstallSafety,
  type CapacityLiveFixtureCode,
} from "./capacity-live-install-guards.js";
import { FIXTURE_IDS as people } from "./fixtures.js";
import { applyCapacity600SeatingLayout } from "./seating-capacity-layout-fixture.js";
import { applyCapacity1000SeatingLayout } from "./seating-capacity-1000-layout-fixture.js";
import { capacityBrowserGuestNames, CAPACITY_SCENARIO_SEEDS } from "./seating-capacity-corpus.js";
import {
  capacity1000BrowserGuestNames,
  CAPACITY_1000_SCENARIO_SEEDS,
  capacity1000CorpusHash,
} from "./seating-capacity-1000-corpus.js";
import type { ActorContext, PlatformService } from "./service.js";
import type { PlatformStore } from "./store.js";

/** Memory store has no flush; Postgres store does. */
type FlushableStore = PlatformStore & { flush?: () => Promise<void> };

async function flushStore(store: FlushableStore) {
  if (typeof store.flush === "function") await store.flush();
}

export type CapacityLiveInstallOptions = {
  fixture: CapacityLiveFixtureCode;
  confirmSyntheticQualification: true;
  dryRun?: boolean;
  verifyOnly?: boolean;
  env: NodeJS.Dict<string | undefined>;
  productionAuthorised: boolean;
  providersInactive: boolean;
  communicationsInactive: boolean;
  realDataMode?: boolean;
  expectedCorpusHash?: string;
  authorityPersonId?: string;
  now?: string;
  guestFlushEvery?: number;
  onProgress?: (message: string) => void;
};

export type CapacityLiveInstallResult = {
  fixture: CapacityLiveFixtureCode;
  dryRun: boolean;
  verifyOnly: boolean;
  replay: boolean;
  eventId: string;
  eventCode: string;
  eventName: string;
  edition: string;
  guestCount: number;
  tableCount: number;
  seatCount: number;
  plannerAssignmentId?: string;
  directorAssignmentId?: string;
  auditorAssignmentId?: string;
  ceoEventAssignmentId?: string;
  evidenceCommit?: string;
  corpusSeed: string;
  corpusHash?: string;
  installedAt: string;
};

function findFixtureEvent(store: PlatformStore, code: string) {
  return store.snapshot().events.find((item) => item.organisationId === people.orgMaison && item.code === code);
}

function layoutTotals(
  store: PlatformStore,
  service: PlatformService,
  director: ActorContext,
  eventId: string,
): { tableCount: number; seatCount: number; layoutId?: string } {
  const layouts = store.snapshot().layouts.filter((item) => item.eventId === eventId);
  const current = layouts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!current) return { tableCount: 0, seatCount: 0 };
  const workspace = service.getLayoutSetupWorkspace(director, people.orgMaison, eventId, current.id);
  const tables = workspace.objects.filter((item) => item.objectType === "TABLE" && !item.tombstoned);
  const seatCount = tables.reduce((sum, item) => {
    const subtype = item.subtype as { declaredCapacity?: number };
    return sum + (subtype.declaredCapacity ?? 0);
  }, 0);
  return { tableCount: tables.length, seatCount, layoutId: current.id };
}

function assertMatchingFixture(
  fixture: CapacityLiveFixtureCode,
  guestCount: number,
  tableCount: number,
  seatCount: number,
  eventName: string,
) {
  const expected = fixture === "CAP600" ? CAP600_EXPECTED : CAP1000_EXPECTED;
  const expectedName = fixture === "CAP600" ? CAP600_EVENT_NAME : CAP1000_EVENT_NAME;
  if (guestCount !== expected.guests || tableCount !== expected.tables || seatCount !== expected.seats) {
    throw new Error(
      `BLOCKED — CAP${fixture === "CAP600" ? "600" : "1000"} PROVENANCE: existing ${fixture} event structure mismatch ` +
        `(guests=${guestCount}, tables=${tableCount}, seats=${seatCount}; expected ${expected.guests}/${expected.tables}/${expected.seats})`,
    );
  }
  if (!eventName.includes(fixture === "CAP600" ? "Capacity Qualification 600" : "Capacity Stretch 1000")) {
    throw new Error(`BLOCKED — ${fixture} PROVENANCE: existing event name does not match synthetic qualification label`);
  }
  if (fixture === "CAP600" && !eventName.includes("SYNTHETIC QUALIFICATION") && eventName !== "Capacity Qualification 600") {
    // Allow legacy ephemeral name "Capacity Qualification 600" only when structure matches.
  }
  void expectedName;
}

/**
 * Install or verify CAP600 / CAP1000 on an already-open PlatformService/store.
 * Uses accepted product commands. Caller must open the store against the target DB.
 */
export async function installCapacityLiveFixture(
  service: PlatformService,
  store: FlushableStore,
  options: CapacityLiveInstallOptions,
): Promise<CapacityLiveInstallResult> {
  const edition = options.fixture === "CAP600" ? CAP600_EDITION : CAP1000_EDITION;
  const expected = options.fixture === "CAP600" ? CAP600_EXPECTED : CAP1000_EXPECTED;
  assertCapacityLiveInstallSafety({
    fixture: options.fixture,
    confirmSyntheticQualification: options.confirmSyntheticQualification,
    expectedEdition: edition,
    expectedGuestCount: expected.guests,
    expectedTableCount: expected.tables,
    expectedSeatCount: expected.seats,
    expectedCorpusHash: options.expectedCorpusHash,
    authorityPersonId: options.authorityPersonId ?? people.personAdmin,
    env: options.env,
    productionAuthorised: options.productionAuthorised,
    providersInactive: options.providersInactive,
    communicationsInactive: options.communicationsInactive,
    realDataMode: options.realDataMode ?? false,
  });

  const NOW = options.now ?? new Date().toISOString();
  const code = options.fixture === "CAP600" ? CAP600_EVENT_CODE : CAP1000_EVENT_CODE;
  const name = options.fixture === "CAP600" ? CAP600_EVENT_NAME : CAP1000_EVENT_NAME;
  const prefix = options.fixture === "CAP600" ? "cap600-live" : "cap1000-live";
  const corpusSeed =
    options.fixture === "CAP600" ? CAPACITY_SCENARIO_SEEDS.B_TYPICAL : CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL;
  const corpusHash = options.fixture === "CAP1000" ? capacity1000CorpusHash("B_TYPICAL") : options.expectedCorpusHash;
  const progress = options.onProgress ?? (() => undefined);

  const ceo = { personId: people.personCeo, correlationId: `${prefix}-ceo`, now: NOW, actorKind: "HUMAN" as const };
  const planner = { personId: people.personPlanner, correlationId: `${prefix}-planner`, now: NOW, actorKind: "HUMAN" as const };
  const director = {
    personId: people.personDirector,
    correlationId: `${prefix}-director`,
    now: NOW,
    actorKind: "HUMAN" as const,
  };
  const admin = { personId: people.personAdmin, correlationId: `${prefix}-admin`, now: NOW, actorKind: "HUMAN" as const };

  const existing = findFixtureEvent(store, code);
  if (existing) {
    const guestCount = store.listOperationalGuestsByEventId(people.orgMaison, existing.id).length;
    const totals = layoutTotals(store, service, director, existing.id);
    assertMatchingFixture(options.fixture, guestCount, totals.tableCount, totals.seatCount, existing.name);
    progress(`${code} exact replay — returning existing event ${existing.id}`);
    return {
      fixture: options.fixture,
      dryRun: Boolean(options.dryRun),
      verifyOnly: Boolean(options.verifyOnly),
      replay: true,
      eventId: existing.id,
      eventCode: code,
      eventName: existing.name,
      edition,
      guestCount,
      tableCount: totals.tableCount,
      seatCount: totals.seatCount,
      evidenceCommit: options.fixture === "CAP600" ? CAP600_QUALIFICATION_EVIDENCE_COMMIT : undefined,
      corpusSeed,
      corpusHash,
      installedAt: NOW,
    };
  }

  if (options.verifyOnly) {
    throw new Error(`${code} verify-only failed: fixture not present`);
  }

  if (options.dryRun) {
    progress(`${code} dry-run OK — would create ${name} with ${expected.guests}/${expected.tables}/${expected.seats}`);
    return {
      fixture: options.fixture,
      dryRun: true,
      verifyOnly: false,
      replay: false,
      eventId: "dry-run-not-created",
      eventCode: code,
      eventName: name,
      edition,
      guestCount: expected.guests,
      tableCount: expected.tables,
      seatCount: expected.seats,
      evidenceCommit: options.fixture === "CAP600" ? CAP600_QUALIFICATION_EVIDENCE_COMMIT : undefined,
      corpusSeed,
      corpusHash,
      installedAt: NOW,
    };
  }

  progress(`Creating ${code} event…`);
  const event = service.createEvent(ceo, {
    organisationId: people.orgMaison,
    clientId: people.clientAlpha,
    code,
    name,
    startsAt: options.fixture === "CAP600" ? "2026-12-20T09:00:00.000Z" : "2026-12-21T09:00:00.000Z",
    endsAt: options.fixture === "CAP600" ? "2026-12-20T22:00:00.000Z" : "2026-12-21T22:00:00.000Z",
    timezone: "Africa/Lagos",
  });
  await flushStore(store);

  const plannerGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personPlanner,
    roleKey: "PLANNER",
    clientId: people.clientAlpha,
    eventId: event.id,
    reason: `${code} live verification planner grant`,
    idempotencyKey: `${prefix}-grant-planner`,
  });
  const directorGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personDirector,
    roleKey: "EVENT_DIRECTOR",
    clientId: people.clientAlpha,
    eventId: event.id,
    reason: `${code} live verification director grant`,
    idempotencyKey: `${prefix}-grant-director`,
  });
  const ceoGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personCeo,
    roleKey: "CEO",
    clientId: people.clientAlpha,
    eventId: event.id,
    reason: `${code} live verification CEO event-scoped grant`,
    idempotencyKey: `${prefix}-grant-ceo`,
  });
  const auditorGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personAuditor,
    roleKey: "READ_ONLY_AUDITOR",
    clientId: people.clientAlpha,
    eventId: event.id,
    reason: `${code} live verification read-only auditor grant`,
    idempotencyKey: `${prefix}-grant-auditor`,
  });
  await flushStore(store);

  service.prepareEventRsvp(director, {
    organisationId: people.orgMaison,
    eventId: event.id,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: name,
    reason: `${code} live qualification RSVP`,
    idempotencyKey: `${prefix}-rsvp`,
  });
  await flushStore(store);

  progress(`Publishing ${code} layout…`);
  if (options.fixture === "CAP600") {
    await applyCapacity600SeatingLayout(service, store, event.id, planner, director, prefix, {
      plannerAssignmentId: plannerGrant.id,
      directorAssignmentId: directorGrant.id,
    });
  } else {
    await applyCapacity1000SeatingLayout(service, store, event.id, planner, director, prefix, {
      plannerAssignmentId: plannerGrant.id,
      directorAssignmentId: directorGrant.id,
    });
  }
  await flushStore(store);

  const guestNames =
    options.fixture === "CAP600" ? capacityBrowserGuestNames() : capacity1000BrowserGuestNames();
  const flushEvery = options.guestFlushEvery ?? 25;
  const emailDomain = options.fixture === "CAP600" ? "cap600.example.test" : "cap1000.example.test";
  for (let index = 0; index < expected.guests; index += 1) {
    const guestName = guestNames[index]!;
    const guest = service.intakeGuest(director, {
      organisationId: people.orgMaison,
      eventId: event.id,
      givenName: guestName.givenName,
      familyName: guestName.familyName,
      email: `${guestName.givenName.toLowerCase()}.${guestName.familyName.toLowerCase()}@${emailDomain}`,
      reason: `${code} synthetic guest`,
      idempotencyKey: `${prefix}-guest-${index}-in`,
    });
    service.staffEnterRsvp(director, {
      organisationId: people.orgMaison,
      eventId: event.id,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: `${code} attending`,
      idempotencyKey: `${prefix}-guest-${index}-attend`,
    });
    if ((index + 1) % flushEvery === 0) {
      await flushStore(store);
      progress(`${code} guests flushed ${index + 1}/${expected.guests}`);
    }
  }
  await flushStore(store);

  const guestCount = store.listOperationalGuestsByEventId(people.orgMaison, event.id).length;
  const totals = layoutTotals(store, service, director, event.id);
  assertMatchingFixture(options.fixture, guestCount, totals.tableCount, totals.seatCount, name);

  // Silence unused if tree-shaken oddly
  void ceoGrant;
  void auditorGrant;

  return {
    fixture: options.fixture,
    dryRun: false,
    verifyOnly: false,
    replay: false,
    eventId: event.id,
    eventCode: code,
    eventName: name,
    edition,
    guestCount,
    tableCount: totals.tableCount,
    seatCount: totals.seatCount,
    plannerAssignmentId: plannerGrant.id,
    directorAssignmentId: directorGrant.id,
    auditorAssignmentId: auditorGrant.id,
    ceoEventAssignmentId: ceoGrant.id,
    evidenceCommit: options.fixture === "CAP600" ? CAP600_QUALIFICATION_EVIDENCE_COMMIT : undefined,
    corpusSeed,
    corpusHash,
    installedAt: NOW,
  };
}
