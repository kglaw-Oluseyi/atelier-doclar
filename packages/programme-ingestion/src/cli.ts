import {
  CORPUS_SEED_TIME,
  corpusSeedEvents,
  createEngine,
  loadCorpusBaseline,
  MemoryProgrammeStore,
} from "@maison-doclar/programme-domain";
import { loadLinkageCatalog } from "./catalog.js";
import { AUTHORISED_REPOSITORY, CT3_TRACEABILITY, SYNTHETIC_WEBHOOK_SECRET } from "./constants.js";
import { IngestionError } from "./errors.js";
import { IngestionService } from "./ingest.js";
import { IngestionLedger } from "./ledger.js";
import { MemoryDeliveryStore } from "./replay.js";
import { createLiveGitHubProvider } from "./github-http.js";
import { SyntheticEvidenceProvider } from "./synthetic-provider.js";
import { assertSecretNotLeaked, computeGitHubSignature } from "./webhook.js";

function parseArgs(argv: string[]): { command: "verify" | "reconcile"; live: boolean } {
  let command: "verify" | "reconcile" = "verify";
  let live = false;
  for (const arg of argv) {
    if (arg === "verify" || arg === "reconcile") command = arg;
    if (arg === "--live") live = true;
  }
  return { command, live };
}

function createService() {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of corpusSeedEvents()) engine.append(event);
  return {
    store,
    engine,
    service: new IngestionService({
      engine,
      catalog: loadLinkageCatalog(),
      ledger: new IngestionLedger(),
      deliveries: new MemoryDeliveryStore(),
      now: () => "2026-09-05T09:00:00.000Z",
      trustedRepository: AUTHORISED_REPOSITORY,
    }),
  };
}

async function runVerify(): Promise<number> {
  const { service } = createService();
  const secret = SYNTHETIC_WEBHOOK_SECRET;
  const body = JSON.stringify({
    zen: "CT3 verify",
    repository: { full_name: AUTHORISED_REPOSITORY },
  });
  const webhook = service.handleWebhook(
    {
      headers: {
        "X-Hub-Signature-256": computeGitHubSignature(body, secret),
        "X-GitHub-Event": "ping",
        "X-GitHub-Delivery": "00000000-0000-4000-8000-000000000001",
      },
      rawBody: body,
    },
    secret,
  );
  const reconciliation = await service.reconcile(new SyntheticEvidenceProvider());
  const lines = [
    "PROGRAMME INGEST VERIFY PASS",
    `product=${CT3_TRACEABILITY.product}`,
    `prompt_control_id=${CT3_TRACEABILITY.promptControlId}`,
    `native_id=${CT3_TRACEABILITY.nativeId}`,
    `slice_id=${CT3_TRACEABILITY.sliceId}`,
    `webhook=${webhook.kind}`,
    `reconcile=${reconciliation.kind}`,
    `freshness=${service.freshness().state}`,
    `source=${AUTHORISED_REPOSITORY}`,
    "",
  ].join("\n");
  assertSecretNotLeaked(lines, secret);
  process.stdout.write(lines);
  return webhook.ok && reconciliation.ok ? 0 : 1;
}

async function runReconcile(live: boolean): Promise<number> {
  if (live && process.env.PROGRAMME_GITHUB_LIVE !== "1") {
    process.stderr.write("LIVE_MODE_DISABLED: live GitHub reconciliation requires PROGRAMME_GITHUB_LIVE=1\n");
    return 1;
  }
  const { service } = createService();
  const provider = live ? createLiveGitHubProvider() : new SyntheticEvidenceProvider();
  return service.reconcile(provider).then((outcome) => {
    const lines = [
      outcome.ok ? "PROGRAMME RECONCILE PASS" : "PROGRAMME RECONCILE FAIL",
      `product=${CT3_TRACEABILITY.product}`,
      `prompt_control_id=${CT3_TRACEABILITY.promptControlId}`,
      `native_id=${CT3_TRACEABILITY.nativeId}`,
      `slice_id=${CT3_TRACEABILITY.sliceId}`,
      `mode=${live ? "live" : "synthetic"}`,
      `kind=${outcome.kind}`,
      `events_appended=${outcome.eventsAppended}`,
      `duplicates=${outcome.duplicates}`,
      `quarantined=${outcome.quarantined}`,
      `freshness=${service.freshness().state}`,
      "",
    ].join("\n");
    process.stdout.write(lines);
    return outcome.ok ? 0 : 1;
  });
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const { command, live } = parseArgs(argv);
  if (live && command !== "reconcile") {
    throw new IngestionError("LIVE_MODE_DISABLED", "live mode is not available for verify");
  }
  if (command === "reconcile") return runReconcile(live);
  return runVerify();
}

const invokedDirectly = process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js");
if (invokedDirectly) {
  Promise.resolve(runCli()).then((code) => {
    process.exitCode = code;
  });
}
