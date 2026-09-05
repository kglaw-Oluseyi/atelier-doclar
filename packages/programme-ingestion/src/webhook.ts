import { createHmac, timingSafeEqual } from "node:crypto";
import { IngestionError } from "./errors.js";

const SIGNATURE_PREFIX = "sha256=";

export function computeGitHubSignature(rawBody: string, secret: string): string {
  return SIGNATURE_PREFIX + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

/**
 * GitHub webhook HMAC-SHA256 verification (`X-Hub-Signature-256`).
 * Uses the raw body. Never logs the secret.
 */
export function verifyGitHubSignature(input: {
  rawBody: string;
  signatureHeader: string | undefined;
  secret: string;
}): void {
  const header = input.signatureHeader?.trim();
  if (!header) {
    throw new IngestionError("MISSING_SIGNATURE", "webhook signature header is missing", "X-Hub-Signature-256");
  }
  if (!header.startsWith(SIGNATURE_PREFIX) || header.length <= SIGNATURE_PREFIX.length) {
    throw new IngestionError("MALFORMED_SIGNATURE", "webhook signature header is malformed", "X-Hub-Signature-256");
  }
  const expected = computeGitHubSignature(input.rawBody, input.secret);
  if (!safeEqual(header, expected)) {
    throw new IngestionError("INVALID_SIGNATURE", "webhook signature is invalid", "X-Hub-Signature-256");
  }
}

export function assertSecretNotLeaked(output: string, secret: string): void {
  if (secret.length > 0 && output.includes(secret)) {
    throw new Error("webhook secret leaked into output");
  }
}
