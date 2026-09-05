import { createHash } from "node:crypto";

const SECRET_KEY = /(password|token|cookie|secret|authorization|session|credential|private[_-]?key)/i;

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SECRET_KEY.test(key) ? "[REDACTED]" : redactValue(nested);
    }
    return out;
  }
  return value;
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(redactValue(value))).digest("hex");
}

export function assertNoSecrets(text: string): void {
  if (SECRET_KEY.test(text) && /(eyJ|[A-Za-z0-9+/]{24,}={0,2})/.test(text)) {
    throw new Error("potential secret material must not be logged");
  }
}
