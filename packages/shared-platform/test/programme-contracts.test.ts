import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import { PERMISSION_KEYS } from "../src/constants.js";
import { ProgrammePhaseSchema, PhaseEntitlementSchema } from "../src/programme-schemas.js";
import { wholeEventAttendanceUnion } from "../src/programme-operations.js";
import { emptySnapshot } from "../src/store.js";
import type { PermissionKey } from "../src/schemas.js";

const AT = "2026-09-07T10:00:00.000Z";
const ORG = "00000000-0000-4000-8000-000000000001";
const CLIENT = "00000000-0000-4000-8000-000000000011";
const EVENT = "00000000-0000-4000-8000-000000000021";

describe("EOS-S04B contracts", () => {
  it("assigns programme permissions without expanding Planner into protected or publish authority", () => {
    const required: readonly PermissionKey[] = [
      "programme.view",
      "programme.phase.manage",
      "programme.route.manage",
      "programme.checkpoint.manage",
      "programme.entitlement.manage",
      "programme.protectedAccess.grant",
      "programme.vehicle.manage",
      "programme.accessPlan.publish",
      "programme.exception.review",
    ];
    for (const key of required) {
      assert.ok((PERMISSION_KEYS as readonly string[]).includes(key));
    }
    const planner = permissionsForRole("PLANNER");
    assert.ok(planner.includes("programme.phase.manage"));
    assert.ok(planner.includes("programme.entitlement.manage"));
    assert.equal(planner.includes("programme.protectedAccess.grant"), false);
    assert.equal(planner.includes("programme.accessPlan.publish"), false);
    assert.equal(planner.includes("programme.exception.review"), false);
    const director = permissionsForRole("EVENT_DIRECTOR");
    assert.ok(director.includes("programme.protectedAccess.grant"));
    assert.ok(director.includes("programme.accessPlan.publish"));
    const auditor = permissionsForRole("READ_ONLY_AUDITOR");
    assert.ok(auditor.includes("programme.view"));
    assert.equal(auditor.includes("programme.phase.manage"), false);
    const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
    assert.equal(admin.includes("programme.view"), false);
    assert.ok(required.every((key) => permissionsForRole("CEO").includes(key)));
  });

  it("rejects a phase that ends before it starts", () => {
    const parsed = ProgrammePhaseSchema.safeParse({
      id: "10000000-0000-4000-8000-000000000001",
      organisationId: ORG,
      clientId: CLIENT,
      eventId: EVENT,
      name: "Church",
      type: "CHURCH",
      isDefault: false,
      status: "DRAFT",
      startsAt: "2026-09-12T12:00:00.000Z",
      endsAt: "2026-09-12T09:00:00.000Z",
      timezone: "Africa/Lagos",
      locationLabel: "Cathedral",
      sequence: 0,
      overlapAcknowledged: false,
      schemaVersion: 1,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    });
    assert.equal(parsed.success, false);
  });

  it("counts whole-event attendance as distinct people, never the sum of phase counts", () => {
    const snap = emptySnapshot();
    snap.phaseEntitlements = [
      PhaseEntitlementSchema.parse({
        id: "20000000-0000-4000-8000-000000000001",
        organisationId: ORG,
        clientId: CLIENT,
        eventId: EVENT,
        phaseId: "30000000-0000-4000-8000-000000000001",
        subjectType: "GUEST",
        subjectId: "40000000-0000-4000-8000-000000000001",
        status: "ACTIVE",
        protectedAccess: false,
        fastTrackRouting: false,
        reason: "church",
        schemaVersion: 1,
        version: 1,
        createdAt: AT,
        updatedAt: AT,
      }),
      PhaseEntitlementSchema.parse({
        id: "20000000-0000-4000-8000-000000000002",
        organisationId: ORG,
        clientId: CLIENT,
        eventId: EVENT,
        phaseId: "30000000-0000-4000-8000-000000000002",
        subjectType: "GUEST",
        subjectId: "40000000-0000-4000-8000-000000000001",
        status: "ACTIVE",
        protectedAccess: false,
        fastTrackRouting: false,
        reason: "reception",
        schemaVersion: 1,
        version: 1,
        createdAt: AT,
        updatedAt: AT,
      }),
      PhaseEntitlementSchema.parse({
        id: "20000000-0000-4000-8000-000000000003",
        organisationId: ORG,
        clientId: CLIENT,
        eventId: EVENT,
        phaseId: "30000000-0000-4000-8000-000000000001",
        subjectType: "GUEST",
        subjectId: "40000000-0000-4000-8000-000000000002",
        status: "ACTIVE",
        protectedAccess: false,
        fastTrackRouting: false,
        reason: "church only",
        schemaVersion: 1,
        version: 1,
        createdAt: AT,
        updatedAt: AT,
      }),
    ];
    const union = wholeEventAttendanceUnion(snap, EVENT);
    assert.equal(union.length, 2);
    assert.equal(snap.phaseEntitlements.length, 3);
  });
});
