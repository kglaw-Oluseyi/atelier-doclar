import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRoadmap, buildSliceDetail, listCommits, listEvidence, loadCurrentSnapshot } from "../src/index.js";
import type { ControlSnapshot } from "@maison-doclar/programme-domain";

describe("roadmap and drill-down", () => {
  it("derives a DAG from corpus data with an accessible node list", () => {
    const snapshot = loadCurrentSnapshot("2026-09-05T11:00:00.000Z");
    const roadmap = buildRoadmap(snapshot);
    assert.ok(roadmap.nodes.some((node) => node.id === "MD-CT4"));
    assert.ok(roadmap.edges.some((edge) => edge.from === "MD-CT5" && edge.to === "MD-CT4"));
    assert.deepEqual(roadmap.cycles, []);
    assert.deepEqual(roadmap.missingDependencies, []);
    const foundation = buildRoadmap(snapshot, { product: "FOUNDATION", q: "CT4" });
    assert.ok(foundation.nodes.every((node) => node.id.includes("CT4") || node.title.includes("CT4")));
  });

  it("surfaces cycles and missing dependencies instead of hiding them", () => {
    const snapshot = loadCurrentSnapshot("2026-09-05T11:00:00.000Z");
    const broken: ControlSnapshot = {
      ...snapshot,
      slices: [
        {
          ...snapshot.slices[0]!,
          id: "MD-AA",
          dependsOn: ["MD-BB"],
        },
        {
          ...snapshot.slices[0]!,
          id: "MD-BB",
          dependsOn: ["MD-AA"],
        },
        {
          ...snapshot.slices[0]!,
          id: "MD-CC",
          dependsOn: ["MD-MISSING"],
        },
      ],
      statuses: { "MD-AA": "NOT_STARTED", "MD-BB": "NOT_STARTED", "MD-CC": "NOT_STARTED" },
    };
    const roadmap = buildRoadmap(broken);
    assert.ok(roadmap.cycles.length > 0);
    assert.ok(roadmap.missingDependencies.includes("MD-CC→MD-MISSING"));
    assert.ok(roadmap.edges.some((edge) => edge.missing));
  });

  it("builds slice, evidence and commit drill-down", () => {
    const snapshot = loadCurrentSnapshot("2026-09-05T11:00:00.000Z");
    const detail = buildSliceDetail(snapshot, "MD-B0");
    assert.ok(detail);
    assert.equal(detail.status, "IN_REVIEW");
    assert.ok(detail.record.canonicalRefs.length > 0);
    assert.match(detail.nextEligibleAction, /cannot approve/);
    assert.equal(buildSliceDetail(snapshot, "NO-SUCH"), undefined);
    assert.ok(listCommits(snapshot).some((item) => item.sliceId === "MD-B0"));
    assert.ok(listEvidence(snapshot).some((item) => item.sliceId === "MD-B0"));
  });
});
