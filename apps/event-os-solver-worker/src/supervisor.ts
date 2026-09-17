/**
 * Long-lived supervisor stub (Checkpoint 1).
 * Does not listen on any HTTP port. Claims are stubbed; real PG queue is P2.
 */
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  // Intentionally no createServer / listen.
  console.error(
    JSON.stringify({
      service: "event-os-solver-worker",
      mode: "supervisor-stub",
      ingress: "none",
      listenPort: null,
      childScript: join(here, "../python/solver_child.py"),
      message: "Supervisor stub idle — PostgreSQL claim loop lands in P2",
    }),
  );
  // Keep process alive without binding a port (idle loop with signal handling).
  await new Promise<void>((resolve) => {
    const stop = () => resolve();
    process.on("SIGTERM", stop);
    process.on("SIGINT", stop);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
