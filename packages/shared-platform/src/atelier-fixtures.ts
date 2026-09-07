import { ATELIER_CHAPTER_TYPES, SCHEMA_VERSION } from "./constants.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { S04B_FIXTURE_IDS } from "./programme-fixtures.js";
import type { PlatformSnapshot } from "./store.js";

export const S04E_FIXTURE_IDS = {
  personPrincipal: "00000000-0000-4000-8000-0000000000f0",
  personCoHost: "00000000-0000-4000-8000-0000000000f1",
  personFamily: "00000000-0000-4000-8000-0000000000f2",
  personAssistant: "00000000-0000-4000-8000-0000000000f3",
  personCorporate: "00000000-0000-4000-8000-0000000000f4",
  personReadOnly: "00000000-0000-4000-8000-0000000000f5",
  atelier: "00000000-0000-4000-8000-0000000000f6",
  genesis: "00000000-0000-4000-8000-0000000000f7",
  narrative: "00000000-0000-4000-8000-0000000000f8",
  media: "00000000-0000-4000-8000-0000000000f9",
  journey: "00000000-0000-4000-8000-0000000000fa",
  milestone: "00000000-0000-4000-8000-0000000000fb",
  budget: "00000000-0000-4000-8000-0000000000fc",
  ensemble: "00000000-0000-4000-8000-0000000000fd",
  contingency: "00000000-0000-4000-8000-0000000000fe",
  asset: "00000000-0000-4000-8000-000000000110",
  update: "00000000-0000-4000-8000-000000000111",
  decision: "00000000-0000-4000-8000-000000000112",
  grantPrincipal: "00000000-0000-4000-8000-000000000113",
  grantReadOnly: "00000000-0000-4000-8000-000000000114",
  grantAssistant: "00000000-0000-4000-8000-000000000115",
  membershipPrincipal: "00000000-0000-4000-8000-000000000116",
} as const;

const AT = "2026-09-07T18:00:00.000Z";

function stamp<T extends object>(value: T) {
  return {
    ...value,
    nonProductionFixture: true as const,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: AT,
    updatedAt: AT,
  };
}

function scoped() {
  return {
    organisationId: FIXTURE_IDS.orgMaison,
    clientId: FIXTURE_IDS.clientAlpha,
    eventId: FIXTURE_IDS.eventAlphaOne,
  };
}

export function applyS04EFixturesIfMissing(input: PlatformSnapshot): PlatformSnapshot {
  if (input.eventAteliers.some((item) => item.id === S04E_FIXTURE_IDS.atelier)) return input;
  const event = input.events.find((item) => item.id === FIXTURE_IDS.eventAlphaOne);
  if (!event) return input;
  const snap = structuredClone(input);
  const hosts = [
    [S04E_FIXTURE_IDS.personPrincipal, "Adérónké Alákíjà", "aderonke.host@example.test"],
    [S04E_FIXTURE_IDS.personCoHost, "Olúwafẹ́mi Alákíjà", "oluwafemi.host@example.test"],
    [S04E_FIXTURE_IDS.personFamily, "Folákẹ́mi Alákíjà", "folakemi.host@example.test"],
    [S04E_FIXTURE_IDS.personAssistant, "Kẹ́hìndé Adewale", "kehinde.assistant@example.test"],
    [S04E_FIXTURE_IDS.personCorporate, "Títílayọ̀ Brands", "titilayo.corporate@example.test"],
    [S04E_FIXTURE_IDS.personReadOnly, "Bísí Observer", "bisi.readonly@example.test"],
  ] as const;
  for (const [id, displayName, email] of hosts) {
    if (!snap.persons.some((item) => item.id === id)) {
      snap.persons.push(
        stamp({
          id,
          externalSubject: `s04e-host:${id.slice(-4)}`,
          email,
          displayName,
          status: "ACTIVE",
        }),
      );
    }
  }
  if (!snap.memberships.some((item) => item.id === S04E_FIXTURE_IDS.membershipPrincipal)) {
    snap.memberships.push(
      stamp({
        id: S04E_FIXTURE_IDS.membershipPrincipal,
        organisationId: FIXTURE_IDS.orgMaison,
        personId: S04E_FIXTURE_IDS.personPrincipal,
        status: "ACTIVE",
      }),
    );
  }
  snap.eventAteliers.push(
    stamp({
      id: S04E_FIXTURE_IDS.atelier,
      ...scoped(),
      lifecycleState: "PLANNING",
      publicationState: "DRAFT",
      currentNarrativeEditionId: S04E_FIXTURE_IDS.narrative,
      themeLabel: "A quiet Lagos gathering",
      ownerPersonId: FIXTURE_IDS.personDirector,
    }),
  );
  snap.blueprintGenesises.push(
    stamp({
      id: S04E_FIXTURE_IDS.genesis,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      acceptedSourceRef: "SYNTHETIC-BRIEF-ALPHA-ONE",
      capturedIntent: "A considered family gathering that feels commissioned rather than produced.",
      originEditionLabel: "Accepted brief · synthetic",
      acceptedByPersonId: FIXTURE_IDS.personDirector,
      acceptedAt: AT,
      importStatus: "IMPORTED",
    }),
  );
  ATELIER_CHAPTER_TYPES.forEach((chapterType, index) => {
    snap.atelierChapters.push(
      stamp({
        id: `00000000-0000-4000-8000-00000000012${index.toString(16)}`,
        ...scoped(),
        atelierId: S04E_FIXTURE_IDS.atelier,
        chapterType,
        order: index,
        publicationState: "DRAFT",
        visibilityPolicy: "HOST_VISIBLE",
      }),
    );
  });
  snap.eventNarrativeEditions.push(
    stamp({
      id: S04E_FIXTURE_IDS.narrative,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      story: "Alpha One gathers two houses of the family for a day that should feel inevitable, never busy.",
      atmosphere: "Warm ivory rooms, late-afternoon light, and language that remembers every name.",
      pillars: ["Family dignity", "Quiet ceremony", "Considered welcome"],
      culturalIntent: "Yorùbá hospitality without spectacle.",
      designDirection: "Editorial stills, restrained gold, and generous space.",
      authorPersonId: FIXTURE_IDS.personPlanner,
      publicationState: "DRAFT",
      provenance: "Synthetic editorial draft from the accepted brief.",
      effectiveAt: AT,
    }),
  );
  snap.curatedMediaSets.push(
    stamp({
      id: S04E_FIXTURE_IDS.media,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      editionId: S04E_FIXTURE_IDS.narrative,
      caption: "Approved event portrait placeholder",
      altText: "Soft ivory architectural still reserved for the host portrait",
      purpose: "EVENT_PORTRAIT",
      safeHref: "#atelier-portrait",
      rightsNote: "Repository-controlled synthetic placeholder",
      publicationState: "DRAFT",
    }),
  );
  snap.guestJourneyProjections.push(
    stamp({
      id: S04E_FIXTURE_IDS.journey,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      hostWording: "Guests arrive for church, then move with the family to reception. Children travel with their adults.",
      phaseRefs: [S04B_FIXTURE_IDS.phaseChurch, S04B_FIXTURE_IDS.phaseReception],
      sourceVersions: ["programme-s04b"],
      freshnessAt: AT,
      publicationState: "DRAFT",
    }),
  );
  snap.hostMilestoneProjections.push(
    stamp({
      id: S04E_FIXTURE_IDS.milestone,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      title: "Church to reception",
      meaning: "The family crosses from vow to welcome.",
      occursOn: "The day",
      assuranceState: "WATCHED",
      sourceRef: S04B_FIXTURE_IDS.phaseReception,
      freshnessAt: AT,
      publicationState: "DRAFT",
    }),
  );
  snap.budgetAssuranceProjections.push(
    stamp({
      id: S04E_FIXTURE_IDS.budget,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      available: false,
      unavailableReason: "FINANCE_AUTHORITY_ABSENT",
      publicationState: "PUBLISHED",
    }),
  );
  snap.vendorEnsembleProjections.push(
    stamp({
      id: S04E_FIXTURE_IDS.ensemble,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      serviceLabel: "Traditional cloth",
      attribution: "Aso-Oke House, attributed and verified for host presentation.",
      verified: true,
      publicationState: "DRAFT",
    }),
  );
  snap.contingencyAssuranceProjections.push(
    stamp({
      id: S04E_FIXTURE_IDS.contingency,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      hostStatement: "If weather or timing shifts, Maison Doclar will tell you what changes for the family, not the internal response.",
      sourceRef: "CONTINGENCY-HOST-SAFE",
      publicationState: "DRAFT",
    }),
  );
  snap.approvedAssetEditions.push(
    stamp({
      id: S04E_FIXTURE_IDS.asset,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      category: "INVITE",
      title: "Current invitation edition",
      summary: "The approved wording and crop for the family invitation.",
      publicationState: "DRAFT",
    }),
  );
  snap.curatedUpdates.push(
    stamp({
      id: S04E_FIXTURE_IDS.update,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      title: "The houses are confirmed",
      body: "Church and reception remain as briefed. No host action is needed tonight.",
      importance: "QUIET",
      authorPersonId: FIXTURE_IDS.personPlanner,
      publishedAt: AT,
      publicationState: "DRAFT",
    }),
  );
  snap.hostDecisionRequests.push(
    stamp({
      id: S04E_FIXTURE_IDS.decision,
      ...scoped(),
      atelierId: S04E_FIXTURE_IDS.atelier,
      kind: "REQUIRES_STAFF_REVIEW",
      title: "Welcome words",
      question: "Which welcome should open the reception for the family?",
      consequence: "Maison Doclar will set the spoken welcome. This does not change RSVP or attendance.",
      options: ["A short family blessing", "A quiet toast only", "Talk this through"],
      deadlineAt: "2026-09-21T18:00:00.000Z",
      status: "PUBLISHED",
      requiresReview: true,
      requiresStepUp: false,
      publishedByPersonId: FIXTURE_IDS.personPlanner,
      expectedVersion: 1,
      canonicalTarget: "ATELIER_DECISION_ONLY",
    }),
  );
  return snap;
}
