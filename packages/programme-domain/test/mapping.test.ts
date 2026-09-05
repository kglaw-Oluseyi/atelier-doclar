import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertMappingConsistency,
  emptyOperationalState,
  projectSliceRecord,
  validateProgramme,
} from "../src/index.js";
import { foundationProgramme, smallestManifest, VALID_TIME, validRecord } from "./helpers.js";

describe("manifest to SliceRecord mapping", () => {
  it("copies planning fields and leaves verification on the manifest only", () => {
    const manifest = smallestManifest();
    const record = projectSliceRecord(
      manifest,
      emptyOperationalState({ updatedAt: VALID_TIME, version: "map-1" }),
    );
    assert.equal(record.id, manifest.id);
    assert.equal(record.product, manifest.product);
    assert.equal(record.phaseId, manifest.phaseId);
    assert.deepEqual(record.dependsOn, manifest.dependsOn);
    assert.deepEqual(record.exitCriteria, manifest.exitCriteria);
    assert.equal("verification" in record, false);
    assert.equal(record.status, "NOT_STARTED");
    assert.deepEqual(assertMappingConsistency(manifest, record), []);
  });

  it("fails when declaration and projection planning fields diverge", () => {
    const manifest = smallestManifest({ title: "Declared title" });
    const record = validRecord({
      id: manifest.id,
      title: "Projected title",
      phaseId: manifest.phaseId,
      product: manifest.product,
      order: manifest.order,
      dependsOn: manifest.dependsOn,
      canonicalRefs: manifest.canonicalRefs,
      outcome: manifest.outcome,
      entryCriteria: manifest.entryCriteria,
      exitCriteria: manifest.exitCriteria,
      expectedFiles: manifest.expectedFiles,
    });
    const errors = assertMappingConsistency(manifest, record);
    assert.ok(errors.some((item) => item.code === "MAPPING_INCONSISTENT" && item.field === "title"));
    const programme = validateProgramme(
      foundationProgramme({
        manifests: [manifest],
        records: [record],
      }),
    );
    assert.equal(programme.ok, false);
    assert.ok(programme.errors.some((item) => item.code === "MAPPING_INCONSISTENT"));
  });
});
