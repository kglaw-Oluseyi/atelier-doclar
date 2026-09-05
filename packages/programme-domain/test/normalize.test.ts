import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stableJson, validateProgramme } from "../src/index.js";
import { foundationProgramme, smallestManifest, validProduct } from "./helpers.js";

describe("deterministic normalisation", () => {
  it("produces equivalent output regardless of input order", () => {
    const manifestsA = [
      smallestManifest({ id: "MD-BB", order: 2, dependsOn: ["MD-AA"] }),
      smallestManifest({ id: "MD-AA", order: 1, dependsOn: [] }),
    ];
    const manifestsB = [...manifestsA].reverse();
    const productsA = [
      validProduct({ code: "EVENT_OS", name: "Event OS", route: "/programme/event-os", dependencies: ["FOUNDATION"] }),
      validProduct(),
    ];
    const left = validateProgramme(
      foundationProgramme({
        products: productsA,
        manifests: manifestsA,
      }),
    );
    const right = validateProgramme(
      foundationProgramme({
        products: [...productsA].reverse(),
        manifests: manifestsB,
      }),
    );
    assert.equal(left.ok, true);
    assert.equal(right.ok, true);
    assert.equal(stableJson(left.normalised), stableJson(right.normalised));
    assert.deepEqual(
      left.normalised?.slices.map((item) => item.id),
      ["MD-AA", "MD-BB"],
    );
    assert.deepEqual(
      left.normalised?.products.map((item) => item.code),
      ["FOUNDATION", "EVENT_OS"],
    );
  });

  it("does not embed a generated timestamp unless provided as input", () => {
    const result = validateProgramme(foundationProgramme());
    const encoded = stableJson(result.normalised);
    assert.equal(encoded.includes("generatedAt"), false);
  });
});
