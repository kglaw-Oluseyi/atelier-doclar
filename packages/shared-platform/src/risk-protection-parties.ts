import { createHash } from "node:crypto";
import { PlatformError } from "./errors.js";
import { FIXTURE_IDS } from "./fixtures.js";
import type { PlatformSnapshot } from "./store.js";

export const RISK_PROTECTION_PARTY_KINDS = ["INSURER", "VENDOR"] as const;
export type RiskProtectionPartyKind = (typeof RISK_PROTECTION_PARTY_KINDS)[number];

export const FIXTURE_INSURER_PARTY_ID = "00000000-0000-4000-8000-000000000202";
export const FIXTURE_VENDOR_PARTY_ID = "00000000-0000-4000-8000-000000000201";

export type GovernedProtectionParty = {
  id: string;
  organisationId: string;
  kind: RiskProtectionPartyKind;
  label: string;
  disambiguation: string;
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function governedInsurerPartyId(organisationId: string): string {
  return deterministicUuid(`s05b.protection-party.insurer:${organisationId}`);
}

export function governedSecondaryInsurerPartyId(organisationId: string): string {
  return deterministicUuid(`s05b.protection-party.insurer.secondary:${organisationId}`);
}

export function governedVendorPartyId(organisationId: string): string {
  return deterministicUuid(`s05b.protection-party.vendor:${organisationId}`);
}

function orgLabel(snap: PlatformSnapshot, organisationId: string): string {
  return snap.organisations.find((item) => item.id === organisationId)?.displayName ?? "Organisation";
}

function catalogParties(snap: PlatformSnapshot, organisationId: string): GovernedProtectionParty[] {
  if (!snap.organisations.some((item) => item.id === organisationId)) return [];
  const house = orgLabel(snap, organisationId);
  const maison = organisationId === FIXTURE_IDS.orgMaison;
  const insurerId = maison ? FIXTURE_INSURER_PARTY_ID : governedInsurerPartyId(organisationId);
  const vendorId = maison ? FIXTURE_VENDOR_PARTY_ID : governedVendorPartyId(organisationId);
  return [
    {
      id: insurerId,
      organisationId,
      kind: "INSURER",
      label: "Synthetic Insurer",
      disambiguation: `${house} · governed fixture insurer`,
    },
    {
      id: governedSecondaryInsurerPartyId(organisationId),
      organisationId,
      kind: "INSURER",
      label: "Secondary Synthetic Cover",
      disambiguation: `${house} · additional fixture insurer`,
    },
    {
      id: vendorId,
      organisationId,
      kind: "VENDOR",
      label: "Synthetic Venue Contractor",
      disambiguation: `${house} · governed fixture vendor`,
    },
  ];
}

export function listGovernedProtectionParties(
  snap: PlatformSnapshot,
  organisationId: string,
  kind?: RiskProtectionPartyKind,
): GovernedProtectionParty[] {
  const catalog = catalogParties(snap, organisationId);
  const recorded: GovernedProtectionParty[] = [];
  if (!kind || kind === "INSURER") {
    for (const policy of snap.riskPolicies.filter((item) => item.organisationId === organisationId)) {
      if (catalog.some((item) => item.id === policy.insurerPartyId) || recorded.some((item) => item.id === policy.insurerPartyId)) {
        continue;
      }
      recorded.push({
        id: policy.insurerPartyId,
        organisationId,
        kind: "INSURER",
        label: policy.insurerLabel,
        disambiguation: `${orgLabel(snap, organisationId)} · recorded insurer`,
      });
    }
  }
  if (!kind || kind === "VENDOR") {
    for (const assessment of snap.riskVendorAssessments.filter((item) => item.organisationId === organisationId)) {
      if (catalog.some((item) => item.id === assessment.vendorId) || recorded.some((item) => item.id === assessment.vendorId)) {
        continue;
      }
      recorded.push({
        id: assessment.vendorId,
        organisationId,
        kind: "VENDOR",
        label: "Recorded vendor",
        disambiguation: `${orgLabel(snap, organisationId)} · recorded vendor`,
      });
    }
    for (const roster of snap.riskRosterAssignments.filter((item) => item.organisationId === organisationId)) {
      if (catalog.some((item) => item.id === roster.vendorId) || recorded.some((item) => item.id === roster.vendorId)) {
        continue;
      }
      recorded.push({
        id: roster.vendorId,
        organisationId,
        kind: "VENDOR",
        label: roster.vendorLabel,
        disambiguation: `${orgLabel(snap, organisationId)} · recorded roster vendor`,
      });
    }
  }
  const merged = [...catalog, ...recorded];
  const seen = new Set<string>();
  return merged.filter((item) => {
    if (kind && item.kind !== kind) return false;
    if (item.organisationId !== organisationId) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function findGovernedProtectionParty(
  snap: PlatformSnapshot,
  organisationId: string,
  partyId: string,
  kind?: RiskProtectionPartyKind,
): GovernedProtectionParty | undefined {
  return listGovernedProtectionParties(snap, organisationId, kind).find((item) => item.id === partyId);
}

export function assertGovernedProtectionParty(
  snap: PlatformSnapshot,
  organisationId: string,
  partyId: string,
  kind: RiskProtectionPartyKind,
): GovernedProtectionParty {
  const found = findGovernedProtectionParty(snap, organisationId, partyId, kind);
  if (!found) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      kind === "INSURER" ? "Choose an insurer from the governed party register." : "Choose a vendor from the governed party register.",
      {
        field: kind === "INSURER" ? "insurerPartyId" : "vendorId",
        publicMessage: "The submitted information is not valid.",
      },
    );
  }
  return found;
}
