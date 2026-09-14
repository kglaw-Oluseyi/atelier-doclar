import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

function isAllowedTempStorePath(resolved: string): boolean {
  const roots = [tmpdir(), "/tmp", process.env.TMPDIR]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => resolve(value));
  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${sep}`));
}

/**
 * Local checkpoint runs may point the non-production file store at an OS temp path.
 * Refused in production, without fixtures, with DATABASE_URL, or outside temp roots.
 */
export function resolveNonProductionStorePath(input: {
  override?: string;
  cwd?: string;
  nodeEnv?: string;
  fixturesAllowed: boolean;
  databaseUrl?: string;
}): string {
  const fallback = join(input.cwd ?? process.cwd(), "data", "event-os-non-production.json");
  const override = input.override?.trim();
  if (!override) return fallback;
  if ((input.nodeEnv ?? process.env.NODE_ENV) === "production") {
    throw new Error("EVENT_OS_NON_PRODUCTION_STORE_PATH is refused in production");
  }
  if (!input.fixturesAllowed) {
    throw new Error("EVENT_OS_NON_PRODUCTION_STORE_PATH requires EVENT_OS_ALLOW_FIXTURES=1");
  }
  if (input.databaseUrl?.trim()) {
    throw new Error("EVENT_OS_NON_PRODUCTION_STORE_PATH cannot be combined with DATABASE_URL");
  }
  const resolved = resolve(override);
  if (!isAllowedTempStorePath(resolved)) {
    throw new Error("EVENT_OS_NON_PRODUCTION_STORE_PATH must resolve under the OS temporary directory");
  }
  return resolved;
}
