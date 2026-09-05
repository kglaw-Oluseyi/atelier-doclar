import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  CatalogFileSchema,
  GateSchema,
  OpenItemSchema,
  PhaseSchema,
  ProductSchema,
  SliceManifestSchema,
  SliceRecordSchema,
  StateProjectionFileSchema,
  type Gate,
  type OpenItem,
  type Phase,
  type Product,
  type SliceManifest,
  type SliceRecord,
} from "./schemas.js";
import { entityIdFromUnknown, zodIssuesToErrors } from "./zod-issues.js";
import { compareErrors, type ProgrammeValidationError } from "./errors.js";

export interface LoadedProgramme {
  root: string;
  products: Product[];
  phases: Phase[];
  catalogManifests: SliceManifest[];
  yamlManifests: SliceManifest[];
  records: SliceRecord[];
  gates: Gate[];
  openItems: OpenItem[];
  yamlById: Map<string, { manifest: SliceManifest; sourceFile: string }>;
  catalogSourceFile: string;
  projectionSourceFile: string;
  discoveredFiles: string[];
  errors: ProgrammeValidationError[];
  sourceFileOf: (entityType: string, id: string) => string | undefined;
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function parseJsonFile(path: string): unknown {
  return JSON.parse(readText(path)) as unknown;
}

function parseYamlFile(path: string): unknown {
  return parseYaml(readText(path)) as unknown;
}

function listFilesRecursive(directory: string, suffix: string): string[] {
  if (!existsSync(directory)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(path, suffix));
    } else if (entry.name.endsWith(suffix)) {
      out.push(path);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function resolveProgrammeRoot(explicit?: string): string {
  if (explicit) return explicit;
  const fromEnv = process.env.PROGRAMME_ROOT;
  if (fromEnv) return fromEnv;

  let dir = process.cwd();
  for (let i = 0; i < 12; i += 1) {
    if (existsSync(join(dir, "programme", "slices", "catalog.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Unable to locate programme corpus (programme/slices/catalog.json)");
}

export function loadProgrammeCorpus(rootInput?: string): LoadedProgramme {
  const root = resolveProgrammeRoot(rootInput);
  const errors: ProgrammeValidationError[] = [];
  const discoveredFiles: string[] = [];
  const sourceByKey = new Map<string, string>();

  const rel = (path: string): string => relative(root, path);

  const productFiles = listFilesRecursive(join(root, "programme", "products"), ".yaml");
  const phaseFiles = listFilesRecursive(join(root, "programme", "phases"), ".yaml");
  const yamlManifestFiles = listFilesRecursive(join(root, "programme", "slices"), ".yaml");
  const gateFiles = listFilesRecursive(join(root, "programme", "gates"), ".yaml");
  const openItemFiles = listFilesRecursive(join(root, "programme", "open-items"), ".yaml");
  const catalogPath = join(root, "programme", "slices", "catalog.json");
  const projectionPath = join(root, "programme", "slices", "state-projection.json");

  discoveredFiles.push(
    ...productFiles,
    ...phaseFiles,
    ...yamlManifestFiles,
    ...gateFiles,
    ...openItemFiles,
    catalogPath,
    projectionPath,
  );

  const products: Product[] = [];
  for (const file of productFiles) {
    const raw = parseYamlFile(file);
    const parsed = ProductSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...zodIssuesToErrors(parsed.error.issues, "product", entityIdFromUnknown(raw), rel(file)));
      continue;
    }
    products.push(parsed.data);
    sourceByKey.set(`product:${parsed.data.code}`, rel(file));
  }

  const phases: Phase[] = [];
  for (const file of phaseFiles) {
    const raw = parseYamlFile(file);
    const parsed = PhaseSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...zodIssuesToErrors(parsed.error.issues, "phase", entityIdFromUnknown(raw), rel(file)));
      continue;
    }
    phases.push(parsed.data);
    sourceByKey.set(`phase:${parsed.data.id}`, rel(file));
  }

  const yamlManifests: SliceManifest[] = [];
  const yamlById = new Map<string, { manifest: SliceManifest; sourceFile: string }>();
  for (const file of yamlManifestFiles) {
    const raw = parseYamlFile(file);
    const parsed = SliceManifestSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(
        ...zodIssuesToErrors(parsed.error.issues, "slice_manifest", entityIdFromUnknown(raw), rel(file)),
      );
      continue;
    }
    yamlManifests.push(parsed.data);
    yamlById.set(parsed.data.id, { manifest: parsed.data, sourceFile: rel(file) });
    sourceByKey.set(`slice_manifest_yaml:${parsed.data.id}`, rel(file));
  }

  const catalogManifests: SliceManifest[] = [];
  const catalogRaw = parseJsonFile(catalogPath);
  const catalogEnvelope = CatalogFileSchema.safeParse(catalogRaw);
  if (!catalogEnvelope.success) {
    errors.push(...zodIssuesToErrors(catalogEnvelope.error.issues, "programme", "catalog", rel(catalogPath)));
  } else {
    if (catalogEnvelope.data.count !== catalogEnvelope.data.slices.length) {
      errors.push({
        code: "SCHEMA_INVALID",
        entityType: "programme",
        entityId: "catalog",
        field: "count",
        value: String(catalogEnvelope.data.count),
        message: `catalog count ${catalogEnvelope.data.count} does not match slices.length ${catalogEnvelope.data.slices.length}`,
        sourceFile: rel(catalogPath),
      });
    }
    for (const raw of catalogEnvelope.data.slices) {
      const parsed = SliceManifestSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(
          ...zodIssuesToErrors(parsed.error.issues, "slice_manifest", entityIdFromUnknown(raw), rel(catalogPath)),
        );
        continue;
      }
      catalogManifests.push(parsed.data);
      sourceByKey.set(`slice_manifest:${parsed.data.id}`, rel(catalogPath));
    }
    for (const key of Object.keys(catalogEnvelope.data.prompt_attachments).sort()) {
      if (!catalogEnvelope.data.slices.some((item) => entityIdFromUnknown(item) === key)) {
        errors.push({
          code: "REFERENCE_NOT_FOUND",
          entityType: "programme",
          entityId: key,
          field: "prompt_attachments",
          value: key,
          message: `prompt attachment refers to unknown slice ${key}`,
          sourceFile: rel(catalogPath),
        });
      }
    }
  }

  const records: SliceRecord[] = [];
  const projectionRaw = parseJsonFile(projectionPath);
  const projectionEnvelope = StateProjectionFileSchema.safeParse(projectionRaw);
  if (!projectionEnvelope.success) {
    errors.push(
      ...zodIssuesToErrors(projectionEnvelope.error.issues, "programme", "state-projection", rel(projectionPath)),
    );
  } else {
    for (const raw of projectionEnvelope.data.records) {
      const parsed = SliceRecordSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(
          ...zodIssuesToErrors(parsed.error.issues, "slice_record", entityIdFromUnknown(raw), rel(projectionPath)),
        );
        continue;
      }
      records.push(parsed.data);
      sourceByKey.set(`slice_record:${parsed.data.id}`, rel(projectionPath));
    }
  }

  const gates: Gate[] = [];
  for (const file of gateFiles) {
    const raw = parseYamlFile(file);
    const parsed = GateSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...zodIssuesToErrors(parsed.error.issues, "gate", entityIdFromUnknown(raw), rel(file)));
      continue;
    }
    gates.push(parsed.data);
    sourceByKey.set(`gate:${parsed.data.id}`, rel(file));
  }

  const openItems: OpenItem[] = [];
  for (const file of openItemFiles) {
    const raw = parseYamlFile(file);
    const parsed = OpenItemSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...zodIssuesToErrors(parsed.error.issues, "open_item", entityIdFromUnknown(raw), rel(file)));
      continue;
    }
    openItems.push(parsed.data);
    sourceByKey.set(`open_item:${parsed.data.id}`, rel(file));
  }

  errors.sort(compareErrors);

  return {
    root,
    products,
    phases,
    catalogManifests,
    yamlManifests,
    records,
    gates,
    openItems,
    yamlById,
    catalogSourceFile: rel(catalogPath),
    projectionSourceFile: rel(projectionPath),
    discoveredFiles: discoveredFiles.map(rel).sort((a, b) => a.localeCompare(b)),
    errors,
    sourceFileOf(entityType: string, id: string): string | undefined {
      return (
        sourceByKey.get(`${entityType}:${id}`) ??
        sourceByKey.get(`slice_manifest:${id}`) ??
        sourceByKey.get(`slice_manifest_yaml:${id}`)
      );
    },
  };
}
