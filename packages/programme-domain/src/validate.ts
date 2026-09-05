import { CT1_TRACEABILITY } from "./constants.js";
import {
  collectDependencies,
  cycleErrors,
  detectCycles,
  duplicateEdgeErrors,
} from "./dag.js";
import { compareErrors, type ProgrammeValidationError } from "./errors.js";
import { loadProgrammeCorpus, type LoadedProgramme } from "./load.js";
import { assertManifestParity, assertMappingConsistency } from "./mapping.js";
import { normalizeProgramme, type NormalisedProgramme } from "./normalize.js";
import { duplicateIdErrors, referentialErrors } from "./referential.js";
import type { Gate, OpenItem, Phase, Product, SliceManifest, SliceRecord } from "./schemas.js";

export interface ProgrammeInput {
  products: Product[];
  phases: Phase[];
  manifests: SliceManifest[];
  records: SliceRecord[];
  gates: Gate[];
  openItems: OpenItem[];
  sourceFileOf?: (entityType: string, id: string) => string | undefined;
}

export interface ProgrammeValidationResult {
  ok: boolean;
  errors: ProgrammeValidationError[];
  normalised?: NormalisedProgramme;
  stats: {
    products: number;
    phases: number;
    slices: number;
    dependencies: number;
    gates: number;
    openItems: number;
    records: number;
    yamlManifests?: number;
    discoveredFiles?: number;
    cycles: number;
    verdict: "NO_CYCLES" | "CYCLES";
  };
  traceability: typeof CT1_TRACEABILITY;
}

export function validateProgramme(input: ProgrammeInput): ProgrammeValidationResult {
  const errors: ProgrammeValidationError[] = [];
  errors.push(
    ...duplicateIdErrors({
      products: input.products,
      phases: input.phases,
      manifests: input.manifests,
      records: input.records,
      gates: input.gates,
      openItems: input.openItems,
      sourceFileOf: input.sourceFileOf,
    }),
  );
  errors.push(
    ...referentialErrors({
      products: input.products,
      phases: input.phases,
      manifests: input.manifests,
      records: input.records,
      gates: input.gates,
      openItems: input.openItems,
      sourceFileOf: input.sourceFileOf,
    }),
  );

  const edges = collectDependencies(input.manifests);
  errors.push(...duplicateEdgeErrors(edges, input.sourceFileOf?.("slice_manifest", edges[0]?.from ?? "")));
  const dag = detectCycles(
    input.manifests.map((item) => item.id),
    edges,
  );
  errors.push(...cycleErrors(dag, input.sourceFileOf?.("dependency", "graph")));

  const manifestsById = new Map(input.manifests.map((item) => [item.id, item]));
  for (const record of input.records) {
    const manifest = manifestsById.get(record.id);
    if (!manifest) continue;
    errors.push(...assertMappingConsistency(manifest, record, input.sourceFileOf?.("slice_record", record.id)));
  }

  errors.sort(compareErrors);

  const normalised = normalizeProgramme({
    products: input.products,
    phases: input.phases,
    manifests: input.manifests,
    records: input.records,
    gates: input.gates,
    openItems: input.openItems,
    dag,
  });

  return {
    ok: errors.length === 0,
    errors,
    normalised,
    stats: {
      products: input.products.length,
      phases: input.phases.length,
      slices: input.manifests.length,
      dependencies: dag.edges.length,
      gates: input.gates.length,
      openItems: input.openItems.length,
      records: input.records.length,
      cycles: dag.cycles.length,
      verdict: dag.cycles.length === 0 ? "NO_CYCLES" : "CYCLES",
    },
    traceability: CT1_TRACEABILITY,
  };
}

export function validateLoadedProgramme(loaded: LoadedProgramme): ProgrammeValidationResult {
  const errors: ProgrammeValidationError[] = [...loaded.errors];

  for (const yaml of loaded.yamlManifests) {
    const catalog = loaded.catalogManifests.find((item) => item.id === yaml.id);
    const yamlSource = loaded.yamlById.get(yaml.id)?.sourceFile ?? "yaml";
    if (!catalog) {
      errors.push({
        code: "MAPPING_INCONSISTENT",
        entityType: "slice_manifest",
        entityId: yaml.id,
        field: "id",
        value: yaml.id,
        message: "YAML manifest has no matching catalog declaration",
        sourceFile: yamlSource,
      });
      continue;
    }
    errors.push(...assertManifestParity(catalog, yaml, loaded.catalogSourceFile, yamlSource));
  }

  const programme = validateProgramme({
    products: loaded.products,
    phases: loaded.phases,
    manifests: loaded.catalogManifests,
    records: loaded.records,
    gates: loaded.gates,
    openItems: loaded.openItems,
    sourceFileOf: loaded.sourceFileOf,
  });

  const merged = [...errors, ...programme.errors].sort(compareErrors);
  return {
    ok: merged.length === 0,
    errors: merged,
    normalised: programme.normalised,
    stats: {
      ...programme.stats,
      yamlManifests: loaded.yamlManifests.length,
      discoveredFiles: loaded.discoveredFiles.length,
    },
    traceability: CT1_TRACEABILITY,
  };
}

export function validateProgrammeCorpus(root?: string): ProgrammeValidationResult {
  return validateLoadedProgramme(loadProgrammeCorpus(root));
}
