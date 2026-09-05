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
  loadLinkageCatalog,
  type IngestionResult,
  type WebhookRequest,
} from "@maison-doclar/programme-ingestion";

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
