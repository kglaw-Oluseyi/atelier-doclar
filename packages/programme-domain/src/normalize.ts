import { PRODUCT_ORDER } from "./constants.js";
import type { CycleDetectionResult } from "./dag.js";
import type {
  Dependency,
  Gate,
  OpenItem,
  Phase,
  Product,
  SliceManifest,
  SliceRecord,
} from "./schemas.js";

function productRank(code: string): number {
  return PRODUCT_ORDER.get(code) ?? Number.MAX_SAFE_INTEGER;
}

function compareIds(a: string, b: string): number {
  return a.localeCompare(b);
}

export function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => productRank(a.code) - productRank(b.code) || compareIds(a.code, b.code));
}

export function sortPhases(phases: Phase[]): Phase[] {
  return [...phases].sort((a, b) => a.order - b.order || compareIds(a.id, b.id));
}

export function sortManifests(manifests: SliceManifest[]): SliceManifest[] {
  return [...manifests].sort(
    (a, b) => productRank(a.product) - productRank(b.product) || a.order - b.order || compareIds(a.id, b.id),
  );
}

export function sortRecords(records: SliceRecord[]): SliceRecord[] {
  return [...records].sort(
    (a, b) => productRank(a.product) - productRank(b.product) || a.order - b.order || compareIds(a.id, b.id),
  );
}

export function sortDependencies(edges: Dependency[]): Dependency[] {
  return [...edges].sort((a, b) => compareIds(a.from, b.from) || compareIds(a.to, b.to));
}

export function sortGates(gates: Gate[]): Gate[] {
  return [...gates].sort((a, b) => productRank(a.product) - productRank(b.product) || compareIds(a.id, b.id));
}

export function sortOpenItems(items: OpenItem[]): OpenItem[] {
  return [...items].sort((a, b) => compareIds(a.id, b.id));
}

export function normalizeManifest(manifest: SliceManifest): SliceManifest {
  const normalized: SliceManifest = {
    ...manifest,
    dependsOn: [...manifest.dependsOn].sort(compareIds),
    canonicalRefs: [...manifest.canonicalRefs],
    entryCriteria: [...manifest.entryCriteria],
    exitCriteria: [...manifest.exitCriteria],
    expectedFiles: [...manifest.expectedFiles],
    verification: [...manifest.verification],
  };
  if (manifest.dependencyKinds) {
    normalized.dependencyKinds = Object.fromEntries(
      Object.entries(manifest.dependencyKinds).sort(([left], [right]) => compareIds(left, right)),
    );
  }
  return normalized;
}

export function normalizeRecord(record: SliceRecord): SliceRecord {
  const normalized: SliceRecord = {
    ...record,
    dependsOn: [...record.dependsOn].sort(compareIds),
    canonicalRefs: [...record.canonicalRefs],
    entryCriteria: [...record.entryCriteria],
    exitCriteria: [...record.exitCriteria],
    expectedFiles: [...record.expectedFiles],
    commits: [...record.commits].sort(compareIds),
    evidence: [...record.evidence].sort((a, b) => compareIds(a.id, b.id)),
    openItems: [...record.openItems].sort(compareIds),
  };
  return normalized;
}

export interface NormalisedProgramme {
  products: Product[];
  phases: Phase[];
  slices: SliceManifest[];
  records: SliceRecord[];
  dependencies: Dependency[];
  gates: Gate[];
  openItems: OpenItem[];
  dag: {
    nodes: string[];
    edgeCount: number;
    cycles: string[];
    verdict: "NO_CYCLES" | "CYCLES";
  };
}

export function normalizeProgramme(input: {
  products: Product[];
  phases: Phase[];
  manifests: SliceManifest[];
  records: SliceRecord[];
  gates: Gate[];
  openItems: OpenItem[];
  dag: CycleDetectionResult;
}): NormalisedProgramme {
  return {
    products: sortProducts(input.products).map((product) => ({
      ...product,
      canonicalSources: [...product.canonicalSources],
      dependencies: [...product.dependencies],
      externalAuthorityRequirements: [...product.externalAuthorityRequirements],
    })),
    phases: sortPhases(input.phases).map((phase) => ({
      ...phase,
      products: [...phase.products],
      slices: phase.slices ? [...phase.slices].sort(compareIds) : undefined,
    })),
    slices: sortManifests(input.manifests).map(normalizeManifest),
    records: sortRecords(input.records).map(normalizeRecord),
    dependencies: sortDependencies(input.dag.edges),
    gates: sortGates(input.gates),
    openItems: sortOpenItems(input.openItems),
    dag: {
      nodes: [...input.dag.nodes],
      edgeCount: input.dag.edges.length,
      cycles: [...input.dag.cyclePaths],
      verdict: input.dag.cycles.length === 0 ? "NO_CYCLES" : "CYCLES",
    },
  };
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
