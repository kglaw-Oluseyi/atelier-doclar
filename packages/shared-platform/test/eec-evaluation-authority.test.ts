import assert from "node:assert/strict";
import test from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

test("CEO may request evaluation; planner, auditor, admin and unauthenticated cannot execute", async () => {
  const { service } = fixtureService();
  const organisationId = service.listOrganisations(actor(people.personCeo))[0]!.id;
  const ceo = actor(people.personCeo);
  const requested = service.requestS05AEvaluation(ceo, { organisationId, reason: "ceo", idempotencyKey: "auth-ceo" });
  assert.equal(requested.status, "QUEUED");
  assert.throws(
    () => service.requestS05AEvaluation(actor(people.personPlanner), { organisationId, reason: "planner", idempotencyKey: "auth-planner" }),
    (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "SCOPE_MISMATCH"),
  );
  assert.throws(
    () => service.requestS05AEvaluation(actor(people.personAuditor), { organisationId, reason: "auditor", idempotencyKey: "auth-auditor" }),
    (error: unknown) => error instanceof PlatformError,
  );
  assert.throws(
    () => service.requestS05AEvaluation(actor(people.personAdmin), { organisationId, reason: "admin", idempotencyKey: "auth-admin" }),
    (error: unknown) => error instanceof PlatformError,
  );
});

test("cross-organisation evaluation is denied", () => {
  const { service } = fixtureService();
  const ceo = actor(people.personCeo);
  assert.throws(
    () =>
      service.requestS05AEvaluation(ceo, {
        organisationId: "00000000-0000-4000-8000-000000000002",
        reason: "other-org",
        idempotencyKey: "auth-other",
      }),
    (error: unknown) => error instanceof PlatformError,
  );
});
