import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CatalogFileSchema,
  resolveProgrammeRoot,
  type ProductCode,
  PRODUCT_CODES,
} from "@maison-doclar/programme-domain";
import type { LinkageCatalog, SliceCatalogueEntry } from "./linkage.js";

function asProduct(value: unknown): ProductCode | undefined {
  return (PRODUCT_CODES as readonly string[]).includes(String(value)) ? (value as ProductCode) : undefined;
}

export function loadLinkageCatalog(root?: string): LinkageCatalog {
  const programmeRoot = resolveProgrammeRoot(root);
  const raw = JSON.parse(readFileSync(join(programmeRoot, "programme", "slices", "catalog.json"), "utf8")) as unknown;
  const parsed = CatalogFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("programme catalog.json failed schema validation");
  }
  const slices: Record<string, SliceCatalogueEntry> = {};
  for (const item of parsed.data.slices) {
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; product?: unknown };
    const id = typeof record.id === "string" ? record.id : undefined;
    const product = asProduct(record.product);
    if (!id || !product) continue;
    const attachment = parsed.data.prompt_attachments[id];
    slices[id] = {
      id,
      product,
      promptControlIds: attachment?.prompt_control_ids ?? [],
    };
  }
  return { slices };
}
