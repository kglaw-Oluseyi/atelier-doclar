import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inspectLayoutExportPdfText,
  inspectLayoutExportPngText,
  layoutExportProvenanceLines,
  renderLayoutExport,
  type LayoutExportMarking,
  type LayoutExportRenderInput,
} from "../src/index.js";

const NOW = "2026-09-08T08:00:00.000Z";
const HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const LONG_EVENT = `Event${"E".repeat(155)}`;
const LONG_LAYOUT = `Layout${"L".repeat(154)}`;

function base(overrides: Partial<LayoutExportRenderInput> = {}): LayoutExportRenderInput {
  return {
    format: "PDF",
    marking: "PUBLISHED",
    eventName: "Alpha One",
    layoutName: "Ballroom",
    contentHash: HASH,
    publicationNumber: 3,
    generatedAt: NOW,
    widthMm: 12000,
    heightMm: 8000,
    objects: [
      {
        id: "table-1",
        objectType: "TABLE",
        label: "Table one",
        geometry: { kind: "RECTANGLE", xMm: 1000, yMm: 1000, widthMm: 1800, heightMm: 1800 },
      },
      {
        id: "restricted-1",
        objectType: "MASKED",
        label: "Back of house",
        geometry: { kind: "MASKED" },
      },
    ],
    ...overrides,
  };
}

function assertMandatory(text: string, marking: string, publication?: number): void {
  assert.match(text, new RegExp(`Status: ${marking}`));
  assert.match(text, /Hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/);
  assert.match(text, /Generated: 2026-09-08T08:00:00.000Z/);
  if (publication !== undefined) assert.match(text, new RegExp(`Publication: ${publication}`));
  assert.doesNotMatch(text, /guestId|personId|householdId|seatAssignment|invitationId|biometric/i);
}

describe("EOS-S05 export provenance remediation", () => {
  it("encodes every mandatory provenance field in visible PNG pixels", () => {
    const rendered = renderLayoutExport(base({ format: "PNG" }));
    assert.equal(rendered.contentType, "image/png");
    assert.ok(rendered.bytes.byteLength > 100);
    const text = inspectLayoutExportPngText(rendered.bytes);
    assertMandatory(text, "PUBLISHED", 3);
    assert.match(text, /Event: Alpha One/);
    assert.match(text, /Layout: Ballroom/);
  });

  it("encodes every mandatory provenance field in the generated PDF content", () => {
    const rendered = renderLayoutExport(base({ format: "PDF" }));
    assert.equal(rendered.contentType, "application/pdf");
    assert.match(Buffer.from(rendered.bytes).toString("latin1"), /^%PDF-1.4/);
    const text = inspectLayoutExportPdfText(rendered.bytes);
    assertMandatory(text, "PUBLISHED", 3);
    assert.match(text, /Event: Alpha One/);
    assert.match(text, /Layout: Ballroom/);
  });

  it("keeps hash, status, publication and timestamp when event and layout names are maximum length", () => {
    const input = base({
      eventName: LONG_EVENT,
      layoutName: LONG_LAYOUT,
    });
    const png = inspectLayoutExportPngText(renderLayoutExport({ ...input, format: "PNG" }).bytes);
    const pdf = inspectLayoutExportPdfText(renderLayoutExport({ ...input, format: "PDF" }).bytes);
    for (const text of [png, pdf]) {
      assertMandatory(text, "PUBLISHED", 3);
      assert.match(text, /Event:/);
      assert.match(text, /Layout:/);
      const hashIndex = text.indexOf(HASH);
      const statusIndex = text.indexOf("Status: PUBLISHED");
      const generatedIndex = text.indexOf(NOW);
      assert.ok(hashIndex >= 0 && statusIndex >= 0 && generatedIndex >= 0);
    }
  });

  it("renders every supported export marking truthfully", () => {
    const markings: LayoutExportMarking[] = ["DRAFT", "APPROVED", "PUBLISHED", "SUPERSEDED", "WITHDRAWN"];
    for (const marking of markings) {
      const publicationNumber = marking === "DRAFT" || marking === "APPROVED" ? undefined : 4;
      const input = base({ marking, publicationNumber });
      const png = inspectLayoutExportPngText(renderLayoutExport({ ...input, format: "PNG" }).bytes);
      const pdf = inspectLayoutExportPdfText(renderLayoutExport({ ...input, format: "PDF" }).bytes);
      assertMandatory(png, marking, publicationNumber);
      assertMandatory(pdf, marking, publicationNumber);
    }
  });

  it("omits masked restricted geometry from the rendered bytes", () => {
    const pdf = Buffer.from(renderLayoutExport(base({ format: "PDF" })).bytes).toString("latin1");
    const png = inspectLayoutExportPngText(renderLayoutExport(base({ format: "PNG" })).bytes);
    assert.doesNotMatch(pdf, /Back of house/);
    assert.doesNotMatch(png, /Back of house/);
    const unmasked = renderLayoutExport(
      base({
        format: "PDF",
        objects: [
          {
            id: "restricted-visible",
            objectType: "RESTRICTED_AREA",
            label: "Back of house",
            geometry: { kind: "RECTANGLE", xMm: 500, yMm: 500, widthMm: 2000, heightMm: 1500 },
          },
        ],
      }),
    );
    assert.ok(unmasked.bytes.byteLength > 100);
  });

  it("builds labelled provenance lines without combining them into one truncatable record", () => {
    const lines = layoutExportProvenanceLines({
      marking: "PUBLISHED",
      eventName: LONG_EVENT,
      layoutName: LONG_LAYOUT,
      contentHash: HASH,
      publicationNumber: 9,
      generatedAt: NOW,
    });
    assert.deepEqual(
      lines.map((line) => line.split(":")[0]),
      ["Status", "Event", "Layout", "Hash", "Publication", "Generated"],
    );
    assert.equal(lines.find((line) => line.startsWith("Hash: "))?.slice(6), HASH);
  });
});
