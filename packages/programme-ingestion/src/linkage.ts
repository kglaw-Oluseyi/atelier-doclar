import { PRODUCT_CODES, SLICE_ID_PATTERN, type ProductCode } from "@maison-doclar/programme-domain";
import { IngestionError } from "./errors.js";

const PROMPT_ID = /^MD-PR-\d{4}$/;

export interface SliceCatalogueEntry {
  id: string;
  product: ProductCode;
  promptControlIds: string[];
}

export interface LinkageCatalog {
  slices: Record<string, SliceCatalogueEntry>;
}

export interface ParsedCommitMetadata {
  sliceId?: string;
  product?: string;
  nativeId?: string;
  promptControlId?: string;
  canonicalRefs: string[];
  evidenceRefs: string[];
  openItems: string[];
  reviewRequested: boolean;
}

export type LinkageResult =
  | { kind: "linked"; sliceId: string; product: ProductCode; metadata: ParsedCommitMetadata }
  | { kind: "unlinked"; reason: "NO_SLICE_METADATA"; metadata: ParsedCommitMetadata }
  | { kind: "unknown_slice"; sliceId: string; metadata: ParsedCommitMetadata }
  | { kind: "conflict"; field: string; value: string; message: string; metadata: ParsedCommitMetadata };

function trailers(message: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of message.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9-]+):\s*(.+)$/.exec(line.trim());
    if (!match) continue;
    const key = match[1] ?? "";
    const value = (match[2] ?? "").trim();
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
  }
  return map;
}

function first(map: Map<string, string[]>, key: string): string | undefined {
  return map.get(key)?.[0];
}

function all(map: Map<string, string[]>, key: string): string[] {
  return map.get(key) ?? [];
}

export function parseCommitMetadata(message: string): ParsedCommitMetadata {
  const map = trailers(message);
  const metadata: ParsedCommitMetadata = {
    canonicalRefs: all(map, "Canonical-Refs"),
    evidenceRefs: all(map, "Evidence-Refs"),
    openItems: all(map, "Open-Items")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value) => value.length > 0 && value !== "NONE"),
    reviewRequested: /^(true|yes)$/i.test(first(map, "Review-Requested") ?? ""),
  };
  const sliceId = first(map, "Slice-ID");
  const product = first(map, "Product");
  const nativeId = first(map, "Native-ID");
  const promptControlId = first(map, "Prompt-Control-ID");
  if (sliceId !== undefined) metadata.sliceId = sliceId;
  if (product !== undefined) metadata.product = product;
  if (nativeId !== undefined) metadata.nativeId = nativeId;
  if (promptControlId !== undefined) metadata.promptControlId = promptControlId;
  return metadata;
}

function expectedNativeId(sliceId: string): string | undefined {
  const match = /^MD-(CT\d+|B0)$/.exec(sliceId);
  return match?.[1];
}

export function resolveCommitLinkage(message: string, catalog: LinkageCatalog): LinkageResult {
  const metadata = parseCommitMetadata(message);
  if (!metadata.sliceId) {
    return { kind: "unlinked", reason: "NO_SLICE_METADATA", metadata };
  }
  if (!SLICE_ID_PATTERN.test(metadata.sliceId)) {
    return {
      kind: "conflict",
      field: "Slice-ID",
      value: metadata.sliceId,
      message: "Slice-ID is syntactically invalid",
      metadata,
    };
  }
  const entry = catalog.slices[metadata.sliceId];
  if (!entry) {
    return { kind: "unknown_slice", sliceId: metadata.sliceId, metadata };
  }
  if (metadata.product) {
    if (!(PRODUCT_CODES as readonly string[]).includes(metadata.product)) {
      return {
        kind: "conflict",
        field: "Product",
        value: metadata.product,
        message: "Product is not a controlled product code",
        metadata,
      };
    }
    if (metadata.product !== entry.product) {
      return {
        kind: "conflict",
        field: "Product",
        value: metadata.product,
        message: `Product ${metadata.product} does not match catalogue ${entry.product}`,
        metadata,
      };
    }
  }
  if (metadata.promptControlId) {
    if (!PROMPT_ID.test(metadata.promptControlId)) {
      return {
        kind: "conflict",
        field: "Prompt-Control-ID",
        value: metadata.promptControlId,
        message: "Prompt-Control-ID is syntactically invalid",
        metadata,
      };
    }
    if (entry.promptControlIds.length > 0 && !entry.promptControlIds.includes(metadata.promptControlId)) {
      return {
        kind: "conflict",
        field: "Prompt-Control-ID",
        value: metadata.promptControlId,
        message: "Prompt-Control-ID is not registered for this slice",
        metadata,
      };
    }
  }
  if (metadata.nativeId) {
    const expected = expectedNativeId(metadata.sliceId);
    if (expected && metadata.nativeId !== expected) {
      return {
        kind: "conflict",
        field: "Native-ID",
        value: metadata.nativeId,
        message: `Native-ID ${metadata.nativeId} is not compatible with ${metadata.sliceId}`,
        metadata,
      };
    }
  }
  return { kind: "linked", sliceId: entry.id, product: entry.product, metadata };
}

export function linkageToError(result: LinkageResult): IngestionError | undefined {
  if (result.kind === "unknown_slice") {
    return new IngestionError("UNKNOWN_SLICE", `slice ${result.sliceId} is not in the catalogue`, "Slice-ID", result.sliceId);
  }
  if (result.kind === "conflict") {
    return new IngestionError("METADATA_CONFLICT", result.message, result.field, result.value);
  }
  return undefined;
}
