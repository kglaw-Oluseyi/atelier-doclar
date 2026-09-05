import {
  emptyOperationalState,
  projectSliceRecord,
  type EvidenceRef,
  type Gate,
  type OpenItem,
  type Phase,
  type Product,
  type SliceManifest,
  type SliceRecord,
} from "../src/index.js";

export const VALID_COMMIT = "f7abb431be9a15ab730b3fdd16baa8e83776c170";
export const VALID_SHA256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const VALID_TIME = "2026-09-05T05:10:00Z";

export function validManifest(overrides: Partial<SliceManifest> = {}): SliceManifest {
  return {
    id: "MD-CT1",
    product: "FOUNDATION",
    title: "CT1 — Programme domain and manifest validator",
    phaseId: "PH-FOUNDATION",
    order: 2,
    dependsOn: ["MD-CT0"],
    canonicalRefs: ["docs/control/EXECUTION_COMPATIBILITY_REGISTER.md"],
    outcome: "Zod/JSON loaders, referential validation, DAG cycle detection",
    entryCriteria: ["Previous CT slice authorised and reviewed"],
    exitCriteria: ["One coherent commit containing CT1"],
    expectedFiles: ["programme/schema/"],
    verification: ["Tests and evidence per CT standing technical contract"],
    ...overrides,
  };
}

export function smallestManifest(overrides: Partial<SliceManifest> = {}): SliceManifest {
  return {
    id: "MD-AA",
    product: "FOUNDATION",
    title: "Smallest valid manifest",
    phaseId: "PH-FOUNDATION",
    order: 0,
    dependsOn: [],
    canonicalRefs: ["docs/control/ROADMAP_DATA_DICTIONARY.md"],
    outcome: "Minimal declaration",
    entryCriteria: [],
    exitCriteria: ["Declared"],
    expectedFiles: [],
    verification: ["Schema"],
    ...overrides,
  };
}

export function validEvidence(overrides: Partial<EvidenceRef> = {}): EvidenceRef {
  return {
    id: "EV-001",
    kind: "COMMIT",
    uri: `git:${VALID_COMMIT}`,
    sha256: VALID_SHA256,
    createdAt: VALID_TIME,
    sourceSystem: "github",
    immutable: true,
    summary: `commit ${VALID_COMMIT}`,
    ...overrides,
  };
}

export function validRecord(overrides: Partial<SliceRecord> = {}): SliceRecord {
  const manifest = validManifest();
  const projected = projectSliceRecord(
    manifest,
    emptyOperationalState({ updatedAt: VALID_TIME, version: "test-1", status: "NOT_STARTED" }),
  );
  return { ...projected, ...overrides };
}

export function acceptedRecord(overrides: Partial<SliceRecord> = {}): SliceRecord {
  return validRecord({
    status: "ACCEPTED",
    commits: [VALID_COMMIT],
    evidence: [validEvidence()],
    acceptedAt: VALID_TIME,
    acceptedBy: "Named Reviewer",
    ...overrides,
  });
}

export function validProduct(overrides: Partial<Product> = {}): Product {
  return {
    code: "FOUNDATION",
    name: "Shared Foundation",
    route: "/programme",
    programmePurpose: "Programme model",
    canonicalSources: ["docs/control/PROGRAMME_ROADMAP.md"],
    dependencies: [],
    statusSource: "Evidence-derived SliceRecords",
    externalAuthorityRequirements: ["Independent and CEO gates"],
    implementationReality: "Validator package only",
    ...overrides,
  };
}

export function validPhase(overrides: Partial<Phase> = {}): Phase {
  return {
    id: "PH-FOUNDATION",
    order: 0,
    title: "Shared Foundation",
    products: ["FOUNDATION"],
    intent: "Programme model",
    executiveCriticalPath: true,
    ...overrides,
  };
}

export function validGate(overrides: Partial<Gate> = {}): Gate {
  return {
    id: "GATE-INDEPENDENT",
    product: "FOUNDATION",
    title: "Independent acceptance",
    status: "NOT_READY",
    authority: "Named independent reviewer",
    requiredEvidenceIds: [],
    ...overrides,
  };
}

export function validOpenItem(overrides: Partial<OpenItem> = {}): OpenItem {
  return {
    id: "OI-001",
    product: "FOUNDATION",
    sliceId: "MD-CT1",
    title: "Example open item",
    severity: "HIGH",
    owner: "AI CTO",
    status: "OPEN",
    blocker: false,
    evidence: [],
    ...overrides,
  };
}

export function foundationProgramme(options?: {
  manifests?: SliceManifest[];
  records?: SliceRecord[];
  products?: Product[];
  phases?: Phase[];
  gates?: Gate[];
  openItems?: OpenItem[];
}) {
  const manifests = options?.manifests ?? [
    smallestManifest({ id: "MD-CT0", title: "CT0", order: 1, dependsOn: [] }),
    validManifest({ dependsOn: ["MD-CT0"] }),
  ];
  const records =
    options?.records ??
    manifests.map((manifest) =>
      projectSliceRecord(
        manifest,
        emptyOperationalState({ updatedAt: VALID_TIME, version: "test-1" }),
      ),
    );
  return {
    products: options?.products ?? [validProduct()],
    phases: options?.phases ?? [validPhase()],
    manifests,
    records,
    gates: options?.gates ?? [validGate()],
    openItems: options?.openItems ?? [],
  };
}
