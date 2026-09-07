import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import { PERMISSION_KEYS } from "../src/constants.js";
import { CapMeasurementSchema, HeadCircumferenceInchesSchema } from "../src/merchandise-schemas.js";
import { prohibitedMerchandisePayload } from "../src/merchandise-operations.js";

const MERCH_KEYS = [
  "merch.collection.view",
  "merch.collection.manage",
  "merch.offer.view",
  "merch.offer.manage",
  "merch.offer.sponsor",
  "merch.participation.view",
  "merch.participation.manage",
  "merch.capMeasurement.view",
  "merch.capMeasurement.manage",
  "merch.fulfilment.view",
  "merch.fulfilment.manage",
  "merch.vendorAssignment.view",
  "merch.vendorAssignment.manage",
  "merch.exception.view",
  "merch.exception.review",
  "merch.report.view",
  "merch.audit.view",
] as const;

describe("EOS-S04C contracts", () => {
  it("registers merchandise permissions and keeps vendor capabilities out of staff roles", () => {
    for (const key of MERCH_KEYS) {
      assert.ok((PERMISSION_KEYS as readonly string[]).includes(key));
    }
    const ceo = permissionsForRole("CEO");
    const director = permissionsForRole("EVENT_DIRECTOR");
    const planner = permissionsForRole("PLANNER");
    const auditor = permissionsForRole("READ_ONLY_AUDITOR");
    const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
    assert.ok(MERCH_KEYS.every((key) => ceo.includes(key)));
    assert.ok(director.includes("merch.offer.sponsor"));
    assert.ok(director.includes("merch.vendorAssignment.manage"));
    assert.equal(planner.includes("merch.offer.sponsor"), false);
    assert.equal(planner.includes("merch.vendorAssignment.manage"), false);
    assert.equal(planner.includes("merch.exception.review"), false);
    assert.ok(planner.includes("merch.offer.manage"));
    assert.ok(auditor.includes("merch.audit.view"));
    assert.equal(auditor.includes("merch.offer.manage"), false);
    assert.equal(admin.includes("merch.collection.view"), false);
  });

  it("accepts only quarter-inch cap circumference in the permitted range", () => {
    assert.equal(HeadCircumferenceInchesSchema.safeParse(22.5).success, true);
    assert.equal(HeadCircumferenceInchesSchema.safeParse(17.9).success, false);
    assert.equal(HeadCircumferenceInchesSchema.safeParse(22.3).success, false);
    assert.equal(
      CapMeasurementSchema.safeParse({
        id: "00000000-0000-4000-8000-0000000000ca",
        organisationId: "00000000-0000-4000-8000-000000000001",
        clientId: "00000000-0000-4000-8000-000000000011",
        eventId: "00000000-0000-4000-8000-000000000021",
        guestId: "00000000-0000-4000-8000-000000000073",
        itemId: "00000000-0000-4000-8000-0000000000a3",
        headCircumferenceInches: 22.5,
        consentGiven: true,
        consentRecordedAt: "2026-09-07T12:00:00.000Z",
        source: "GUEST_ENTERED",
        status: "ACTIVE",
        purpose: "NAMED_CAP_MANUFACTURE",
        schemaVersion: 1,
        version: 1,
        createdAt: "2026-09-07T12:00:00.000Z",
        updatedAt: "2026-09-07T12:00:00.000Z",
      }).success,
      true,
    );
  });

  it("rejects prohibited measurement and payment fields", () => {
    assert.equal(prohibitedMerchandisePayload({ waistInches: 32 }), "waistInches");
    assert.equal(prohibitedMerchandisePayload({ amountPaid: 40_000 }), "amountPaid");
    assert.equal(prohibitedMerchandisePayload({ headCircumferenceInches: 22.5, consentGiven: true }), undefined);
  });
});
