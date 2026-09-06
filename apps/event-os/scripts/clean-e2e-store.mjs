import { unlink } from "node:fs/promises";
import { join } from "node:path";

const storePath = join(process.cwd(), "data", "event-os-non-production.json");

try {
  await unlink(storePath);
} catch (error) {
  if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ENOENT") {
    throw error;
  }
}
