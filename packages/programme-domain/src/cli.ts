import { CT1_TRACEABILITY } from "./constants.js";
import { formatError } from "./errors.js";
import { stableJson } from "./normalize.js";
import { validateProgrammeCorpus } from "./validate.js";

function parseArgs(argv: string[]): { root?: string; json: boolean } {
  let root: string | undefined;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--root") {
      root = argv[i + 1];
      i += 1;
    }
  }
  return { root, json };
}

export function runCli(argv = process.argv.slice(2)): number {
  const { root, json } = parseArgs(argv);
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

const invokedDirectly = process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js");
if (invokedDirectly) {
  process.exitCode = runCli();
}
