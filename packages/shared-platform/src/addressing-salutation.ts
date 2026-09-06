import type { GuestAddressing, Honorific, UpdateGuestAddressingInput } from "./addressing-schemas.js";

export const SALUTATION_DECISIONS = ["RETAIN", "UPDATE"] as const;
export type SalutationDecision = (typeof SALUTATION_DECISIONS)[number];

export interface SalutationTitleMismatch {
  formerTitles: string[];
}

function optionalTitle(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function addressingTitles(addressing: Pick<GuestAddressing, "honorific" | "professionalTitle" | "traditionalTitle"> | undefined): string[] {
  if (!addressing) return [];
  return [addressing.honorific, addressing.professionalTitle, addressing.traditionalTitle]
    .map((item) => optionalTitle(item))
    .filter((item): item is string => Boolean(item));
}

export function proposedAddressingTitles(
  previous: GuestAddressing | undefined,
  input: Pick<UpdateGuestAddressingInput, "honorific" | "clearHonorific" | "professionalTitle" | "traditionalTitle">,
): string[] {
  const honorific = input.clearHonorific ? undefined : ((input.honorific as Honorific | undefined) ?? previous?.honorific);
  const professionalTitle =
    input.professionalTitle !== undefined ? optionalTitle(input.professionalTitle) : previous?.professionalTitle;
  const traditionalTitle =
    input.traditionalTitle !== undefined ? optionalTitle(input.traditionalTitle) : previous?.traditionalTitle;
  return addressingTitles({ honorific, professionalTitle, traditionalTitle });
}

export function titleAppearsInSalutation(salutation: string, title: string): boolean {
  const phrase = title.trim();
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[\\s,;:'"“”])${escaped}($|[\\s,;.])`, "iu").test(salutation);
}

export function detectSalutationTitleMismatch(input: {
  previousTitles: readonly string[];
  nextTitles: readonly string[];
  salutation?: string;
}): SalutationTitleMismatch | undefined {
  const salutation = optionalTitle(input.salutation);
  if (!salutation) return undefined;
  const next = new Set(input.nextTitles.map((item) => item.toLocaleLowerCase()));
  const formerTitles = input.previousTitles.filter((title) => {
    if (next.has(title.toLocaleLowerCase())) return false;
    return titleAppearsInSalutation(salutation, title);
  });
  if (formerTitles.length === 0) return undefined;
  return { formerTitles };
}
