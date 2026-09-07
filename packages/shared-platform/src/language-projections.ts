import { LANGUAGE_REGISTER, type LANGUAGE_TAGS as LanguageTags } from "./constants.js";
import type { PermissionKey } from "./schemas.js";
import type { ContentBlock, ContentEdition, ContentWork, CulturalSourceText, LanguageProfile, RecipientAssembly } from "./language-schemas.js";
import { languageRegisterEntry } from "./language-operations.js";
import type { PlatformSnapshot } from "./store.js";

export interface LanguageCapabilities {
  canViewPreference: boolean;
  canManagePreference: boolean;
  canCreateCultural: boolean;
  canReviewCultural: boolean;
  canApproveCultural: boolean;
  canCreateTranslation: boolean;
  canReviewTranslation: boolean;
  canApproveTranslation: boolean;
  canManageEdition: boolean;
  canPublishEdition: boolean;
  canPreviewAssembly: boolean;
  canManageGlossary: boolean;
  canAudit: boolean;
}

export function languagePermissionAllowed(keys: readonly PermissionKey[]): LanguageCapabilities {
  return {
    canViewPreference: keys.includes("language.preference.view"),
    canManagePreference: keys.includes("language.preference.manage"),
    canCreateCultural: keys.includes("language.cultural.create"),
    canReviewCultural: keys.includes("language.cultural.review"),
    canApproveCultural: keys.includes("language.cultural.approve"),
    canCreateTranslation: keys.includes("language.translation.create"),
    canReviewTranslation: keys.includes("language.translation.review"),
    canApproveTranslation: keys.includes("language.translation.approve"),
    canManageEdition: keys.includes("language.edition.manage"),
    canPublishEdition: keys.includes("language.edition.publish"),
    canPreviewAssembly: keys.includes("language.assembly.preview"),
    canManageGlossary: keys.includes("language.glossary.manage"),
    canAudit: keys.includes("language.audit.view"),
  };
}

export function languagePermissionKeysFromCapabilities(capabilities: LanguageCapabilities): PermissionKey[] {
  const pairs: Array<[keyof LanguageCapabilities, PermissionKey]> = [
    ["canViewPreference", "language.preference.view"],
    ["canManagePreference", "language.preference.manage"],
    ["canCreateCultural", "language.cultural.create"],
    ["canReviewCultural", "language.cultural.review"],
    ["canApproveCultural", "language.cultural.approve"],
    ["canCreateTranslation", "language.translation.create"],
    ["canReviewTranslation", "language.translation.review"],
    ["canApproveTranslation", "language.translation.approve"],
    ["canManageEdition", "language.edition.manage"],
    ["canPublishEdition", "language.edition.publish"],
    ["canPreviewAssembly", "language.assembly.preview"],
    ["canManageGlossary", "language.glossary.manage"],
    ["canAudit", "language.audit.view"],
  ];
  return pairs.filter(([key]) => capabilities[key]).map(([, permission]) => permission);
}

export interface LanguagePreferenceCard {
  guestId: string;
  displayName: string;
  preferredLanguageTag?: (typeof LanguageTags)[number];
  preferredLanguageName?: string;
  unknown: boolean;
  source: string;
  version: number;
}

export interface CulturalTextCard {
  id: string;
  exactText: string;
  languageTag: string;
  languageName: string;
  htmlLang: string;
  purpose: string;
  status: string;
  syntheticUnvalidated: boolean;
  culturallyAuthoritative: boolean;
  version: number;
}

export interface EditionCard {
  id: string;
  workId: string;
  workTitle: string;
  languageTag: string;
  languageName: string;
  htmlLang: string;
  kind: string;
  status: string;
  coverageStatus: string;
  reviewRequired: boolean;
  syntheticUnvalidated: boolean;
  version: number;
  blocks: readonly { id: string; languageTag: string; htmlLang: string; purpose: string; exactText: string }[];
}

export interface CoverageCard {
  workId: string;
  workTitle: string;
  coverageStatus: string;
  unresolvedPreferenceCount: number;
  mixedFallbackCount: number;
  explanation: string;
}

export interface AssemblyPreviewCard {
  id: string;
  guestId: string;
  displayName: string;
  requestedLanguageTag?: string;
  selectedLanguageTag: string;
  selectedLanguageName: string;
  fallbackUsed: boolean;
  readyForCommsReview: true;
  dispatched: false;
  providerInvoked: false;
  status: string;
  units: RecipientAssembly["units"];
}

export interface HostMultilingualEditionView {
  workTitle: string;
  languageTag: string;
  languageName: string;
  htmlLang: string;
  blocks: readonly { languageTag: string; htmlLang: string; text: string; fallbackUsed: boolean }[];
  syntheticUnvalidated: true;
  culturallyAuthoritative: false;
}

export interface EventLanguageWorkspace {
  eventId: string;
  eventName: string;
  englishConvention: "en-GB" | "en-US";
  register: typeof LANGUAGE_REGISTER;
  preferences: readonly LanguagePreferenceCard[];
  culturalTexts: readonly CulturalTextCard[];
  works: readonly ContentWork[];
  editions: readonly EditionCard[];
  coverage: readonly CoverageCard[];
  assemblies: readonly AssemblyPreviewCard[];
  glossary: readonly { id: string; term: string; approvedDisplayForm: string; policy: string; languageTag: string }[];
  history: readonly { id: string; guestId: string; previousUnknown: boolean; nextUnknown: boolean; nextLanguageTag?: string; reason: string }[];
  capabilities: LanguageCapabilities;
}

function guestDisplayName(snap: PlatformSnapshot, guestId: string): string {
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  const given = guest?.givenName.value ?? "";
  const family = guest?.familyName.value ?? "";
  return [given, family].filter(Boolean).join(" ") || "Named guest";
}

function editionCard(snap: PlatformSnapshot, edition: ContentEdition, work: ContentWork): EditionCard {
  const language = languageRegisterEntry(edition.languageTag);
  const blocks = snap.contentBlocks
    .filter((item) => item.editionId === edition.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  return {
    id: edition.id,
    workId: work.id,
    workTitle: work.title,
    languageTag: edition.languageTag,
    languageName: language.displayName,
    htmlLang: language.htmlLang,
    kind: edition.kind,
    status: edition.status,
    coverageStatus: edition.coverageStatus,
    reviewRequired: edition.reviewRequired,
    syntheticUnvalidated: edition.syntheticUnvalidated,
    version: edition.version,
    blocks: blocks.map((block) => ({
      id: block.id,
      languageTag: block.languageTag,
      htmlLang: languageRegisterEntry(block.languageTag).htmlLang,
      purpose: block.purpose,
      exactText: block.exactText,
    })),
  };
}

export function buildEventLanguageWorkspace(
  snap: PlatformSnapshot,
  eventId: string,
  permissionKeys: readonly PermissionKey[],
): EventLanguageWorkspace | undefined {
  const event = snap.events.find((item) => item.id === eventId);
  if (!event) return undefined;
  const capabilities = languagePermissionAllowed(permissionKeys);
  const works = snap.contentWorks.filter((item) => item.eventId === eventId);
  const editions = snap.contentEditions
    .filter((item) => item.eventId === eventId)
    .map((edition) => {
      const work = works.find((item) => item.id === edition.workId);
      return work ? editionCard(snap, edition, work) : undefined;
    })
    .filter((item): item is EditionCard => Boolean(item));
  const preferences = snap.operationalGuests
    .filter((guest) => guest.eventId === eventId)
    .map((guest) => {
      const profile = snap.languageProfiles.find((item) => item.guestId === guest.id && item.eventId === eventId);
      return {
        guestId: guest.id,
        displayName: guestDisplayName(snap, guest.id),
        preferredLanguageTag: profile?.preferredLanguageTag,
        preferredLanguageName: profile?.preferredLanguageTag ? languageRegisterEntry(profile.preferredLanguageTag).displayName : undefined,
        unknown: profile ? profile.unknown : true,
        source: profile?.source ?? "UNKNOWN",
        version: profile?.version ?? 1,
      };
    });
  const culturalTexts = snap.culturalSourceTexts
    .filter((item) => item.eventId === eventId)
    .map((item) => ({
      id: item.id,
      exactText: item.exactText,
      languageTag: item.languageTag,
      languageName: languageRegisterEntry(item.languageTag).displayName,
      htmlLang: languageRegisterEntry(item.languageTag).htmlLang,
      purpose: item.purpose,
      status: item.status,
      syntheticUnvalidated: item.syntheticUnvalidated,
      culturallyAuthoritative: item.culturallyAuthoritative,
      version: item.version,
    }));
  const coverage = works.map((work) => {
    const workEditions = snap.contentEditions.filter((item) => item.workId === work.id);
    const approvedComplete = workEditions.filter((item) => item.status === "APPROVED" && item.kind === "COMPLETE").length;
    const partial = workEditions.some((item) => item.coverageStatus === "PARTIAL" || item.kind === "PARTIAL");
    const stale = workEditions.some((item) => item.coverageStatus === "STALE");
    const unresolved = preferences.filter((item) => item.unknown).length;
    return {
      workId: work.id,
      workTitle: work.title,
      coverageStatus: stale ? "STALE" : approvedComplete > 0 && !partial ? "APPROVED" : partial ? "PARTIAL" : "NOT_STARTED",
      unresolvedPreferenceCount: unresolved,
      mixedFallbackCount: workEditions.filter((item) => item.kind === "PARTIAL" || item.kind === "BILINGUAL").length,
      explanation: stale
        ? "A source change made at least one translation stale. Re-review is required."
        : approvedComplete > 0
          ? "Approved complete editions exist. Partial editions remain marked partial."
          : "Translation has not reached a complete approved edition.",
    };
  });
  const assemblies = capabilities.canPreviewAssembly
    ? snap.recipientAssemblies
        .filter((item) => item.eventId === eventId)
        .map((item) => ({
          id: item.id,
          guestId: item.guestId,
          displayName: item.addressingDisplayName,
          requestedLanguageTag: item.requestedLanguageTag,
          selectedLanguageTag: item.selectedLanguageTag,
          selectedLanguageName: languageRegisterEntry(item.selectedLanguageTag).displayName,
          fallbackUsed: item.units.some((unit) => unit.fallbackUsed),
          readyForCommsReview: true as const,
          dispatched: false as const,
          providerInvoked: false as const,
          status: item.status,
          units: item.units,
        }))
    : [];
  return {
    eventId,
    eventName: event.name,
    englishConvention: "en-GB",
    register: LANGUAGE_REGISTER,
    preferences,
    culturalTexts,
    works,
    editions,
    coverage,
    assemblies,
    glossary: snap.terminologyEntries
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        term: item.term,
        approvedDisplayForm: item.approvedDisplayForm,
        policy: item.policy,
        languageTag: item.languageTag,
      })),
    history: capabilities.canAudit
      ? snap.languagePreferenceHistories
          .filter((item) => item.eventId === eventId)
          .map((item) => ({
            id: item.id,
            guestId: item.guestId,
            previousUnknown: item.previousUnknown,
            nextUnknown: item.nextUnknown,
            nextLanguageTag: item.nextLanguageTag,
            reason: item.reason,
          }))
      : [],
    capabilities,
  };
}

export function buildHostMultilingualEdition(
  snap: PlatformSnapshot,
  eventId: string,
): HostMultilingualEditionView | undefined {
  const work = snap.contentWorks.find((item) => item.eventId === eventId && item.hostFacing && item.currentEditionId);
  if (!work?.currentEditionId) return undefined;
  const edition = snap.contentEditions.find((item) => item.id === work.currentEditionId && item.status === "APPROVED");
  if (!edition) return undefined;
  const language = languageRegisterEntry(edition.languageTag);
  const blocks = snap.contentBlocks
    .filter((item) => item.editionId === edition.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  return {
    workTitle: work.title,
    languageTag: edition.languageTag,
    languageName: language.displayName,
    htmlLang: language.htmlLang,
    blocks: blocks.map((block) => ({
      languageTag: block.languageTag,
      htmlLang: languageRegisterEntry(block.languageTag).htmlLang,
      text: block.exactText,
      fallbackUsed: block.languageTag !== edition.languageTag,
    })),
    syntheticUnvalidated: true,
    culturallyAuthoritative: false,
  };
}

export type { ContentBlock, ContentWork, CulturalSourceText, LanguageProfile };
