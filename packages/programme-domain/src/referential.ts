import { SLICE_ID_PATTERN } from "./constants.js";
import { validationError, type ProgrammeValidationError } from "./errors.js";
import type { Gate, OpenItem, Phase, Product, SliceManifest, SliceRecord } from "./schemas.js";

export interface ReferentialInput {
  products: Product[];
  phases: Phase[];
  manifests: SliceManifest[];
  records: SliceRecord[];
  gates: Gate[];
  openItems: OpenItem[];
  sourceFileOf?: (entityType: string, id: string) => string | undefined;
}

function source(
  input: ReferentialInput,
  entityType: string,
  id: string,
): string | undefined {
  return input.sourceFileOf?.(entityType, id);
}

export function duplicateIdErrors(input: ReferentialInput): ProgrammeValidationError[] {
  const errors: ProgrammeValidationError[] = [];

  function collect(ids: string[], entityType: ProgrammeValidationError["entityType"], field: string): void {
    const seen = new Map<string, number>();
    for (const id of ids) {
      const count = (seen.get(id) ?? 0) + 1;
      seen.set(id, count);
      if (count === 2) {
        errors.push(
          validationError({
            code: "DUPLICATE_ID",
            entityType,
            entityId: id,
            field,
            value: id,
            message: `duplicate ${entityType} id`,
            sourceFile: source(input, entityType, id),
          }),
        );
      }
    }
  }

  collect(
    input.products.map((item) => item.code),
    "product",
    "code",
  );
  collect(
    input.phases.map((item) => item.id),
    "phase",
    "id",
  );
  collect(
    input.manifests.map((item) => item.id),
    "slice_manifest",
    "id",
  );
  collect(
    input.records.map((item) => item.id),
    "slice_record",
    "id",
  );
  collect(
    input.gates.map((item) => item.id),
    "gate",
    "id",
  );
  collect(
    input.openItems.map((item) => item.id),
    "open_item",
    "id",
  );
  return errors;
}

export function referentialErrors(input: ReferentialInput): ProgrammeValidationError[] {
  const errors: ProgrammeValidationError[] = [];
  const productIds = new Set(input.products.map((item) => item.code));
  const phaseIds = new Set(input.phases.map((item) => item.id));
  const sliceIds = new Set(input.manifests.map((item) => item.id));
  const gateIds = new Set(input.gates.map((item) => item.id));
  const evidenceIds = new Set<string>();

  for (const record of input.records) {
    for (const item of record.evidence) evidenceIds.add(item.id);
  }
  for (const openItem of input.openItems) {
    for (const item of openItem.evidence) evidenceIds.add(item.id);
  }

  for (const product of input.products) {
    for (const dep of product.dependencies) {
      if (!productIds.has(dep)) {
        errors.push(
          validationError({
            code: "REFERENCE_NOT_FOUND",
            entityType: "product",
            entityId: product.code,
            field: "dependencies",
            value: dep,
            message: `product dependency ${dep} does not exist`,
            sourceFile: source(input, "product", product.code),
          }),
        );
      }
    }
  }

  for (const phase of input.phases) {
    for (const product of phase.products) {
      if (!productIds.has(product)) {
        errors.push(
          validationError({
            code: "REFERENCE_NOT_FOUND",
            entityType: "phase",
            entityId: phase.id,
            field: "products",
            value: product,
            message: `phase product ${product} does not exist`,
            sourceFile: source(input, "phase", phase.id),
          }),
        );
      }
    }
    for (const sliceId of phase.slices ?? []) {
      const manifest = input.manifests.find((item) => item.id === sliceId);
      if (!manifest) {
        errors.push(
          validationError({
            code: "REFERENCE_NOT_FOUND",
            entityType: "phase",
            entityId: phase.id,
            field: "slices",
            value: sliceId,
            message: `phase slice ${sliceId} does not exist`,
            sourceFile: source(input, "phase", phase.id),
          }),
        );
      } else if (manifest.phaseId !== phase.id) {
        errors.push(
          validationError({
            code: "REFERENCE_NOT_FOUND",
            entityType: "phase",
            entityId: phase.id,
            field: "slices",
            value: sliceId,
            message: `phase slice ${sliceId} is assigned to ${manifest.phaseId}, not ${phase.id}`,
            sourceFile: source(input, "phase", phase.id),
          }),
        );
      }
    }
    if (phase.slices) {
      const assigned = input.manifests.filter((item) => item.phaseId === phase.id).map((item) => item.id);
      for (const id of assigned) {
        if (!phase.slices.includes(id)) {
          errors.push(
            validationError({
              code: "MAPPING_INCONSISTENT",
              entityType: "phase",
              entityId: phase.id,
              field: "slices",
              value: id,
              message: `phase.slices omits catalog slice ${id}`,
              sourceFile: source(input, "phase", phase.id),
            }),
          );
        }
      }
    }
  }

  for (const manifest of input.manifests) {
    if (!productIds.has(manifest.product)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "slice_manifest",
          entityId: manifest.id,
          field: "product",
          value: manifest.product,
          message: `slice product ${manifest.product} does not exist`,
          sourceFile: source(input, "slice_manifest", manifest.id),
        }),
      );
    }
    if (!phaseIds.has(manifest.phaseId)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "slice_manifest",
          entityId: manifest.id,
          field: "phaseId",
          value: manifest.phaseId,
          message: `slice phase ${manifest.phaseId} does not exist`,
          sourceFile: source(input, "slice_manifest", manifest.id),
        }),
      );
    }
    for (const dep of manifest.dependsOn) {
      if (sliceIds.has(dep) || gateIds.has(dep)) continue;
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "slice_manifest",
          entityId: manifest.id,
          field: "dependsOn",
          value: dep,
          message: `dependency ${dep} is not an existing slice or permitted gate`,
          sourceFile: source(input, "slice_manifest", manifest.id),
        }),
      );
    }
  }

  for (const record of input.records) {
    if (!sliceIds.has(record.id)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "slice_record",
          entityId: record.id,
          field: "id",
          value: record.id,
          message: `projection has no matching slice manifest`,
          sourceFile: source(input, "slice_record", record.id),
        }),
      );
    }
    if (!productIds.has(record.product)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "slice_record",
          entityId: record.id,
          field: "product",
          value: record.product,
          message: `record product ${record.product} does not exist`,
          sourceFile: source(input, "slice_record", record.id),
        }),
      );
    }
    if (!phaseIds.has(record.phaseId)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "slice_record",
          entityId: record.id,
          field: "phaseId",
          value: record.phaseId,
          message: `record phase ${record.phaseId} does not exist`,
          sourceFile: source(input, "slice_record", record.id),
        }),
      );
    }
    for (const openItemId of record.openItems) {
      if (!input.openItems.some((item) => item.id === openItemId)) {
        errors.push(
          validationError({
            code: "REFERENCE_NOT_FOUND",
            entityType: "slice_record",
            entityId: record.id,
            field: "openItems",
            value: openItemId,
            message: `open item ${openItemId} does not exist`,
            sourceFile: source(input, "slice_record", record.id),
          }),
        );
      }
    }
  }

  for (const manifest of input.manifests) {
    if (!input.records.some((record) => record.id === manifest.id)) {
      errors.push(
        validationError({
          code: "MAPPING_INCONSISTENT",
          entityType: "slice_manifest",
          entityId: manifest.id,
          field: "id",
          value: manifest.id,
          message: `manifest has no matching SliceRecord projection`,
          sourceFile: source(input, "slice_manifest", manifest.id),
        }),
      );
    }
  }

  for (const gate of input.gates) {
    if (!productIds.has(gate.product)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "gate",
          entityId: gate.id,
          field: "product",
          value: gate.product,
          message: `gate product ${gate.product} does not exist`,
          sourceFile: source(input, "gate", gate.id),
        }),
      );
    }
    for (const evidenceId of gate.requiredEvidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        errors.push(
          validationError({
            code: "REFERENCE_NOT_FOUND",
            entityType: "gate",
            entityId: gate.id,
            field: "requiredEvidenceIds",
            value: evidenceId,
            message: `required evidence ${evidenceId} does not resolve`,
            sourceFile: source(input, "gate", gate.id),
          }),
        );
      }
    }
  }

  for (const openItem of input.openItems) {
    if (!productIds.has(openItem.product)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "open_item",
          entityId: openItem.id,
          field: "product",
          value: openItem.product,
          message: `open-item product ${openItem.product} does not exist`,
          sourceFile: source(input, "open_item", openItem.id),
        }),
      );
    }
    if (!sliceIds.has(openItem.sliceId)) {
      errors.push(
        validationError({
          code: "REFERENCE_NOT_FOUND",
          entityType: "open_item",
          entityId: openItem.id,
          field: "sliceId",
          value: openItem.sliceId,
          message: `open item refers to unknown slice ${openItem.sliceId}`,
          sourceFile: source(input, "open_item", openItem.id),
        }),
      );
    }
    if (!SLICE_ID_PATTERN.test(openItem.sliceId)) {
      errors.push(
        validationError({
          code: "INVALID_IDENTITY",
          entityType: "open_item",
          entityId: openItem.id,
          field: "sliceId",
          value: openItem.sliceId,
          message: `open-item sliceId is syntactically invalid`,
          sourceFile: source(input, "open_item", openItem.id),
        }),
      );
    }
  }

  return errors;
}
