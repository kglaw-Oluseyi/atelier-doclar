const BLOCKED = /secret|token|cookie|password|authorization|database_url|session/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = BLOCKED.test(key) ? "[redacted]" : redact(entry);
  }
  return output;
}
