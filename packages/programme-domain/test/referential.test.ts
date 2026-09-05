import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateProgramme } from "../src/index.js";
import {
  foundationProgramme,
  smallestManifest,
  validGate,
  validOpenItem,
  validPhase,
  validProduct,
  validRecord,
} from "./helpers.js";

describe("referential integrity", () => {
  it("fails when a slice phase is missing", () => {
    const result = validateProgramme(
      foundationProgramme({
        manifests: [smallestManifest({ id: "MD-AA", phaseId: "PH-MISSING", dependsOn: [] })],
      }),
    );
    assert.equal(result.ok, false);
    const error = result.errors.find((item) => item.code === "REFERENCE_NOT_FOUND" && item.field === "phaseId");
    assert.ok(error);
    assert.equal(error?.value, "PH-MISSING");
    assert.equal(error?.entityId, "MD-AA");
  });

  it("fails a duplicate slice", () => {
    const manifest = smallestManifest({ id: "MD-AA", dependsOn: [] });
    const result = validateProgramme(
      foundationProgramme({
        manifests: [manifest, { ...manifest }],
        records: [validRecord({ ...manifest, status: "NOT_STARTED", commits: [], evidence: [], openItems: [], updatedAt: "2026-09-05T05:10:00Z", version: "t" })],
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "DUPLICATE_ID" && item.entityType === "slice_manifest"));
  });

  it("fails a duplicate product", () => {
    const result = validateProgramme(
      foundationProgramme({
        products: [validProduct(), validProduct()],
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "DUPLICATE_ID" && item.entityType === "product"));
  });

  it("fails a duplicate phase", () => {
    const result = validateProgramme(
      foundationProgramme({
        phases: [validPhase(), validPhase()],
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((item) => item.code === "DUPLICATE_ID" && item.entityType === "phase"));
  });

  it("fails an orphan open item", () => {
    const result = validateProgramme(
      foundationProgramme({
        openItems: [validOpenItem({ sliceId: "MD-ORPHAN" })],
      }),
    );
    assert.equal(result.ok, false);
    const error = result.errors.find((item) => item.entityType === "open_item" && item.field === "sliceId");
    assert.ok(error);
    assert.equal(error?.code, "REFERENCE_NOT_FOUND");
    assert.equal(error?.value, "MD-ORPHAN");
  });

  it("fails when a gate product does not resolve", () => {
    const result = validateProgramme(
      foundationProgramme({
        gates: [validGate({ product: "EVENT_DAY" })],
      }),
    );
    assert.equal(result.ok, false);
    const error = result.errors.find((item) => item.entityType === "gate" && item.field === "product");
    assert.ok(error);
    assert.equal(error?.value, "EVENT_DAY");
  });
});
