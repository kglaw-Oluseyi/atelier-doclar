import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole, roleIdForKey, seededRoles } from "../src/catalog.js";
import { PERMISSION_KEYS } from "../src/constants.js";
import { PlatformError } from "../src/errors.js";
import { languagePermissionAllowed } from "../src/language-projections.js";
import { layoutAssurancePermissionAllowed } from "../src/layout-assurance-projections.js";
import { authorize } from "../src/policy.js";
import { assertPermissionRegistryComplete, DEPARTMENT_SCOPE_BLOCKER, permissionPolicy } from "../src/permission-registry.js";
import { programmePermissionAllowed } from "../src/programme-projections.js";
import { actorHasCeoOrganisationWide } from "../src/risk-command.js";
import { actor, fixtureService, people } from "./helpers.js";

function forbidden(run: () => unknown): void {
  assert.throws(run, (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND" || error.code === "VALIDATION_FAILED"));
}

describe("Event OS access-control policy", () => {
  it("classifies every permission and rejects an unclassified future key", () => {
    const report = assertPermissionRegistryComplete();
    assert.equal(report.unclassified.length, 0);
    assert.equal(report.unknown.length, 0);
    assert.equal(report.duplicates.length, 0);
    assert.equal(report.classified, PERMISSION_KEYS.length);
    assert.equal(report.total, report.classified);
    for (const key of PERMISSION_KEYS) {
      const policy = permissionPolicy(key);
      assert.ok(policy.effect);
      assert.ok(policy.requiredScope);
      assert.ok(policy.description.length > 0);
      assert.equal(typeof policy.mutates, "boolean");
      assert.equal(typeof policy.externalEffect, "boolean");
    }
    const ghost = "future.module.invented" as (typeof PERMISSION_KEYS)[number];
    assert.equal(Object.prototype.hasOwnProperty.call(permissionPolicy("event.view") ? {} : {}, ghost), false);
    assert.throws(() => permissionPolicy(ghost));
  });

  it("keeps CEO business authority without impersonation or cross-organisation access", () => {
    const { service } = fixtureService();
    const ceo = service.resolveActor(people.personCeo);
    assert.equal(actorHasCeoOrganisationWide(ceo, people.orgMaison, "2026-09-05T15:00:00.000Z"), true);
    for (const key of PERMISSION_KEYS) {
      const policy = permissionPolicy(key);
      if (key === "support.impersonate") {
        assert.equal(authorize({ actor: ceo, permission: key, scope: { organisationId: people.orgMaison } }).allow, false);
        continue;
      }
      if (policy.technicalOnly) continue;
      assert.equal(permissionsForRole("CEO").includes(key), true, key);
      const decision = authorize({
        actor: ceo,
        permission: key,
        scope: { organisationId: people.orgMaison, eventId: policy.requiredScope === "EVENT" ? people.eventAlphaOne : undefined, clientId: policy.requiredScope === "CLIENT" ? people.clientAlpha : undefined },
        context: { now: "2026-09-05T15:00:00.000Z", event: service.currentSnapshot().events.find((item) => item.id === people.eventAlphaOne) },
      });
      assert.equal(decision.allow, true, key);
    }
    assert.equal(
      authorize({ actor: ceo, permission: "event.view", scope: { organisationId: people.orgOther, eventId: people.eventOther } }).allow,
      false,
    );
    forbidden(() => service.getEvent(actor(people.personCeo), people.orgOther, people.eventOther));
  });

  it("lets an organisation-wide CEO complete maker and checker while blocking a scoped CEO", () => {
    const { service, store } = fixtureService();
    const snap = store.snapshot();
    assert.equal(actorHasCeoOrganisationWide(service.resolveActor(people.personCeo), people.orgMaison), true);
    const scoped = structuredClone(service.resolveActor(people.personCeo));
    scoped.assignments = scoped.assignments.map((item) => ({ ...item, eventId: people.eventAlphaOne }));
    assert.equal(actorHasCeoOrganisationWide(scoped, people.orgMaison), false);
    assert.equal(authorize({ actor: scoped, permission: "event.update", scope: { organisationId: people.orgMaison } }).allow, false);
    const before = snap.audit.length;
    forbidden(() =>
      service.grantAssignment(actor(people.personCeo), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "CEO",
        clientId: people.clientAlpha,
        reason: "scoped ceo rejected",
      }),
    );
    assert.ok(store.snapshot().audit.length >= before);
  });

  it("restricts Event Director to assigned events and CEO-reserved grants", () => {
    const { service } = fixtureService();
    const director = service.resolveActor(people.personDirector);
    const event = service.currentSnapshot().events.find((item) => item.id === people.eventAlphaOne);
    assert.equal(
      authorize({ actor: director, permission: "event.update", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne }, context: { event } }).allow,
      true,
    );
    assert.equal(
      authorize({ actor: director, permission: "event.update", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaTwo }, context: { event: service.currentSnapshot().events.find((item) => item.id === people.eventAlphaTwo) } }).allow,
      false,
    );
    assert.equal(permissionsForRole("EVENT_DIRECTOR").includes("seating.plan.publish"), false);
    assert.equal(authorize({ actor: director, permission: "seating.plan.publish", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } }).allow, false);
    forbidden(() =>
      service.grantAssignment(actor(people.personDirector), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "CEO",
        reason: "no ceo grant",
      }),
    );
    forbidden(() =>
      service.grantAssignment(actor(people.personDirector), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "SYSTEM_ADMINISTRATOR",
        reason: "no admin grant",
      }),
    );
  });

  it("lets Planner operate an assigned event without settling or self-publishing", () => {
    const { service } = fixtureService();
    const planner = service.resolveActor(people.personPlanner);
    assert.equal(authorize({ actor: planner, permission: "seating.run.execute", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } }).allow, true);
    assert.equal(authorize({ actor: planner, permission: "layout.snapshot.manage", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } }).allow, true);
    assert.equal(authorize({ actor: planner, permission: "layout.publish", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } }).allow, false);
    assert.equal(authorize({ actor: planner, permission: "seating.plan.approve", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } }).allow, false);
    assert.equal(authorize({ actor: planner, permission: "seating.run.execute", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaTwo } }).allow, false);
    forbidden(() =>
      service.grantAssignment(actor(people.personAdmin), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "PLANNER",
        clientId: people.clientAlpha,
        reason: "planner must be event scoped",
      }),
    );
  });

  it("gives Client Lead only assigned-client lineage", () => {
    const { service } = fixtureService();
    const grant = service.grantAssignment(actor(people.personCeo), {
      organisationId: people.orgMaison,
      personId: people.personUnassigned,
      roleKey: "CLIENT_LEAD",
      clientId: people.clientAlpha,
      reason: "client lead mandate",
    });
    assert.equal(grant.clientId, people.clientAlpha);
    assert.equal(grant.eventId, undefined);
    const lead = service.resolveActor(people.personUnassigned);
    const alpha = service.currentSnapshot().events.find((item) => item.id === people.eventAlphaOne);
    const beta = service.createEvent(actor(people.personCeo), {
      organisationId: people.orgMaison,
      clientId: people.clientBeta,
      code: "BETA1",
      name: "Beta lineage",
      startsAt: "2026-12-02T09:00:00.000Z",
      endsAt: "2026-12-02T22:00:00.000Z",
      timezone: "Africa/Lagos",
    });
    assert.equal(
      authorize({ actor: lead, permission: "client.update", scope: { organisationId: people.orgMaison, clientId: people.clientAlpha } }).allow,
      true,
    );
    assert.equal(
      authorize({ actor: lead, permission: "event.view", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne }, context: { event: alpha } }).allow,
      true,
    );
    assert.equal(
      authorize({ actor: lead, permission: "event.view", scope: { organisationId: people.orgMaison, eventId: beta.id }, context: { event: beta } }).allow,
      false,
    );
    forbidden(() => service.getEvent(actor(people.personUnassigned), people.orgMaison, beta.id));
  });

  it("fails Department Lead closed because no department identifier exists", () => {
    assert.ok(DEPARTMENT_SCOPE_BLOCKER.missingFields.includes("Assignment.departmentId"));
    const { service } = fixtureService();
    forbidden(() =>
      service.grantAssignment(actor(people.personCeo), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "DEPARTMENT_LEAD",
        eventId: people.eventAlphaOne,
        reason: "department lead blocked",
      }),
    );
    const role = seededRoles().find((item) => item.key === "DEPARTMENT_LEAD");
    assert.ok(role);
    const fake = service.resolveActor(people.personPlanner);
    fake.assignments = fake.assignments.map((item) => ({ ...item, roleId: roleIdForKey("DEPARTMENT_LEAD") }));
    fake.roles = seededRoles();
    const decision = authorize({ actor: fake, permission: "event.view", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } });
    assert.equal(decision.allow, false);
    if (!decision.allow) assert.equal(decision.reason, "DEPARTMENT_SCOPE_UNAVAILABLE");
  });

  it("keeps System Administrator technical and unable to escalate", () => {
    const { service } = fixtureService();
    const admin = service.resolveActor(people.personAdmin);
    assert.equal(authorize({ actor: admin, permission: "platform.access.administer", scope: { organisationId: people.orgMaison } }).allow, true);
    assert.equal(authorize({ actor: admin, permission: "system.health.view", scope: { organisationId: people.orgMaison } }).allow, true);
    assert.equal(authorize({ actor: admin, permission: "seating.plan.publish", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } }).allow, false);
    assert.equal(authorize({ actor: admin, permission: "seating.plan.approve", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne } }).allow, false);
    forbidden(() =>
      service.grantAssignment(actor(people.personAdmin), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "CEO",
        reason: "admin cannot grant ceo",
      }),
    );
    forbidden(() =>
      service.grantAssignment(actor(people.personAdmin), {
        organisationId: people.orgMaison,
        personId: people.personAdmin,
        roleKey: "SYSTEM_ADMINISTRATOR",
        reason: "admin cannot grant admin",
      }),
    );
  });

  it("refuses Auditor mutations in services and UI projections", () => {
    const { service, store } = fixtureService();
    const auditorActor = actor(people.personAuditor);
    const before = JSON.stringify(store.snapshot().assignments);
    forbidden(() =>
      service.consumeOfflineAccessPackage(auditorActor, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        packageId: "00000000-0000-4000-8000-000000000099",
        expectedVersion: 1,
        reason: "auditor consume",
      }),
    );
    forbidden(() =>
      service.assembleRecipientContent(auditorActor, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        guestId: "00000000-0000-4000-8000-000000000099",
        workId: "00000000-0000-4000-8000-000000000098",
        reason: "auditor assemble",
      }),
    );
    forbidden(() => service.evaluateRiskEvent(auditorActor, { organisationId: people.orgMaison, eventId: people.eventAlphaOne, reason: "auditor evaluate" }));
    assert.equal(JSON.stringify(store.snapshot().assignments), before);
    const keys = permissionsForRole("READ_ONLY_AUDITOR");
    assert.equal(languagePermissionAllowed(keys).canPreviewAssembly, false);
    assert.equal(programmePermissionAllowed((key) => keys.includes(key)).canConsumePackage, false);
    assert.equal(layoutAssurancePermissionAllowed(keys).canRequestExport, false);
    assert.equal(layoutAssurancePermissionAllowed(keys).canSettleExport, false);
    assert.equal(authorize({ actor: service.resolveActor(people.personAuditor), permission: "event.view", scope: { organisationId: people.orgMaison } }).allow, true);
  });

  it("limits Risk Governance Reviewer to the assigned mandate", () => {
    const { service } = fixtureService();
    const reviewer = service.resolveActor(people.personRiskReviewer);
    const event = service.currentSnapshot().events.find((item) => item.id === people.eventAlphaOne);
    assert.equal(
      authorize({ actor: reviewer, permission: "risk.rule.approve", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne }, context: { event } }).allow,
      true,
    );
    assert.equal(
      authorize({ actor: reviewer, permission: "guest.record.amend", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne }, context: { event } }).allow,
      false,
    );
    assert.equal(
      authorize({ actor: reviewer, permission: "risk.rule.approve", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaTwo } }).allow,
      false,
    );
    assert.equal(permissionsForRole("RISK_GOVERNANCE_REVIEWER").includes("seating.evaluate"), false);
    forbidden(() =>
      service.grantAssignment(actor(people.personCeo), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "RISK_GOVERNANCE_REVIEWER",
        reason: "missing mandate",
      }),
    );
  });

  it("denies inactive, expired and revoked assignments", () => {
    const { service } = fixtureService();
    const base = service.resolveActor(people.personPlanner);
    const inactive = structuredClone(base);
    inactive.assignments = inactive.assignments.map((item) => ({ ...item, status: "SUSPENDED" as const }));
    assert.equal(authorize({ actor: inactive, permission: "event.view", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne }, context: { now: "2026-09-05T15:00:00.000Z" } }).allow, false);
    const expired = structuredClone(base);
    expired.assignments = expired.assignments.map((item) => ({ ...item, endsAt: "2026-09-01T00:00:00.000Z" }));
    assert.equal(authorize({ actor: expired, permission: "event.view", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne }, context: { now: "2026-09-05T15:00:00.000Z" } }).allow, false);
    const revoked = structuredClone(base);
    revoked.assignments = revoked.assignments.map((item) => ({ ...item, status: "REVOKED" as const }));
    assert.equal(authorize({ actor: revoked, permission: "event.view", scope: { organisationId: people.orgMaison, eventId: people.eventAlphaOne }, context: { now: "2026-09-05T15:00:00.000Z" } }).allow, false);
  });
});
