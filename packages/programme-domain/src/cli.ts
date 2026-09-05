import { CT1_TRACEABILITY, CT2_TRACEABILITY } from "./constants.js";
import { createEngine } from "./engine.js";
import { formatError } from "./errors.js";
import { stableJson } from "./normalize.js";
import { CORPUS_SEED_TIME, corpusSeedEvents, loadCorpusBaseline } from "./seed.js";
import { MemoryProgrammeStore, PERSISTENCE_CONTRACT } from "./store.js";
import { validateProgrammeCorpus } from "./validate.js";

function parseArgs(argv: string[]): {
  command: "validate" | "project";
  root?: string;
  json: boolean;
} {
  let command: "validate" | "project" = "validate";
  let root: string | undefined;
  let json = false;
  const rest: string[] = [];
  for (const arg of argv) {
    if (arg === "validate" || arg === "project") {
      command = arg;
    } else {
      rest.push(arg);
    }
  }
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--json") json = true;
    else if (arg === "--root") {
      root = rest[i + 1];
      i += 1;
    }
  }
  return { command, root, json };
}

function runValidate(root: string | undefined, json: boolean): number {
  const result = validateProgrammeCorpus(root);
  if (json) {
    process.stdout.write(
      stableJson({
        ok: result.ok,
        traceability: result.traceability,
        stats: result.stats,
        errors: result.errors,
        normalised: result.normalised,
      }),
    );
  } else if (result.ok) {
    process.stdout.write(
      [
        "PROGRAMME VALIDATION PASS",
        `product=${CT1_TRACEABILITY.product}`,
        `prompt_control_id=${CT1_TRACEABILITY.promptControlId}`,
        `native_id=${CT1_TRACEABILITY.nativeId}`,
        `slice_id=${CT1_TRACEABILITY.sliceId}`,
        `products=${result.stats.products}`,
        `phases=${result.stats.phases}`,
        `slices=${result.stats.slices}`,
        `records=${result.stats.records}`,
        `dependencies=${result.stats.dependencies}`,
        `yaml_manifests=${result.stats.yamlManifests ?? 0}`,
        `discovered_files=${result.stats.discoveredFiles ?? 0}`,
        `gates=${result.stats.gates}`,
        `open_items=${result.stats.openItems}`,
        `cycles=${result.stats.cycles}`,
        `verdict=${result.stats.verdict}`,
        "",
      ].join("\n"),
    );
  } else {
    process.stderr.write("PROGRAMME VALIDATION FAIL\n");
    for (const error of result.errors) {
      process.stderr.write(`${formatError(error)}\n`);
    }
  }
  return result.ok ? 0 : 1;
}

function runProject(root: string | undefined, json: boolean): number {
  const { baseline } = loadCorpusBaseline(root);
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of corpusSeedEvents()) {
    engine.append(event);
  }
  const view = engine.currentView({
    snapshotId: "SNAP-CT2-CORPUS",
    generatedAt: CORPUS_SEED_TIME,
    source: "corpus-seed",
  });
  const accepted = Object.values(view.statuses).filter((status) => status === "ACCEPTED").length;
  if (json) {
    process.stdout.write(
      stableJson({
        ok: true,
        traceability: CT2_TRACEABILITY,
        persistence: PERSISTENCE_CONTRACT,
        eventCount: store.eventCount(),
        statuses: view.statuses,
        outstanding: view.outstanding,
        snapshot: view,
      }),
    );
  } else {
    process.stdout.write(
      [
        "PROGRAMME PROJECTION PASS",
        `product=${CT2_TRACEABILITY.product}`,
        `prompt_control_id=${CT2_TRACEABILITY.promptControlId}`,
        `native_id=${CT2_TRACEABILITY.nativeId}`,
        `slice_id=${CT2_TRACEABILITY.sliceId}`,
        `events=${store.eventCount()}`,
        `slices=${view.slices.length}`,
        `accepted=${accepted}`,
        `outstanding_unaccepted=${view.outstanding.unacceptedMandatorySlices.length}`,
        `unlocked_unaccepted=${view.outstanding.unlockedUnacceptedSlices.length}`,
        `blocked=${view.outstanding.blockedSlices.length}`,
        `percentage=${view.outstanding.percentage.available ? String(view.outstanding.percentage.value) : "UNAVAILABLE"}`,
        `store=${PERSISTENCE_CONTRACT.localAdapterStatus}`,
        `production_db=${PERSISTENCE_CONTRACT.productionDatabaseDecision}`,
        `MD-B0=${view.statuses["MD-B0"] ?? "-"}`,
        `MD-CT0=${view.statuses["MD-CT0"] ?? "-"}`,
        `MD-CT1=${view.statuses["MD-CT1"] ?? "-"}`,
        `MD-CT2=${view.statuses["MD-CT2"] ?? "-"}`,
        `MD-CT3=${view.statuses["MD-CT3"] ?? "-"}`,
        `MD-CT4=${view.statuses["MD-CT4"] ?? "-"}`,
        `MD-CT5=${view.statuses["MD-CT5"] ?? "-"}`,
        `MD-CT6=${view.statuses["MD-CT6"] ?? "-"}`,
        `MD-CT7=${view.statuses["MD-CT7"] ?? "-"}`,
        `MD-CT8=${view.statuses["MD-CT8"] ?? "-"}`,
        `MD-CT9=${view.statuses["MD-CT9"] ?? "-"}`,
        `MD-FC1=${view.statuses["MD-FC1"] ?? "-"}`,
        `MD-LV1=${view.statuses["MD-LV1"] ?? "-"}`,
        `MD-HV1=${view.statuses["MD-HV1"] ?? "-"}`,
        "",
      ].join("\n"),
    );
  }
  return 0;
}

export function runCli(argv = process.argv.slice(2)): number {
  const { command, root, json } = parseArgs(argv);
  if (command === "project") return runProject(root, json);
  return runValidate(root, json);
}

const invokedDirectly = process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js");
if (invokedDirectly) {
  process.exitCode = runCli();
}
