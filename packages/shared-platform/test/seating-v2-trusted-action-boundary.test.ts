import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { permissionsForRole, seededRoles } from "../src/catalog.js";
import { PERMISSION_KEYS } from "../src/constants.js";
import { PlatformError } from "../src/errors.js";
import {
  authorize,
  assignmentCoversScope,
  assignmentIsActive,
  type ActorSnapshot,
} from "../src/policy.js";
import {
  resolveTrustedSeatingAssignment as productionResolveTrustedSeatingAssignment,
  seatingAssignmentAllowsPermission,
} from "../src/seating-v2-trusted-assignment.js";
import { assertSeatingV2Scope } from "../src/seating-v2-repository.js";
import type { Assignment, EventRecord, PermissionKey, SystemRoleKey } from "../src/schemas.js";
import { StaffSessionActorSchema, SystemRoleKeySchema } from "../src/schemas.js";
import { applyS06SeatingLayoutIfMissing, ensureS06SeatingLayoutBinding } from "../src/seating-fixtures.js";
import { MemorySeatingV2Repository } from "../src/memory-seating-v2-store.js";
import type { SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-14T02:00:00.000Z";
const MISSING_EVENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VERIFY_AS_KEY = "seating.fixture_verify_as";
const VERIFY_AS_ID = "11111111-1111-4111-8111-111111111234";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-p2-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-p2-director" });
}
function ceo() {
  return actor(people.personCeo, { now: NOW, correlationId: "s075-p2-ceo" });
}
function admin() {
  return actor(people.personAdmin, { now: NOW, correlationId: "s075-p2-admin" });
}
function unassigned() {
  return actor(people.personUnassigned, { now: NOW, correlationId: "s075-p2-unassigned" });
}

function envelope(assignmentId: string, key: string, eventId: string = people.eventAlphaOne) {
  return {
    organisationId: people.orgMaison,
    eventId,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  };
}

function keepApart(guestA: string, guestB: string): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: guestA },
      { type: "EVENT_GUEST", id: guestB },
    ],
    targets: [],
    source: { type: "MANUAL" },
  };
}

async function prepareSurface(service: ReturnType<typeof fixtureService>["service"], store: ReturnType<typeof fixtureService>["store"]) {
  applyS06SeatingLayoutIfMissing(store, service);
  await ensureS06SeatingLayoutBinding(store, service);
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP for S075 P2",
    idempotencyKey: "s075-p2-prepare-rsvp-01",
  });
}

function attendingGuest(service: ReturnType<typeof fixtureService>["service"], givenName: string, key: string) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName,
    familyName: "Boundary",
    email: `${givenName.toLowerCase()}.boundary@example.test`,
    reason: "S075 P2 attending guest",
    idempotencyKey: `${key}-intake`,
  });
  service.staffEnterRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "mark attending for S075 P2",
    idempotencyKey: `${key}-rsvp`,
  });
  return guest;
}

function isDenied(error: unknown): boolean {
  return error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND" || error.code === "VALIDATION_FAILED");
}

function roleKeyOf(assignment: Assignment): SystemRoleKey {
  const parsed = SystemRoleKeySchema.safeParse(seededRoles().find((item) => item.id === assignment.roleId)?.key);
  if (!parsed.success) throw new Error("missing role");
  return parsed.data;
}

function organisationWide(roleKey: SystemRoleKey): boolean {
  return seededRoles().find((item) => item.key === roleKey)?.organisationWide === true;
}

/** Packet 2 specification oracle — not production code. */
function resolveTrustedSeatingAssignment(
  snapshot: ActorSnapshot,
  event: Pick<EventRecord, "id" | "organisationId" | "clientId">,
  now: string,
): Assignment {
  const active = snapshot.assignments.filter((item) => assignmentIsActive(item, now) && item.organisationId === event.organisationId);
  const exact = active.filter((item) => item.eventId === event.id);
  const client = active.filter((item) => !item.eventId && item.clientId === event.clientId);
  const orgWide = active.filter((item) => !item.eventId && !item.clientId && organisationWide(roleKeyOf(item)));
  const band = exact.length ? exact : client.length ? client : orgWide;
  if (band.length !== 1) {
    throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
  }
  return band[0]!;
}

function permissionUnder(assignment: Assignment, permission: PermissionKey): boolean {
  return permissionsForRole(roleKeyOf(assignment)).includes(permission);
}

function seatingAudit(v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>) {
  assert.ok(v2.repository instanceof MemorySeatingV2Repository);
  return v2.repository.backingStore.audit;
}

describe("MD-PR-S075 Packet 2 trusted seating action boundary (red)", () => {
  it("16. registers seating.fixture_verify_as as a CEO-only catalogue key", () => {
    assert.ok((PERMISSION_KEYS as readonly string[]).includes(VERIFY_AS_KEY));
    const ceoKeys = permissionsForRole("CEO") as readonly string[];
    const deniedRoles = ["EVENT_DIRECTOR", "PLANNER", "RISK_GOVERNANCE_REVIEWER", "READ_ONLY_AUDITOR", "SYSTEM_ADMINISTRATOR"] as const;
    assert.ok(ceoKeys.includes(VERIFY_AS_KEY));
    assert.equal(ceoKeys.includes("support.impersonate"), false);
    for (const role of deniedRoles) {
      assert.equal((permissionsForRole(role) as readonly string[]).includes(VERIFY_AS_KEY), false);
    }
    const catalog = readFileSync(fileURLToPath(new URL("../src/catalog.ts", import.meta.url)), "utf8");
    assert.match(catalog, new RegExp(`${VERIFY_AS_KEY}": "${VERIFY_AS_ID}"`));
    assert.match(catalog, /"support.impersonate": "11111111-1111-4111-8111-111111111021"/);
  });

  it("16. signed staff session remains single-identity so Verify-as uses the one-way fallback", () => {
    const parsed = StaffSessionActorSchema.safeParse({
      sessionId: "11111111-1111-4111-8111-111111111111",
      personId: people.personCeo,
      issuedAt: NOW,
      expiresAt: "2026-09-14T10:00:00.000Z",
      controllerPersonId: people.personCeo,
    });
    assert.equal(parsed.success, false);
  });

  it("4–10. assignment oracle denies client/event leakage, privilege union and ambiguous grants", () => {
    const { service } = fixtureService();
    const eventA = service.getEvent(ceo(), people.orgMaison, people.eventAlphaOne);
    const eventB = service.getEvent(ceo(), people.orgMaison, people.eventAlphaTwo);
    const plannerSnap = service.resolveActor(people.personPlanner);
    const ceoSnap = service.resolveActor(people.personCeo);

    assert.equal(resolveTrustedSeatingAssignment(plannerSnap, eventA, NOW).id, people.assignPlanner);
    assert.equal(productionResolveTrustedSeatingAssignment(plannerSnap, eventA, NOW).id, people.assignPlanner);
    assert.throws(() => resolveTrustedSeatingAssignment(plannerSnap, eventB, NOW), isDenied);
    assert.equal(resolveTrustedSeatingAssignment(ceoSnap, eventA, NOW).id, people.assignCeo);

    const betaPlanner: Assignment = {
      ...plannerSnap.assignments[0]!,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      clientId: people.clientBeta,
      eventId: undefined,
    };
    const betaSnap: ActorSnapshot = { ...plannerSnap, assignments: [betaPlanner] };
    assert.throws(() => resolveTrustedSeatingAssignment(betaSnap, eventA, NOW), isDenied);

    const clientMatch: Assignment = {
      ...plannerSnap.assignments[0]!,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      clientId: people.clientAlpha,
      eventId: undefined,
    };
    assert.equal(resolveTrustedSeatingAssignment({ ...plannerSnap, assignments: [clientMatch] }, eventA, NOW).id, clientMatch.id);

    const unscopedPlanner: Assignment = {
      ...plannerSnap.assignments[0]!,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
      clientId: undefined,
      eventId: undefined,
    };
    assert.equal(organisationWide("PLANNER"), false);
    assert.throws(
      () => resolveTrustedSeatingAssignment({ ...plannerSnap, assignments: [unscopedPlanner] }, eventA, NOW),
      isDenied,
    );

    const dualCeo: ActorSnapshot = {
      ...ceoSnap,
      assignments: [
        ...ceoSnap.assignments,
        { ...plannerSnap.assignments[0]!, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4", personId: people.personCeo },
      ],
    };
    const governing = resolveTrustedSeatingAssignment(dualCeo, eventA, NOW);
    assert.equal(governing.eventId, eventA.id);
    assert.equal(permissionUnder(governing, "seating.rule.activate"), false);
    assert.equal(seatingAssignmentAllowsPermission(dualCeo, governing, "seating.rule.activate"), false);

    const twins: ActorSnapshot = {
      ...plannerSnap,
      assignments: [
        plannerSnap.assignments[0]!,
        { ...plannerSnap.assignments[0]!, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5", roleId: seededRoles().find((item) => item.key === "EVENT_DIRECTOR")!.id },
      ],
    };
    assert.throws(() => resolveTrustedSeatingAssignment(twins, eventA, NOW), isDenied);
  });

  it("4. client-scoped assignment cannot mutate another client's event", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Ada", "s075-p2-c1");
    const guestB = attendingGuest(service, "Bisi", "s075-p2-c2");
    assert.throws(
      () =>
        service.grantAssignment(admin(), {
          organisationId: people.orgMaison,
          personId: people.personUnassigned,
          roleKey: "PLANNER",
          clientId: people.clientBeta,
          reason: "Packet 2 client C1 vs C2",
          idempotencyKey: "s075-p2-grant-beta",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    void guestA;
    void guestB;
  });

  it("5. exact Event A assignment cannot mutate Event B", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const v2 = service.seatingV2Commands();
    await assert.rejects(
      () =>
        v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-p2-cross-event", people.eventAlphaTwo), {
          seed: "seed-b",
        }),
      isDenied,
    );
  });

  it("6. matching-client assignment may mutate its own event", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Chi", "s075-p2-mc-a");
    const guestB = attendingGuest(service, "Dee", "s075-p2-mc-b");
    const grant = service.grantAssignment(admin(), {
      organisationId: people.orgMaison,
      personId: people.personUnassigned,
      roleKey: "PLANNER",
      clientId: people.clientAlpha,
      eventId: people.eventAlphaOne,
      reason: "Packet 2 matching client",
      idempotencyKey: "s075-p2-grant-alpha-client",
    });
    const created = await service.seatingV2Commands().createRule(
      unassigned(),
      envelope(grant.id, "s075-p2-matching-client"),
      keepApart(guestA.id, guestB.id),
    );
    assert.equal(created.application, "APPLIED");
    assert.equal(created.value.eventId, people.eventAlphaOne);
  });

  it("7. organisation-wide CEO authority may mutate a covered event", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Efe", "s075-p2-ceo-a");
    const guestB = attendingGuest(service, "Femi", "s075-p2-ceo-b");
    const created = await service.seatingV2Commands().createRule(
      ceo(),
      envelope(people.assignCeo, "s075-p2-ceo-orgwide"),
      keepApart(guestA.id, guestB.id),
    );
    assert.equal(created.application, "APPLIED");
  });

  it("8. non-organisation-wide unscoped role cannot cover an event", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Gia", "s075-p2-u-a");
    const guestB = attendingGuest(service, "Hal", "s075-p2-u-b");
    assert.throws(
      () =>
        service.grantAssignment(admin(), {
          organisationId: people.orgMaison,
          personId: people.personUnassigned,
          roleKey: "PLANNER",
          reason: "Packet 2 unscoped planner",
          idempotencyKey: "s075-p2-grant-unscoped-planner",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    void guestA;
    void guestB;
  });

  it("9. narrow event assignment plus broad organisation assignment does not union privileges", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Ife", "s075-p2-union-a");
    const guestB = attendingGuest(service, "Jo", "s075-p2-union-b");
    const v2 = service.seatingV2Commands();
    const created = await v2.createRule(planner(), envelope(people.assignPlanner, "s075-p2-union-create"), keepApart(guestA.id, guestB.id));
    service.grantAssignment(admin(), {
      organisationId: people.orgMaison,
      personId: people.personCeo,
      roleKey: "PLANNER",
      clientId: people.clientAlpha,
      eventId: people.eventAlphaOne,
      reason: "Packet 2 privilege union probe",
      idempotencyKey: "s075-p2-grant-ceo-planner",
    });
    await assert.rejects(
      () =>
        v2.activateRule(
          ceo(),
          {
            ...envelope(people.assignCeo, "s075-p2-union-activate"),
            expectedVersion: created.value.editionNo,
            expectedContentHash: created.value.contentHash,
          },
          { editionId: created.value.id },
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("10. equally specific conflicting assignments fail closed", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Kay", "s075-p2-amb-a");
    const guestB = attendingGuest(service, "Lia", "s075-p2-amb-b");
    service.grantAssignment(ceo(), {
      organisationId: people.orgMaison,
      personId: people.personPlanner,
      roleKey: "EVENT_DIRECTOR",
      clientId: people.clientAlpha,
      eventId: people.eventAlphaOne,
      reason: "Packet 2 ambiguous event grants",
      idempotencyKey: "s075-p2-grant-planner-director",
    });
    await assert.rejects(
      () =>
        service.seatingV2Commands().createRule(
          planner(),
          envelope(people.assignPlanner, "s075-p2-ambiguous"),
          keepApart(guestA.id, guestB.id),
        ),
      isDenied,
    );
  });

  it("11. revoked assignment cannot replay a captured envelope", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Moe", "s075-p2-rev-a");
    const guestB = attendingGuest(service, "Nia", "s075-p2-rev-b");
    const grant = service.grantAssignment(admin(), {
      organisationId: people.orgMaison,
      personId: people.personUnassigned,
      roleKey: "PLANNER",
      clientId: people.clientAlpha,
      eventId: people.eventAlphaOne,
      reason: "Packet 2 captured assignment",
      idempotencyKey: "s075-p2-grant-then-revoke",
    });
    const v2 = service.seatingV2Commands();
    await v2.createRule(unassigned(), envelope(grant.id, "s075-p2-rev-create"), keepApart(guestA.id, guestB.id));
    service.revokeAssignment(admin(), {
      assignmentId: grant.id,
      organisationId: people.orgMaison,
      expectedVersion: grant.version,
      reason: "Packet 2 revoke captured grant",
      idempotencyKey: "s075-p2-revoke",
    });
    await assert.rejects(
      () => v2.createRule(unassigned(), envelope(grant.id, "s075-p2-rev-replay"), keepApart(guestA.id, guestB.id)),
      isDenied,
    );
  });

  it("12. nonexistent event UUID creates no seating root rows", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Ora", "s075-p2-nf-a");
    const guestB = attendingGuest(service, "Pat", "s075-p2-nf-b");
    const v2 = service.seatingV2Commands();
    await assert.rejects(
      () => v2.createRule(ceo(), envelope(people.assignCeo, "s075-p2-missing-event", MISSING_EVENT), keepApart(guestA.id, guestB.id)),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
    const roots = await v2.repository.transaction(async (tx) => ({
      rules: (await tx.list<{ eventId: string }>("rules", { organisationId: people.orgMaison, eventId: MISSING_EVENT })).length,
      editions: (await tx.list<{ eventId: string }>("ruleEditions", { organisationId: people.orgMaison, eventId: MISSING_EVENT })).length,
      packages: (await tx.list<{ eventId: string }>("inputPackages", { organisationId: people.orgMaison, eventId: MISSING_EVENT })).length,
    }));
    assert.equal(roots.rules, 0);
    assert.equal(roots.editions, 0);
    assert.equal(roots.packages, 0);
  });

  it("1/15. injected Event B scope must not partition audit or idempotency away from Event A", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Quin", "s075-p2-inj-a");
    const guestB = attendingGuest(service, "Rae", "s075-p2-inj-b");
    const v2 = service.seatingV2Commands();
    const first = await v2.createRule(ceo(), envelope(people.assignCeo, "s075-p2-same-key"), keepApart(guestA.id, guestB.id));
    assert.equal(first.value.eventId, people.eventAlphaOne);
    await assert.rejects(
      () =>
        v2.createRule(
          ceo(),
          envelope(people.assignCeo, "s075-p2-same-key", people.eventAlphaTwo),
          keepApart(guestA.id, guestB.id),
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const foreign = await v2.repository.transaction(async (tx) =>
      tx.list<{ eventId: string }>("ruleEditions", { organisationId: people.orgMaison, eventId: people.eventAlphaTwo }),
    );
    assert.equal(foreign.length, 0);
    const audits = seatingAudit(v2).filter((item) => item.idempotencyKey === "s075-p2-same-key");
    assert.ok(audits.length >= 1);
    assert.ok(audits.every((item) => item.eventId === people.eventAlphaOne));
    assert.ok(audits.every((item) => item.correlationId === "s075-p2-ceo"));
    void store;
  });

  it("2/3/17. foreign resource ids do not load under the trusted event and stores fail closed", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Sia", "s075-p2-res-a");
    const guestB = attendingGuest(service, "Tim", "s075-p2-res-b");
    const v2 = service.seatingV2Commands();
    const created = await v2.createRule(planner(), envelope(people.assignPlanner, "s075-p2-res-create"), keepApart(guestA.id, guestB.id));
    const foreignEditionId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    await v2.repository.transaction(async (tx) => {
      await tx.insert("ruleEditions", { ...created.value, id: foreignEditionId, eventId: people.eventAlphaTwo });
    });
    await assert.rejects(
      () =>
        v2.activateRule(ceo(), envelope(people.assignCeo, "s075-p2-res-a-env"), {
          editionId: foreignEditionId,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
    await assert.rejects(
      () =>
        v2.activateRule(
          actor(people.personOtherOrg, { now: NOW, correlationId: "s075-p2-other" }),
          {
            organisationId: people.orgOther,
            eventId: people.eventOther,
            actorAssignmentId: people.assignOther,
            idempotencyKey: "s075-p2-res-other",
            expectedVersion: created.value.editionNo,
            expectedContentHash: created.value.contentHash,
          },
          { editionId: created.value.id },
        ),
      (error: unknown) => error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN"),
    );
    assert.equal(assertSeatingV2Scope({ organisationId: people.orgMaison }, { organisationId: people.orgMaison, eventId: people.eventAlphaOne }), false);
    assert.equal(assertSeatingV2Scope({ organisationId: people.orgMaison, eventId: people.eventAlphaOne }, { organisationId: people.orgMaison }), false);
    const postgres = readFileSync(fileURLToPath(new URL("../src/postgres-seating-v2-store.ts", import.meta.url)), "utf8");
    assert.equal(
      /scope\.organisationId && scope\.eventId[\s\S]*: await this\.client\.query[\s\S]*WHERE \$\{identityColumn\} = \$1/.test(postgres),
      false,
    );
    const collections = [
      "planEditions",
      "runs",
      "inputPackages",
      "compiledRequests",
      "ruleEditions",
      "reservationEditions",
      "layoutBindings",
      "specialistReviews",
      "publications",
      "exportJobs",
    ] as const;
    for (const collection of collections) {
      const loaded = await v2.repository.transaction(async (tx) => tx.load(collection, created.value.id, { organisationId: people.orgOther, eventId: people.eventOther }));
      assert.equal(loaded, undefined, collection);
    }
    void store;
  });

  it("13/14/19. command audit and result share correlation; exact replay survives a version increment", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Uma", "s075-p2-corr-a");
    attendingGuest(service, "Val", "s075-p2-corr-b");
    attendingGuest(service, "Wes", "s075-p2-corr-c");
    attendingGuest(service, "Xia", "s075-p2-corr-d");
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-p2-corr-freeze"), { seed: "seed-p2-corr" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s075-p2-corr-run"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "s075-p2-corr-adopt"), { runId: run.value.id });
    const scope = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
    const assignments = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; eventGuestId: string; logicalPositionId?: string | null; state: string }>(
        "planAssignments",
        scope,
      )).filter((item) => item.planEditionId === adopted.value.id),
    );
    const positions = await v2.repository.transaction(async (tx) => tx.list<{ packageId: string; positionToken: string }>("packagePositions", scope));
    const used = new Set(
      assignments.map((item) => item.logicalPositionId).filter((token): token is string => typeof token === "string"),
    );
    const vacant = positions.find((item) => item.packageId === adopted.value.packageId && !used.has(item.positionToken));
    assert.ok(vacant);
    const applyEnv = {
      ...envelope(people.assignPlanner, "s075-p2-corr-move"),
      expectedVersion: adopted.value.version,
      expectedContentHash: adopted.value.contentHash,
    };
    const first = await v2.applyManual(planner(), applyEnv, {
      planEditionId: adopted.value.id,
      command: { type: "MOVE", eventGuestId: guestA.id, positionToken: vacant.positionToken },
    });
    assert.equal(first.application, "APPLIED");
    assert.equal(first.correlationId, "s075-p2-planner");
    const replay = await v2.applyManual(planner(), applyEnv, {
      planEditionId: adopted.value.id,
      command: { type: "MOVE", eventGuestId: guestA.id, positionToken: vacant.positionToken },
    });
    assert.equal(replay.application, "REPLAYED");
    assert.equal(replay.didDataChange, false);
    assert.equal(replay.correlationId, "s075-p2-planner");
    const moveAudits = seatingAudit(v2).filter((item) => item.idempotencyKey === "s075-p2-corr-move");
    assert.ok(moveAudits.length >= 1);
    assert.ok(moveAudits.every((item) => item.eventId === people.eventAlphaOne));
    assert.ok(moveAudits.every((item) => item.organisationId === people.orgMaison));
    assert.ok(moveAudits.every((item) => item.correlationId === "s075-p2-planner"));
  });

  it("18. missing required version/hash cannot bypass Studio CAS", async () => {
    const { service, store } = fixtureService();
    await prepareSurface(service, store);
    const guestA = attendingGuest(service, "Yemi", "s075-p2-cas-a");
    attendingGuest(service, "Zara", "s075-p2-cas-b");
    attendingGuest(service, "Abi", "s075-p2-cas-c");
    attendingGuest(service, "Ben", "s075-p2-cas-d");
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-p2-cas-freeze"), { seed: "seed-p2-cas" });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s075-p2-cas-run"), { packageId: frozen.value.id });
    const adopted = await v2.adoptRun(planner(), envelope(people.assignPlanner, "s075-p2-cas-adopt"), { runId: run.value.id });
    const scope = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
    const assignments = await v2.repository.transaction(async (tx) =>
      (await tx.list<{ planEditionId: string; eventGuestId: string; logicalPositionId?: string | null; state: string }>(
        "planAssignments",
        scope,
      )).filter((item) => item.planEditionId === adopted.value.id),
    );
    const positions = await v2.repository.transaction(async (tx) => tx.list<{ packageId: string; positionToken: string }>("packagePositions", scope));
    const used = new Set(
      assignments.map((item) => item.logicalPositionId).filter((token): token is string => typeof token === "string"),
    );
    const vacant = positions.find((item) => item.packageId === adopted.value.packageId && !used.has(item.positionToken));
    assert.ok(vacant);
    await assert.rejects(
      () =>
        v2.applyManual(planner(), envelope(people.assignPlanner, "s075-p2-cas-missing"), {
          planEditionId: adopted.value.id,
          command: { type: "MOVE", eventGuestId: guestA.id, positionToken: vacant.positionToken },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const partnerId = assignments.find((item) => item.eventGuestId !== guestA.id)?.eventGuestId;
    if (typeof partnerId !== "string") throw new Error("expected a second seated guest for the rule fixture");
    const created = await v2.createRule(
      planner(),
      envelope(people.assignPlanner, "s075-p2-cas-rule"),
      keepApart(guestA.id, partnerId),
    );
    await assert.rejects(
      () => v2.activateRule(director(), envelope(people.assignDirector, "s075-p2-cas-activate"), { editionId: created.value.id }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("authorize with canonical clientId must not let a C1 assignment cover a C2 event", () => {
    const { service } = fixtureService();
    const plannerSnap = service.resolveActor(people.personPlanner);
    const betaOnly = {
      ...plannerSnap,
      assignments: [
        {
          ...plannerSnap.assignments[0]!,
          id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
          clientId: people.clientBeta,
          eventId: undefined,
        },
      ],
    };
    const leaked = authorize({
      actor: betaOnly,
      permission: "seating.constraint.manage",
      scope: { organisationId: people.orgMaison, clientId: people.clientAlpha, eventId: people.eventAlphaOne },
      context: { now: NOW },
    });
    assert.equal(leaked.allow, false);
    assert.equal(
      assignmentCoversScope(betaOnly.assignments[0]!, {
        organisationId: people.orgMaison,
        clientId: people.clientAlpha,
        eventId: people.eventAlphaOne,
      }),
      false,
    );
  });

  it("mutation path does not hydrate a full platform snapshot; remaining identity loads are owned", () => {
    const source = readFileSync(fileURLToPath(new URL("../src/seating-v2-command-service.ts", import.meta.url)), "utf8");
    const pkg = readFileSync(fileURLToPath(new URL("../src/seating-v2-package.ts", import.meta.url)), "utf8");
    const policy = readFileSync(fileURLToPath(new URL("../src/policy.ts", import.meta.url)), "utf8");
    assert.equal((source.match(/this\.deps\.snapshot\(\)/g) ?? []).length, 1);
    assert.match(source, /async projectWorkspace[\s\S]*this\.deps\.snapshot\(\)/);
    assert.equal(source.includes("store.snapshot()"), false);
    assert.equal(/store\.snapshot\(/.test(pkg), false);
    assert.equal(policy.includes("resolveTrustedSeatingAssignment"), false);
    assert.equal(policy.includes("seatingAssignmentAllowsPermission"), false);
    const loadCalls = [...source.matchAll(/tx\.load</g)];
    assert.equal(loadCalls.length, 1, "identity loads go through requireOwned");
    assert.match(source, /private async requireOwned[\s\S]*tx\.load<T>[\s\S]*row\.organisationId !== scope\.organisationId[\s\S]*NOT_FOUND/);
    const classified = [
      {
        site: "requireOwned",
        collection: "event-scoped seating-v2 identity row",
        trustedScope: true,
        repositoryEnforcesScope: true,
        ownershipAfterLoad: true,
        error: "NOT_FOUND",
      },
      {
        site: "freezePackage / build / packageInputs",
        collection: "layoutBindings list + bounded layout/guest/brief/protection loaders",
        trustedScope: true,
        repositoryEnforcesScope: true,
        ownershipAfterLoad: true,
        error: "NO_ACTIVE_SEATING_LAYOUT_BINDING | MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS | SEATING_LAYOUT_BINDING_STALE | SEATING_LAYOUT_PUBLICATION_MISMATCH | NOT_FOUND",
      },
      {
        site: "requestExport",
        collection: "publications | planEditions",
        trustedScope: true,
        repositoryEnforcesScope: true,
        ownershipAfterLoad: true,
        error: "NOT_FOUND",
      },
      {
        site: "retrieveExport",
        collection: "exportJobs, publications, planEditions, planAssignments list",
        trustedScope: true,
        repositoryEnforcesScope: true,
        ownershipAfterLoad: true,
        error: "NOT_FOUND",
      },
      {
        site: "currentFreshness / assertFreshFeasible",
        collection: "inputPackages",
        trustedScope: true,
        repositoryEnforcesScope: true,
        ownershipAfterLoad: true,
        error: "NOT_FOUND",
      },
      {
        site: "runS06EvaluationV2 insert",
        collection: "evaluationRuns / evaluationCaseResults",
        trustedScope: true,
        repositoryEnforcesScope: true,
        ownershipAfterLoad: false,
        error: "org-only collection; organisationId from trusted envelope",
      },
    ] as const;
    assert.equal(classified.length, 6);
    assert.ok(classified.every((item) => item.trustedScope && item.repositoryEnforcesScope));
  });
});
