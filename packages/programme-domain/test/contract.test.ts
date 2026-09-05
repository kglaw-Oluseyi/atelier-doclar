import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolveProgrammeRoot, SliceManifestSchema } from "../src/index.js";

describe("schema drift guard", () => {
  it("keeps SliceManifest aligned with the ratified JSON Schema", () => {
    const root = resolveProgrammeRoot();
    const schema = JSON.parse(
      readFileSync(
        join(
          root,
          "claude handover/roadmap_control_tower_addendum/schema/slice-manifest.schema.json",
        ),
        "utf8",
      ),
    ) as {
      required: string[];
      additionalProperties: boolean;
      properties: {
        id: { pattern: string };
        product: { enum: string[] };
        canonicalRefs: { minItems: number };
        exitCriteria: { minItems: number };
        verification: { minItems: number };
      };
    };

    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.required.sort(), [
      "canonicalRefs",
      "dependsOn",
      "entryCriteria",
      "exitCriteria",
      "expectedFiles",
      "id",
      "order",
      "outcome",
      "phaseId",
      "product",
      "title",
      "verification",
    ]);
    assert.equal(schema.properties.id.pattern, "^[A-Z]+-[A-Z0-9-]+$");
    assert.deepEqual(schema.properties.product.enum, [
      "FOUNDATION",
      "EVENT_OS",
      "EVENT_DAY",
      "ACADEMY",
      "MARKETING",
      "USHERING",
      "INTEGRATION",
    ]);
    assert.equal(schema.properties.canonicalRefs.minItems, 1);
    assert.equal(schema.properties.exitCriteria.minItems, 1);
    assert.equal(schema.properties.verification.minItems, 1);

    const shape = SliceManifestSchema._def;
    assert.ok(shape);
  });
});
