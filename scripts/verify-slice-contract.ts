import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "OBJ",
  "ACT",
  "CAP",
  "RULE",
  "DATA",
  "PERM",
  "AUD",
  "UI",
  "API",
  "INT",
  "NFR",
  "BLD",
  "TST",
  "JRN",
  "ACC",
  "DEP",
  "DEC",
  "AMB",
];
const fields = Array.from({ length: 30 }, (_, index) => `${index + 1}. `);

export function verifySliceContract(sliceDir = "docs/rebuild/eos-s01"): string[] {
  const errors: string[] = [];
  const registry = readFileSync(
    join(root, "docs/rebuild/templates/EOS_SLICE_TEMPLATE_REGISTRY.md"),
    "utf8",
  );
  const template = readFileSync(
    join(root, "docs/rebuild/templates/EOS_SLICE_BUILD_MASTER_TEMPLATE_v1.0.md"),
  );
  const templateChecksum = createHash("sha256").update(template).digest("hex");
  if (!registry.includes(templateChecksum))
    errors.push("template checksum is not the registered checksum");
  const contract = readFileSync(join(root, sliceDir, "EOS_S01_EXECUTABLE_CONTRACT.md"), "utf8");
  if (!contract.includes(templateChecksum))
    errors.push("slice contract template checksum does not match the registered template");
  for (const category of required) {
    if (!contract.includes(`## S01-${category}`)) errors.push(`missing category ${category}`);
  }
  const matrix = readFileSync(join(root, sliceDir, "EOS_S01_TRACEABILITY_MATRIX.md"), "utf8");
  const capabilities = [...contract.matchAll(/### (S01-CAP-\d+)/g)].map((match) => match[1] ?? "");
  if (capabilities.length === 0) errors.push("no capabilities");
  for (const id of capabilities) {
    const start = contract.indexOf(`### ${id}`);
    const next = contract.indexOf("\n### ", start + 4);
    const body = contract.slice(start, next === -1 ? contract.indexOf("\n## ", start + 4) : next);
    for (const field of fields) {
      if (!body.includes(field)) errors.push(`${id} missing field ${field}`);
    }
    if (!matrix.includes(`| ${id} |`)) errors.push(`${id} missing traceability row`);
    if (!body.includes("S01-BLD-")) errors.push(`${id} missing build unit`);
    if (!body.includes("S01-JRN-")) errors.push(`${id} missing journey`);
    if (!body.includes("packages/foundation/test")) errors.push(`${id} missing automated test`);
  }
  if (!contract.includes("Approved S01 technical debt") && !contract.includes("technical debt")) {
    errors.push("technical debt disclosure missing");
  }
  return errors;
}

if (process.argv[1]?.endsWith("verify-slice-contract.ts")) {
  const errors = verifySliceContract();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("slice contract verified");
}
