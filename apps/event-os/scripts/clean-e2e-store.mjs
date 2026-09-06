import { unlink } from "node:fs/promises";
import { join } from "node:path";

const paths = [
  join(process.cwd(), "data", "event-os-non-production.json"),
  join(process.cwd(), "data", "academy-s04a.json"),
];

for (const storePath of paths) {
  try {
    await unlink(storePath);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ENOENT") {
      throw error;
    }
  }
}
