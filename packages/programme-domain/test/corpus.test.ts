import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  SliceManifestSchema,
  resolveProgrammeRoot,
  validateProgrammeCorpus,
} from "../src/index.js";
import { parse as parseYaml } from "yaml";
import { join } from "node:path";

describe("CT0 programme corpus", () => {
  it("validates the current CT0 manifests, projections, DAG and references", () => {
    const root = resolveProgrammeRoot();
    const result = validateProgrammeCorpus(root);
    assert.equal(result.ok, true, result.errors.map((error) => `${error.code}:${error.entityId}:${error.message}`).join("\n"));
    assert.equal(result.stats.products, 7);
    assert.equal(result.stats.phases, 10);
    assert.equal(result.stats.slices, 84);
    assert.equal(result.stats.records, 84);
    assert.equal(result.stats.dependencies, 91);
    assert.equal(result.stats.cycles, 0);
    assert.equal(result.stats.verdict, "NO_CYCLES");
    assert.equal(result.stats.yamlManifests, 19);
    assert.equal(result.traceability.promptControlId, "MD-PR-0002");
    assert.equal(result.traceability.nativeId, "CT1");
    assert.equal(result.traceability.sliceId, "MD-CT1");
    assert.equal(result.traceability.product, "FOUNDATION");
  });

  it("loads the representative Foundation YAML as a valid declaration", () => {
    const root = resolveProgrammeRoot();
    const raw = parseYaml(readFileSync(join(root, "programme/slices/foundation/MD-CT1.yaml"), "utf8"));
    const parsed = SliceManifestSchema.safeParse(raw);
    assert.equal(parsed.success, true);
  });
});
