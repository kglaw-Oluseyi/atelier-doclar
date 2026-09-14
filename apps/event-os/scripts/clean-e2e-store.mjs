import { unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(new URL(".", import.meta.url)));
const paths = [
  join(appRoot, "data", "event-os-non-production.json"),
  join(appRoot, "data", "event-os-non-production.seating-v2.json"),
  join(appRoot, "data", "event-os-non-production.seating-v2.json.lock"),
  join(appRoot, "data", "academy-s04a.json"),
  join(process.cwd(), "data", "event-os-non-production.json"),
  join(process.cwd(), "data", "event-os-non-production.seating-v2.json"),
  join(process.cwd(), "data", "event-os-non-production.seating-v2.json.lock"),
  join(process.cwd(), "data", "academy-s04a.json"),
];

const unique = [...new Set(paths)];
for (const storePath of unique) {
  try {
    await unlink(storePath);
    console.log(`e2e-store cleaned ${storePath}`);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ENOENT") {
      throw error;
    }
  }
}
