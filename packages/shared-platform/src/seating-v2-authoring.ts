import { PlatformError } from "./errors.js";
import type { SeatingV2RuleContent } from "./seating-v2-schemas.js";

const PAIRWISE = new Set(["KEEP_TOGETHER", "KEEP_APART", "PREFER_TOGETHER", "PREFER_APART"]);
const TABLE_TARGETED = new Set(["REQUIRE_TABLE", "FORBID_TABLE", "PREFER_TABLE"]);

function tableTargets(content: SeatingV2RuleContent) {
  return content.targets.filter((item) => item.type === "TABLE");
}

export function seatingV2RuleSemanticSentence(input: {
  kind: string;
  subjectLabels: readonly string[];
  tableLabels: readonly string[];
}): string {
  const subjects = input.subjectLabels.length ? input.subjectLabels : ["the selected guests"];
  const table = input.tableLabels[0] ?? "the required table";
  if (input.kind === "KEEP_APART") {
    return `${subjects.slice(0, 2).join(" and ")} must be seated at different tables`;
  }
  if (input.kind === "KEEP_TOGETHER") {
    return `${subjects.slice(0, 2).join(" and ")} must be seated at the same table`;
  }
  if (input.kind === "REQUIRE_TABLE") {
    if (subjects.length === 1) return `${subjects[0]} must be seated at ${table}`;
    return `Each selected guest must be seated at ${table}`;
  }
  if (input.kind === "FORBID_TABLE") {
    if (subjects.length === 1) return `${subjects[0]} must not be seated at ${table}`;
    return `Each selected guest must not be seated at ${table}`;
  }
  return `${input.kind.replaceAll("_", " ").toLowerCase()} applies to ${subjects.join(" and ")}`;
}

export function assertSeatingV2RuleAuthoring(
  content: SeatingV2RuleContent,
  publishedTableIds?: ReadonlySet<string>,
): void {
  const subjects = content.subjects;
  const ids = subjects.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new PlatformError("VALIDATION_FAILED", "duplicate seating rule subject", {
      publicMessage: "A seating rule cannot name the same guest more than once.",
    });
  }
  const tables = tableTargets(content);
  if (PAIRWISE.has(content.kind)) {
    if (subjects.length !== 2) {
      throw new PlatformError("VALIDATION_FAILED", "pairwise seating rule requires exactly two subjects", {
        field: "guestIdA",
        publicMessage: "This rule needs exactly two guests.",
      });
    }
    if (tables.length) {
      throw new PlatformError("VALIDATION_FAILED", "pairwise seating rule cannot carry a table target", {
        field: "tableId",
        publicMessage: "This rule does not use a table. Remove the table and save again.",
      });
    }
    return;
  }
  if (TABLE_TARGETED.has(content.kind)) {
    if (subjects.length < 1) {
      throw new PlatformError("VALIDATION_FAILED", "table seating rule requires at least one subject", {
        field: "guestIdA",
        publicMessage: "Select at least one guest for this table rule.",
      });
    }
    if (tables.length !== 1) {
      throw new PlatformError("VALIDATION_FAILED", "table seating rule requires exactly one table", {
        field: "tableId",
        publicMessage: "Select exactly one table for this rule.",
      });
    }
    const tableId = tables[0]!.idOrCode;
    if (publishedTableIds && !publishedTableIds.has(tableId)) {
      throw new PlatformError("VALIDATION_FAILED", "table target is not in the current published layout", {
        field: "tableId",
        publicMessage: "That table is not in the current published layout.",
      });
    }
  }
}
