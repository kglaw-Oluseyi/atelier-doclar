import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertMakerChecker,
  assertMakerCheckerFor,
  ceoMakerCheckerReliefFromSnap,
  personHasCeoOrganisationWide,
  PlatformError,
} from "../src/index.js";
import { seededPermissions, seededRoles } from "../src/catalog.js";
import { emptySnapshot } from "../src/store.js";
import { FIXTURE_IDS } from "../src/fixtures.js";

function snapWithCeo(): ReturnType<typeof emptySnapshot> {
  const snap = emptySnapshot();
  snap.roles = seededRoles();
  snap.permissions = seededPermissions();
  snap.assignments = [
    {
      id: FIXTURE_IDS.assignCeo,
      organisationId: FIXTURE_IDS.orgMaison,
      personId: FIXTURE_IDS.personCeo,
      roleId: seededRoles().find((role) => role.key === "CEO")!.id,
      status: "ACTIVE",
      grantedByPersonId: FIXTURE_IDS.personCeo,
      reason: "fixture CEO",
      schemaVersion: 1,
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: FIXTURE_IDS.assignPlanner,
      organisationId: FIXTURE_IDS.orgMaison,
      personId: FIXTURE_IDS.personPlanner,
      roleId: seededRoles().find((role) => role.key === "PLANNER")!.id,
      status: "ACTIVE",
      grantedByPersonId: FIXTURE_IDS.personCeo,
      reason: "fixture planner",
      schemaVersion: 1,
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  return snap;
}

describe("CEO maker/checker organisation-wide relief", () => {
  it("refuses non-CEO self-check and allows organisation-wide CEO", () => {
    const snap = snapWithCeo();
    assert.equal(personHasCeoOrganisationWide(snap, FIXTURE_IDS.personCeo, FIXTURE_IDS.orgMaison), true);
    assert.equal(personHasCeoOrganisationWide(snap, FIXTURE_IDS.personPlanner, FIXTURE_IDS.orgMaison), false);

    assert.throws(
      () => assertMakerChecker(FIXTURE_IDS.personPlanner, FIXTURE_IDS.personPlanner, "approve"),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );

    assert.doesNotThrow(() =>
      assertMakerChecker(FIXTURE_IDS.personCeo, FIXTURE_IDS.personCeo, "approve", ceoMakerCheckerReliefFromSnap(snap, FIXTURE_IDS.personCeo, FIXTURE_IDS.orgMaison)),
    );

    assert.doesNotThrow(() =>
      assertMakerCheckerFor(snap, FIXTURE_IDS.personCeo, FIXTURE_IDS.personCeo, "approve", FIXTURE_IDS.orgMaison),
    );

    assert.throws(
      () => assertMakerCheckerFor(snap, FIXTURE_IDS.personPlanner, FIXTURE_IDS.personPlanner, "approve", FIXTURE_IDS.orgMaison),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });
});
