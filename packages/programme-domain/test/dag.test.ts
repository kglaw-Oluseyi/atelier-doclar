import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectCycles, validateProgramme } from "../src/index.js";
import { duplicateEdgeErrors } from "../src/dag.js";
import { foundationProgramme, smallestManifest, validProduct, validPhase } from "./helpers.js";

function programmeFromDeps(nodes: Array<{ id: string; dependsOn: string[] }>) {
  const manifests = nodes.map((node, index) =>
    smallestManifest({
      id: node.id,
      order: index,
      dependsOn: node.dependsOn,
      title: node.id,
    }),
  );
  return foundationProgramme({ manifests });
}

describe("DAG validation", () => {
  it("accepts a zero-cycle programme", () => {
    const result = validateProgramme(
      programmeFromDeps([
        { id: "MD-AA", dependsOn: [] },
        { id: "MD-BB", dependsOn: ["MD-AA"] },
        { id: "MD-CC", dependsOn: ["MD-BB"] },
      ]),
    );
    assert.equal(result.ok, true);
    assert.equal(result.stats.verdict, "NO_CYCLES");
    assert.equal(result.stats.cycles, 0);
  });

  it("accepts a valid multi-product DAG", () => {
    const result = validateProgramme(
      foundationProgramme({
        products: [
          validProduct({ code: "FOUNDATION" }),
          validProduct({
            code: "EVENT_OS",
            name: "Event OS",
            route: "/programme/event-os",
            dependencies: ["FOUNDATION"],
          }),
        ],
        phases: [
          validPhase(),
          validPhase({
            id: "PH-EVENT-OS-FOUNDATIONS",
            order: 1,
            title: "Event OS foundations",
            products: ["EVENT_OS"],
          }),
        ],
        manifests: [
          smallestManifest({ id: "MD-CT0", dependsOn: [], order: 1 }),
          smallestManifest({
            id: "EOS-S01",
            product: "EVENT_OS",
            phaseId: "PH-EVENT-OS-FOUNDATIONS",
            dependsOn: ["MD-CT0"],
            order: 1,
          }),
        ],
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.stats.verdict, "NO_CYCLES");
    assert.equal(result.stats.dependencies, 1);
  });

  it("fails a self-dependency and returns A → A", () => {
    const result = validateProgramme(programmeFromDeps([{ id: "MD-AA", dependsOn: ["MD-AA"] }]));
    assert.equal(result.ok, false);
    const cycle = result.errors.find((error) => error.code === "DEPENDENCY_CYCLE");
    assert.ok(cycle);
    assert.equal(cycle?.value, "MD-AA → MD-AA");
  });

  it("fails a two-node cycle and returns A → B → A", () => {
    const result = validateProgramme(
      programmeFromDeps([
        { id: "MD-AA", dependsOn: ["MD-BB"] },
        { id: "MD-BB", dependsOn: ["MD-AA"] },
      ]),
    );
    assert.equal(result.ok, false);
    const cycle = result.errors.find((error) => error.code === "DEPENDENCY_CYCLE");
    assert.ok(cycle);
    assert.match(cycle?.value ?? "", /MD-AA → MD-BB → MD-AA|MD-BB → MD-AA → MD-BB/);
  });

  it("fails a multi-hop cycle and returns A → B → C → A", () => {
    const result = validateProgramme(
      programmeFromDeps([
        { id: "MD-AA", dependsOn: ["MD-CC"] },
        { id: "MD-BB", dependsOn: ["MD-AA"] },
        { id: "MD-CC", dependsOn: ["MD-BB"] },
      ]),
    );
    assert.equal(result.ok, false);
    const cycle = result.errors.find((error) => error.code === "DEPENDENCY_CYCLE");
    assert.ok(cycle);
    assert.ok((cycle?.value ?? "").split(" → ").length >= 4);
    assert.match(cycle?.value ?? "", /MD-AA|MD-BB|MD-CC/);
    assert.ok((cycle?.value ?? "").endsWith((cycle?.value ?? "").split(" → ")[0] ?? ""));
  });

  it("fails a missing dependency", () => {
    const result = validateProgramme(programmeFromDeps([{ id: "MD-AA", dependsOn: ["MD-MISSING"] }]));
    assert.equal(result.ok, false);
    const missing = result.errors.find((error) => error.code === "REFERENCE_NOT_FOUND");
    assert.ok(missing);
    assert.equal(missing?.field, "dependsOn");
    assert.equal(missing?.value, "MD-MISSING");
  });

  it("rejects a duplicate edge explicitly", () => {
    const errors = duplicateEdgeErrors([
      { from: "MD-AA", to: "MD-BB" },
      { from: "MD-AA", to: "MD-BB" },
    ]);
    assert.equal(errors.length, 1);
    assert.equal(errors[0]?.code, "DUPLICATE_EDGE");
    assert.equal(errors[0]?.value, "MD-BB");
    const graph = detectCycles(
      ["MD-AA", "MD-BB"],
      [
        { from: "MD-AA", to: "MD-BB" },
        { from: "MD-AA", to: "MD-BB" },
      ],
    );
    assert.equal(graph.cyclePaths.length, 0);
  });

  it("does not treat product display order as dependency truth", () => {
    const result = validateProgramme(
      foundationProgramme({
        products: [
          validProduct({
            code: "EVENT_OS",
            name: "Event OS",
            route: "/programme/event-os",
            dependencies: ["FOUNDATION"],
          }),
          validProduct({ code: "FOUNDATION" }),
        ],
        manifests: [
          smallestManifest({ id: "EOS-S01", product: "EVENT_OS", phaseId: "PH-EVENT-OS-FOUNDATIONS", dependsOn: ["MD-CT0"], order: 1 }),
          smallestManifest({ id: "MD-CT0", dependsOn: [], order: 1 }),
        ],
        phases: [
          validPhase({
            id: "PH-EVENT-OS-FOUNDATIONS",
            order: 1,
            title: "Event OS foundations",
            products: ["EVENT_OS"],
          }),
          validPhase(),
        ],
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.normalised?.dependencies[0]?.from, "EOS-S01");
    assert.equal(result.normalised?.dependencies[0]?.to, "MD-CT0");
  });
});

