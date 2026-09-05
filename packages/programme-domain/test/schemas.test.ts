import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApprovalSchema,
  CheckSchema,
  DecisionSchema,
  EvidenceRefSchema,
  GateSchema,
  ProgrammeSnapshotSchema,
  SliceManifestSchema,
  SliceRecordSchema,
  TimelineEventSchema,
} from "../src/index.js";
import {
  VALID_COMMIT,
  VALID_SHA256,
  VALID_TIME,
  acceptedRecord,
  smallestManifest,
  validEvidence,
  validManifest,
  validRecord,
} from "./helpers.js";

describe("SliceManifest schema", () => {
  it("accepts the smallest valid manifest", () => {
    const parsed = SliceManifestSchema.safeParse(smallestManifest());
    assert.equal(parsed.success, true);
  });

  it("accepts a representative Foundation slice", () => {
    const parsed = SliceManifestSchema.safeParse(validManifest());
    assert.equal(parsed.success, true);
  });

  it("rejects a malformed slice ID", () => {
    const parsed = SliceManifestSchema.safeParse(smallestManifest({ id: "md-ct1" }));
    assert.equal(parsed.success, false);
    assert.ok(parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("id")));
  });

  it("rejects a missing phase field", () => {
    const { phaseId: _phaseId, ...rest } = smallestManifest();
    const parsed = SliceManifestSchema.safeParse(rest);
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("phaseId")),
    );
  });

  it("rejects an unknown product", () => {
    const parsed = SliceManifestSchema.safeParse({
      ...smallestManifest(),
      product: "EVENTS",
    });
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("product")),
    );
  });

  it("rejects missing canonicalRefs", () => {
    const { canonicalRefs: _removed, ...rest } = smallestManifest();
    const parsed = SliceManifestSchema.safeParse(rest);
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("canonicalRefs")),
    );
  });

  it("rejects empty canonicalRefs", () => {
    const parsed = SliceManifestSchema.safeParse(smallestManifest({ canonicalRefs: [] }));
    assert.equal(parsed.success, false);
  });

  it("rejects empty exitCriteria", () => {
    const parsed = SliceManifestSchema.safeParse(smallestManifest({ exitCriteria: [] }));
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("exitCriteria")),
    );
  });

  it("rejects an unknown prohibited manifest property", () => {
    const parsed = SliceManifestSchema.safeParse({
      ...smallestManifest(),
      status: "ACCEPTED",
    });
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false &&
        parsed.error.issues.some((issue) => issue.code === "unrecognized_keys" && issue.keys.includes("status")),
    );
  });

  it("accepts an explicit dependencyKinds declaration for a dependsOn edge", () => {
    const parsed = SliceManifestSchema.safeParse(
      smallestManifest({
        dependsOn: ["MD-CT0"],
        dependencyKinds: { "MD-CT0": "PROGRESSION" },
      }),
    );
    assert.equal(parsed.success, true);
  });

  it("rejects a dependencyKinds key that is not in dependsOn", () => {
    const parsed = SliceManifestSchema.safeParse(
      smallestManifest({
        dependsOn: ["MD-CT0"],
        dependencyKinds: { "MD-MISSING": "PROGRESSION" },
      }),
    );
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("dependencyKinds")),
    );
  });
});

describe("SliceRecord schema", () => {
  it("accepts a valid non-accepted record", () => {
    const parsed = SliceRecordSchema.safeParse(validRecord({ status: "IN_REVIEW" }));
    assert.equal(parsed.success, true);
  });

  it("accepts a valid accepted record with complete evidence", () => {
    const parsed = SliceRecordSchema.safeParse(acceptedRecord());
    assert.equal(parsed.success, true);
  });

  it("treats JSON null acceptance fields as absent on non-accepted records", () => {
    const parsed = SliceRecordSchema.safeParse({
      ...validRecord(),
      acceptedAt: null,
      acceptedBy: null,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects ACCEPTED without acceptedAt", () => {
    const parsed = SliceRecordSchema.safeParse(
      acceptedRecord({
        acceptedAt: undefined,
      }),
    );
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false &&
        parsed.error.issues.some((issue) => issue.path.includes("acceptedAt") && issue.message.includes("ACCEPTED")),
    );
  });

  it("rejects ACCEPTED without acceptedBy", () => {
    const parsed = SliceRecordSchema.safeParse(acceptedRecord({ acceptedBy: undefined }));
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false &&
        parsed.error.issues.some((issue) => issue.path.includes("acceptedBy") && issue.message.includes("ACCEPTED")),
    );
  });

  it("rejects ACCEPTED without a commit", () => {
    const parsed = SliceRecordSchema.safeParse(acceptedRecord({ commits: [] }));
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false &&
        parsed.error.issues.some((issue) => issue.path.includes("commits") && issue.message.includes("ACCEPTED")),
    );
  });

  it("rejects ACCEPTED without evidence", () => {
    const parsed = SliceRecordSchema.safeParse(acceptedRecord({ evidence: [] }));
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.success === false &&
        parsed.error.issues.some((issue) => issue.path.includes("evidence") && issue.message.includes("ACCEPTED")),
    );
  });

  it("rejects ACCEPTED when evidence is not an immutable COMMIT referencing the SHA", () => {
    const parsed = SliceRecordSchema.safeParse(
      acceptedRecord({
        evidence: [validEvidence({ kind: "DOCUMENT", immutable: false, uri: "docs/note.md", summary: "note" })],
      }),
    );
    assert.equal(parsed.success, false);
  });

  it("rejects UNKNOWN as acceptedBy", () => {
    const parsed = SliceRecordSchema.safeParse(acceptedRecord({ acceptedBy: "UNKNOWN" }));
    assert.equal(parsed.success, false);
  });

  it("rejects an invalid commit SHA", () => {
    const parsed = SliceRecordSchema.safeParse(validRecord({ commits: ["not-a-sha"] }));
    assert.equal(parsed.success, false);
    assert.ok(parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("commits")));
  });

  it("rejects an invalid timestamp", () => {
    const parsed = SliceRecordSchema.safeParse(validRecord({ updatedAt: "2026-09-05" }));
    assert.equal(parsed.success, false);
    assert.ok(parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("updatedAt")));
  });

  it("rejects an invalid evidence hash", () => {
    const parsed = EvidenceRefSchema.safeParse(validEvidence({ sha256: "abc" }));
    assert.equal(parsed.success, false);
    assert.ok(parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("sha256")));
  });
});

describe("supporting identity schemas", () => {
  it("rejects an invalid gate status", () => {
    const parsed = GateSchema.safeParse({
      id: "GATE-X",
      product: "FOUNDATION",
      title: "Gate",
      status: "DONE",
      authority: "CEO",
      requiredEvidenceIds: [],
    });
    assert.equal(parsed.success, false);
    assert.ok(parsed.success === false && parsed.error.issues.some((issue) => issue.path.includes("status")));
  });

  it("accepts Check, Decision, Approval and Timeline identity records", () => {
    assert.equal(
      CheckSchema.safeParse({
        id: "CHK-1",
        name: "typecheck",
        result: "PASS",
        sha: VALID_COMMIT,
        recordedAt: VALID_TIME,
        evidenceIds: ["EV-001"],
      }).success,
      true,
    );
    assert.equal(
      DecisionSchema.safeParse({
        id: "CT0-D-SCHEMA",
        title: "Manifest vs SliceRecord",
        severity: "HIGH",
        owner: "AI CTO",
        authority: "CT0",
        disposition: "CONTROLLING",
        affectedIds: ["MD-CT1"],
        blocker: true,
      }).success,
      true,
    );
    assert.equal(
      ApprovalSchema.safeParse({
        id: "APR-1",
        gateId: "GATE-INDEPENDENT",
        authority: "Named independent reviewer",
        status: "NOT_READY",
        evidenceIds: [],
      }).success,
      true,
    );
    assert.equal(
      TimelineEventSchema.safeParse({
        id: "TL-1",
        kind: "COMMIT",
        at: VALID_TIME,
        entityType: "slice_record",
        entityId: "MD-CT1",
        sourceCommit: VALID_COMMIT,
      }).success,
      true,
    );
  });

  it("rejects APPROVED without named authority, time and evidence", () => {
    const parsed = ApprovalSchema.safeParse({
      id: "APR-2",
      gateId: "GATE-CEO-PRODUCTION",
      authority: "UNKNOWN",
      status: "APPROVED",
      evidenceIds: [],
    });
    assert.equal(parsed.success, false);
  });

  it("accepts a valid ProgrammeSnapshot", () => {
    const parsed = ProgrammeSnapshotSchema.safeParse({
      revision: 0,
      generatedAt: VALID_TIME,
      sourceCommit: VALID_COMMIT,
      products: [{ code: "FOUNDATION", name: "Shared Foundation", route: "/programme", order: 0 }],
      slices: [validRecord()],
      openItems: [],
      gates: [
        {
          id: "GATE-INDEPENDENT",
          product: "FOUNDATION",
          title: "Independent",
          status: "NOT_READY",
          authority: "Named independent reviewer",
          requiredEvidenceIds: [],
        },
      ],
    });
    assert.equal(parsed.success, true);
  });

  it("does not treat a 64-character hash as a commit SHA", () => {
    const parsed = SliceRecordSchema.safeParse(validRecord({ commits: [VALID_SHA256] }));
    assert.equal(parsed.success, false);
  });
});
