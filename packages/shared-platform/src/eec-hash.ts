import { createHash } from "node:crypto";
import { PlatformError } from "./errors.js";

const GOVERNING_CONFIRMATION = new Set(["CLIENT_CONFIRMED", "GOVERNING"]);

export function nfc(value: string): string {
  return value.normalize("NFC");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const mapped = value.map(sortValue);
    if (mapped.every((item) => typeof item === "string")) {
      return [...mapped].sort((a, b) => String(a).localeCompare(String(b)));
    }
    return mapped;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }
  if (typeof value === "string") return nfc(value);
  return value;
}

export function exactHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function moneyFromDto(dto: { currency: string; minor: string }): { currency: string; minor: bigint } {
  return { currency: dto.currency, minor: BigInt(dto.minor) };
}

export function moneyToDto(money: { currency: string; minor: bigint }): { currency: string; minor: string } {
  return { currency: money.currency, minor: money.minor.toString() };
}

export function addMoney(
  left: { currency: string; minor: bigint },
  right: { currency: string; minor: bigint },
): { currency: string; minor: bigint } {
  if (left.currency !== right.currency) {
    throw new Error("cross-currency aggregation requires an explicit FX conversion record");
  }
  return { currency: left.currency, minor: left.minor + right.minor };
}

export function assertHumanConfirmation(actorKind: string | undefined, confirmationState: string): void {
  if (actorKind === "AI" && GOVERNING_CONFIRMATION.has(confirmationState)) {
    throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "AI-origin commands cannot select CLIENT_CONFIRMED or GOVERNING");
  }
}

export function fieldSizeOk(value: string, max: number): boolean {
  return nfc(value).length <= max;
}
