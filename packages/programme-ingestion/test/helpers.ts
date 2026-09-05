import {
  createEngine,
  MemoryProgrammeStore,
  type DeclarationBaseline,
  type ProgrammeEngine,
} from "@maison-doclar/programme-domain";
import { AUTHORISED_REPOSITORY } from "../src/constants.js";
import { IngestionService } from "../src/ingest.js";
import { IngestionLedger } from "../src/ledger.js";
import type { LinkageCatalog } from "../src/linkage.js";
import type { CommitEvidence, WorkflowRunEvidence } from "../src/provider.js";
import { MemoryDeliveryStore } from "../src/replay.js";
import { computeGitHubSignature } from "../src/webhook.js";

export const NOW = "2026-09-05T09:00:00.000Z";
export const SECRET = "ct3-test-secret-must-not-appear-in-output";
export const SHA_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const SHA_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
export const SHA_C = "cccccccccccccccccccccccccccccccccccccccc";

export const TEST_CATALOG: LinkageCatalog = {
  slices: {
    "MD-AA": { id: "MD-AA", product: "FOUNDATION", promptControlIds: ["MD-PR-0099"] },
    "MD-CT3": { id: "MD-CT3", product: "FOUNDATION", promptControlIds: ["MD-PR-0004"] },
  },
};

export function testBaseline(): DeclarationBaseline {
  return {
    products: [
      {
        code: "FOUNDATION",
        name: "Foundation",
        route: "/programme",
        programmePurpose: "test",
        canonicalSources: ["docs/control/EXECUTION_COMPATIBILITY_REGISTER.md"],
        dependencies: [],
        statusSource: "events",
        externalAuthorityRequirements: ["CEO"],
        implementationReality: "test",
      },
    ],
    phases: [
      {
        id: "PH-FOUNDATION",
        order: 0,
        title: "Foundation",
        products: ["FOUNDATION"],
        intent: "test",
        executiveCriticalPath: true,
        slices: ["MD-AA", "MD-CT3"],
      },
    ],
    manifests: [
      {
        id: "MD-AA",
        product: "FOUNDATION",
        title: "Test slice",
        phaseId: "PH-FOUNDATION",
        order: 0,
        dependsOn: [],
        canonicalRefs: ["docs/control/EXECUTION_COMPATIBILITY_REGISTER.md"],
        outcome: "test",
        entryCriteria: [],
        exitCriteria: ["done"],
        expectedFiles: [],
        verification: ["tests"],
      },
      {
        id: "MD-CT3",
        product: "FOUNDATION",
        title: "CT3",
        phaseId: "PH-FOUNDATION",
        order: 1,
        dependsOn: [],
        canonicalRefs: ["docs/control/EXECUTION_COMPATIBILITY_REGISTER.md"],
        outcome: "ingestion",
        entryCriteria: [],
        exitCriteria: ["done"],
        expectedFiles: [],
        verification: ["tests"],
      },
    ],
    gates: [],
    openItems: [],
    decisions: [],
  };
}

export function testHarness() {
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, testBaseline(), NOW);
  const ledger = new IngestionLedger();
  const deliveries = new MemoryDeliveryStore();
  const service = new IngestionService({
    engine,
    catalog: TEST_CATALOG,
    ledger,
    deliveries,
    now: () => NOW,
    trustedRepository: AUTHORISED_REPOSITORY,
  });
  return { store, engine, ledger, deliveries, service };
}

export function linkedMessage(overrides?: { sliceId?: string; extra?: string }): string {
  return [
    "feat: implement slice",
    "",
    `Slice-ID: ${overrides?.sliceId ?? "MD-AA"}`,
    "Product: FOUNDATION",
    "Native-ID: AA",
    "Prompt-Control-ID: MD-PR-0099",
    overrides?.extra ?? "",
  ].join("\n");
}

export function commitEvidence(overrides: Partial<CommitEvidence> = {}): CommitEvidence {
  return {
    sha: SHA_A,
    message: linkedMessage(),
    timestamp: NOW,
    repository: AUTHORISED_REPOSITORY,
    ref: "refs/heads/main",
    authorName: "Implementer",
    ...overrides,
  };
}

export function runEvidence(overrides: Partial<WorkflowRunEvidence> = {}): WorkflowRunEvidence {
  return {
    runId: "1001",
    name: "programme-validate",
    sha: SHA_A,
    repository: AUTHORISED_REPOSITORY,
    ref: "main",
    status: "completed",
    conclusion: "success",
    htmlUrl: "https://github.com/kglaw-Oluseyi/atelier-doclar/actions/runs/1001",
    updatedAt: NOW,
    ...overrides,
  };
}

export function signedRequest(
  event: string,
  body: unknown,
  delivery: string,
  secret = SECRET,
  rawBody = JSON.stringify(body),
) {
  return {
    headers: {
      "X-Hub-Signature-256": computeGitHubSignature(rawBody, secret),
      "X-GitHub-Event": event,
      "X-GitHub-Delivery": delivery,
    },
    rawBody,
  };
}

export function statuses(engine: ProgrammeEngine) {
  const projection = engine.projectionAt();
  return Object.fromEntries(
    Object.entries(projection.slices).map(([id, facts]) => [
      id,
      {
        commits: facts.commits,
        checks: facts.checks.map((item) => item.result),
        review: facts.reviewRequested,
        accepted: Boolean(facts.acceptedAt),
      },
    ]),
  );
}
