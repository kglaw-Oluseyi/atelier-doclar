import { join } from "node:path";
import {
  CORPUS_SEED_TIME,
  corpusSeedEvents,
  createEngine,
  FilesystemProgrammeStore,
  loadCorpusBaseline,
} from "@maison-doclar/programme-domain";
import {
  AUTHORISED_REPOSITORY,
  FileDeliveryStore,
  IngestionLedger,
  IngestionService,
  MemoryDeliveryStore,
  loadLinkageCatalog,
  type IngestionResult,
  type WebhookRequest,
} from "@maison-doclar/programme-ingestion";
import { getDeliveries, getLiveRuntime, persistNewEvents, usesProductionPersistence } from "./runtime";

export function webhookSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.PROGRAMME_GITHUB_WEBHOOK_SECRET;
}

export function processProgrammeWebhook(
  request: WebhookRequest,
  secret: string,
  dataDir = process.env.PROGRAMME_DATA_DIR ?? join(process.cwd(), "data"),
): IngestionResult {
  const { baseline } = loadCorpusBaseline();
  const store = new FilesystemProgrammeStore(join(dataDir, "programme"));
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  if (store.eventCount() === 0) {
    for (const event of corpusSeedEvents()) engine.append(event);
  }
  const service = new IngestionService({
    engine,
    catalog: loadLinkageCatalog(),
    ledger: new IngestionLedger(),
    deliveries: new FileDeliveryStore(join(dataDir, "deliveries.json")),
    now: () => new Date().toISOString(),
    trustedRepository: AUTHORISED_REPOSITORY,
  });
  return service.handleWebhook(request, secret);
}

export async function handleProgrammeWebhook(
  request: WebhookRequest,
  secret: string,
  dataDir = process.env.PROGRAMME_DATA_DIR ?? join(process.cwd(), "data"),
): Promise<IngestionResult> {
  if (!usesProductionPersistence()) {
    return processProgrammeWebhook(request, secret, dataDir);
  }
  const live = await getLiveRuntime();
  if (!live) {
    return {
      ok: false,
      kind: "rejected",
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
      message: "live persistence is unavailable",
      eventsAppended: 0,
      duplicates: 0,
      quarantined: 0,
      unlinked: false,
    };
  }
  const journal = await getDeliveries();
  const known = journal ? await journal.list() : [];
  const deliveries = new MemoryDeliveryStore();
  for (const id of known) deliveries.remember(id);
  const pending: string[] = [];
  const service = new IngestionService({
    engine: live.engine,
    catalog: loadLinkageCatalog(),
    ledger: new IngestionLedger(),
    deliveries: {
      has: (id) => deliveries.has(id),
      remember: (id) => {
        deliveries.remember(id);
        pending.push(id);
      },
    },
    now: () => new Date().toISOString(),
    trustedRepository: AUTHORISED_REPOSITORY,
  });
  const before = live.memory.eventCount();
  const result = service.handleWebhook(request, secret);
  await persistNewEvents(before);
  if (journal) {
    for (const id of pending) await journal.remember(id);
  }
  return result;
}
