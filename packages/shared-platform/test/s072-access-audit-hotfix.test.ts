import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import { PlatformError } from "../src/errors.js";
import { authorize } from "../src/policy.js";
import { actor, fixtureService, people } from "./helpers.js";

function director() {
  return actor(people.personDirector);
}

function ceo() {
  return actor(people.personCeo);
}

function planner() {
  return actor(people.personPlanner);
}

function auditor() {
  return actor(people.personAuditor);
}

function admin() {
  return actor(people.personAdmin);
}

function reviewer() {
  return actor(people.personRiskReviewer);
}

function forbidden(run: () => unknown): void {
  assert.throws(run, (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN");
}

describe("MD-PR-S072 Access/Audit security hotfix", () => {
  it("removes access-admin and org-wide audit from Event Director while keeping SysAdmin technical remit", () => {
    const directorKeys = permissionsForRole("EVENT_DIRECTOR");
    assert.equal(directorKeys.includes("assignment.manage"), false);
    assert.equal(directorKeys.includes("platform.access.administer"), false);
    assert.equal(directorKeys.includes("audit.view"), false);
    assert.equal(directorKeys.includes("platform.audit.read_all"), false);
    assert.equal(directorKeys.includes("platform.audit.read_operational"), true);
    assert.equal(directorKeys.includes("seating.plan.approve"), true);

    const adminKeys = permissionsForRole("SYSTEM_ADMINISTRATOR");
    assert.equal(adminKeys.includes("platform.access.administer"), true);
    assert.equal(adminKeys.includes("platform.audit.read_all"), true);
    assert.equal(adminKeys.includes("seating.view"), false);
    assert.equal(adminKeys.includes("seating.plan.approve"), false);

    const reviewerKeys = permissionsForRole("RISK_GOVERNANCE_REVIEWER");
    assert.equal(reviewerKeys.includes("platform.access.administer"), false);
    assert.equal(reviewerKeys.includes("platform.audit.read_all"), false);
    assert.equal(reviewerKeys.includes("platform.audit.read_operational"), false);

    const auditorKeys = permissionsForRole("READ_ONLY_AUDITOR");
    assert.equal(auditorKeys.includes("platform.audit.read_all"), true);
    assert.equal(auditorKeys.includes("platform.access.administer"), false);
  });

  it("denies Event Director access-administration projection and mutation at the service boundary", () => {
    const { service, store } = fixtureService();
    const before = store.snapshot().audit.length;
    forbidden(() => service.getAccessAdministration(director(), people.orgMaison));
    const afterProjection = store.snapshot().audit.slice(before);
    assert.ok(afterProjection.some((item) => item.action === "platform.access.administer" && item.outcome === "DENIED"));
    forbidden(() =>
      service.grantAssignment(director(), {
        organisationId: people.orgMaison,
        personId: people.personUnassigned,
        roleKey: "PLANNER",
        reason: "director forged grant",
        eventId: people.eventAlphaOne,
        clientId: people.clientAlpha,
      }),
    );
    forbidden(() =>
      service.revokeAssignment(director(), {
        assignmentId: people.assignPlanner,
        organisationId: people.orgMaison,
        expectedVersion: 1,
        reason: "director forged revoke",
      }),
    );
    const denied = store.snapshot().audit.slice(before).filter((item) => item.outcome === "DENIED");
    assert.ok(denied.some((item) => item.action === "assignment.granted" && item.resourceId === undefined));
    assert.ok(denied.some((item) => item.action === "assignment.revoked"));
  });

  it("denies Planner, Auditor and Risk Governance Reviewer access administration", () => {
    const { service } = fixtureService();
    for (const actorFn of [planner, auditor, reviewer]) {
      forbidden(() => service.getAccessAdministration(actorFn(), people.orgMaison));
      forbidden(() =>
        service.grantAssignment(actorFn(), {
          organisationId: people.orgMaison,
          personId: people.personUnassigned,
          roleKey: "PLANNER",
          reason: "forged grant",
          eventId: people.eventAlphaOne,
          clientId: people.clientAlpha,
        }),
      );
    }
  });

  it("lets CEO and System Administrator administer access without giving Admin seating authority", () => {
    const { service } = fixtureService();
    const ceoAdmin = service.getAccessAdministration(ceo(), people.orgMaison);
    assert.ok(ceoAdmin.assignments.length > 0);
    const sysAdmin = service.getAccessAdministration(admin(), people.orgMaison);
    assert.ok(sysAdmin.people.some((item) => item.id === people.personPlanner));
    forbidden(() => service.listGuests(admin(), { organisationId: people.orgMaison, eventId: people.eventAlphaOne }));
  });

  it("gives Event Director only assigned-event operational audit without assignment identifiers", () => {
    const { service } = fixtureService();
    service.createClient(ceo(), {
      organisationId: people.orgMaison,
      code: "S072A",
      displayName: "S072 Org Wide",
    });
    const alphaOne = service.getEvent(ceo(), people.orgMaison, people.eventAlphaOne);
    service.updateEvent(ceo(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      expectedVersion: alphaOne.version,
      name: "Alpha One seating command",
    });
    const alphaTwo = service.getEvent(ceo(), people.orgMaison, people.eventAlphaTwo);
    service.updateEvent(ceo(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaTwo,
      expectedVersion: alphaTwo.version,
      name: "Alpha Two hidden from director",
    });
    const granted = service.grantAssignment(ceo(), {
      organisationId: people.orgMaison,
      personId: people.personUnassigned,
      roleKey: "PLANNER",
      reason: "assignment identifier must not leak operationally",
      eventId: people.eventAlphaOne,
      clientId: people.clientAlpha,
    });

    const directorRows = service.searchAudit(director(), people.orgMaison);
    assert.ok(directorRows.every((item) => item.eventId === people.eventAlphaOne));
    assert.ok(directorRows.some((item) => item.action === "event.updated"));
    assert.equal(
      directorRows.some((item) => item.action === "client.created"),
      false,
    );
    assert.equal(
      directorRows.some((item) => item.eventId === people.eventAlphaTwo),
      false,
    );
    const assignmentRows = directorRows.filter((item) => item.resourceType === "assignment" || item.action === "assignment.granted");
    assert.ok(assignmentRows.every((item) => item.resourceId === undefined));
    assert.ok(!JSON.stringify(directorRows).includes(granted.id));
    assert.ok(!JSON.stringify(directorRows).includes("assignmentId"));

    const ceoRows = service.searchAudit(ceo(), people.orgMaison);
    assert.ok(ceoRows.some((item) => item.action === "client.created"));
    assert.ok(ceoRows.some((item) => item.eventId === people.eventAlphaTwo));
    assert.ok(ceoRows.some((item) => item.resourceId === granted.id));
  });

  it("denies Risk Governance Reviewer org-wide and operational audit unless separately authorised", () => {
    const { service, store } = fixtureService();
    const before = store.snapshot().audit.length;
    forbidden(() => service.searchAudit(reviewer(), people.orgMaison));
    const denied = store.snapshot().audit.slice(before).filter((item) => item.outcome === "DENIED");
    assert.ok(denied.some((item) => item.action === "platform.audit.read_all"));
  });

  it("lets Auditor retain org-wide audit without access-administration mutation", () => {
    const { service } = fixtureService();
    service.createClient(ceo(), {
      organisationId: people.orgMaison,
      code: "S072B",
      displayName: "S072 Auditor",
    });
    const rows = service.searchAudit(auditor(), people.orgMaison);
    assert.ok(rows.some((item) => item.action === "client.created"));
    forbidden(() => service.getAccessAdministration(auditor(), people.orgMaison));
  });

  it("denies Event Director the access-admin authorize projection used by the Access page", () => {
    const { service } = fixtureService();
    const actorSnap = service.resolveActor(people.personDirector);
    const denied = authorize({
      actor: actorSnap,
      permission: "platform.access.administer",
      scope: { organisationId: people.orgMaison },
    });
    assert.equal(denied.allow, false);
    const operational = authorize({
      actor: actorSnap,
      permission: "platform.audit.read_operational",
      scope: { organisationId: people.orgMaison },
    });
    assert.equal(operational.allow, true);
  });
});
