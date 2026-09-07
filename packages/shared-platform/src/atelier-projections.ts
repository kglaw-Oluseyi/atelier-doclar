import type { AtelierHostRole } from "./atelier-access.js";
import type { AtelierChapter, EventAtelier, HostDecisionReceipt, HostDecisionRequest } from "./atelier-schemas.js";
import { ATELIER_CHAPTER_TYPES, type ATELIER_CHAPTER_TYPES as ChapterTypes } from "./constants.js";
import { buildHostForecastProjection } from "./forecast-projections.js";
import type { PlatformSnapshot } from "./store.js";

export type AtelierChapterType = (typeof ChapterTypes)[number];

export interface AtelierStaffCapabilities {
  canView: boolean;
  canManage: boolean;
  canPublish: boolean;
  canManageAccess: boolean;
  canPublishDecision: boolean;
  canReviewDecision: boolean;
  canAudit: boolean;
}

export interface EventAtelierWorkspace {
  eventId: string;
  eventName: string;
  atelier: EventAtelier;
  genesisIntent: string;
  narrative?: { story: string; atmosphere: string; pillars: readonly string[]; editionId: string; supersededCount: number };
  chapters: readonly AtelierChapter[];
  decisions: readonly HostDecisionRequest[];
  receipts: readonly HostDecisionReceipt[];
  updates: readonly { id: string; title: string; body: string; publishedAt: string }[];
  grants: readonly {
    id: string;
    personName: string;
    hostRole: AtelierHostRole;
    status: string;
    canDecide: boolean;
    version: number;
    tokenPrefix?: string;
  }[];
  capabilities: AtelierStaffCapabilities;
}

export interface HostAtelierChapterView {
  type: AtelierChapterType;
  title: string;
  body: string;
  state?: string;
}

export interface HostAtelierProjection {
  eventName: string;
  hostDisplayName: string;
  hostRole: AtelierHostRole;
  statusSentence: string;
  chapters: readonly HostAtelierChapterView[];
  decisions: readonly {
    id: string;
    title: string;
    question: string;
    consequence: string;
    options: readonly string[];
    deadlineAt: string;
    expectedVersion: number;
    requiresStepUp: boolean;
    status: string;
  }[];
  receipts: readonly {
    id: string;
    requestTitle: string;
    submittedChoice: string;
    changedCanonicalData: false;
    reviewStatus: string;
    nextOwner: string;
    finalOutcome: string;
  }[];
  canDecide: boolean;
  stepUpRequired: boolean;
}

const CHAPTER_TITLES: Record<AtelierChapterType, string> = {
  TODAY: "Today",
  VISION: "The Vision",
  JOURNEY: "The Journey",
  BLUEPRINT: "The Blueprint",
  ENSEMBLE: "Our Ensemble",
  DECISIONS: "Decisions",
  ASSURANCE: "Assurance",
  EDITIONS: "Editions",
  UPDATES: "Notes from Maison Doclar",
};

export function atelierPermissionAllowed(
  keys: readonly string[],
): AtelierStaffCapabilities {
  return {
    canView: keys.includes("atelier.view"),
    canManage: keys.includes("atelier.manage"),
    canPublish: keys.includes("atelier.publish"),
    canManageAccess: keys.includes("atelier.access.manage"),
    canPublishDecision: keys.includes("atelier.decision.publish"),
    canReviewDecision: keys.includes("atelier.decision.review"),
    canAudit: keys.includes("atelier.audit.view"),
  };
}

export function buildEventAtelierWorkspace(
  snap: PlatformSnapshot,
  eventId: string,
  permissionKeys: readonly string[],
): EventAtelierWorkspace | undefined {
  const event = snap.events.find((item) => item.id === eventId);
  const atelier = snap.eventAteliers.find((item) => item.eventId === eventId);
  if (!event || !atelier) return undefined;
  const genesis = snap.blueprintGenesises.find((item) => item.atelierId === atelier.id);
  const narrative = snap.eventNarrativeEditions.find((item) => item.id === atelier.currentNarrativeEditionId);
  const supersededCount = snap.eventNarrativeEditions.filter(
    (item) => item.atelierId === atelier.id && item.publicationState === "SUPERSEDED",
  ).length;
  const grants = snap.atelierAccessGrants
    .filter((item) => item.atelierId === atelier.id)
    .map((grant) => {
      const person = snap.persons.find((item) => item.id === grant.personId);
      const latest = [...snap.magicLinkChallenges]
        .reverse()
        .find((item) => item.grantId === grant.id);
      return {
        id: grant.id,
        personName: person?.displayName ?? "Host",
        hostRole: grant.hostRole,
        status: grant.status,
        canDecide: grant.canDecide,
        version: grant.version,
        tokenPrefix: latest?.tokenPrefix,
      };
    });
  return {
    eventId,
    eventName: event.name,
    atelier,
    genesisIntent: genesis?.capturedIntent ?? "Being prepared.",
    narrative: narrative
      ? {
          story: narrative.story,
          atmosphere: narrative.atmosphere,
          pillars: narrative.pillars,
          editionId: narrative.id,
          supersededCount,
        }
      : undefined,
    chapters: snap.atelierChapters.filter((item) => item.atelierId === atelier.id),
    decisions: snap.hostDecisionRequests.filter((item) => item.atelierId === atelier.id),
    receipts: snap.hostDecisionReceipts.filter((item) => item.atelierId === atelier.id),
    updates: snap.curatedUpdates
      .filter((item) => item.atelierId === atelier.id && item.publicationState === "PUBLISHED")
      .map((item) => ({ id: item.id, title: item.title, body: item.body, publishedAt: item.publishedAt })),
    grants,
    capabilities: atelierPermissionAllowed(permissionKeys),
  };
}

export function buildHostAtelierProjection(
  snap: PlatformSnapshot,
  grantId: string,
  now: string,
): HostAtelierProjection | undefined {
  const grant = snap.atelierAccessGrants.find((item) => item.id === grantId);
  const atelier = grant ? snap.eventAteliers.find((item) => item.id === grant.atelierId) : undefined;
  const event = grant ? snap.events.find((item) => item.id === grant.eventId) : undefined;
  const person = grant ? snap.persons.find((item) => item.id === grant.personId) : undefined;
  if (!grant || !atelier || !event || !person || grant.status !== "ACTIVE") return undefined;
  if (atelier.publicationState !== "PUBLISHED") {
    return {
      eventName: event.name,
      hostDisplayName: person.displayName,
      hostRole: grant.hostRole,
      statusSentence: "Maison Doclar is still preparing this private Atelier.",
      chapters: [],
      decisions: [],
      receipts: [],
      canDecide: false,
      stepUpRequired: false,
    };
  }
  const narrative = snap.eventNarrativeEditions.find(
    (item) => item.id === atelier.currentNarrativeEditionId && item.publicationState === "PUBLISHED",
  );
  const journey = snap.guestJourneyProjections.find(
    (item) => item.atelierId === atelier.id && item.publicationState === "PUBLISHED",
  );
  const milestones = snap.hostMilestoneProjections.filter(
    (item) => item.atelierId === atelier.id && item.publicationState === "PUBLISHED",
  );
  const ensemble = snap.vendorEnsembleProjections.filter(
    (item) => item.atelierId === atelier.id && item.publicationState === "PUBLISHED",
  );
  const contingency = snap.contingencyAssuranceProjections.find(
    (item) => item.atelierId === atelier.id && item.publicationState === "PUBLISHED",
  );
  const budget = snap.budgetAssuranceProjections.find((item) => item.atelierId === atelier.id);
  const editions = snap.approvedAssetEditions.filter(
    (item) => item.atelierId === atelier.id && item.publicationState === "PUBLISHED",
  );
  const updates = snap.curatedUpdates.filter(
    (item) => item.atelierId === atelier.id && item.publicationState === "PUBLISHED",
  );
  const forecast = buildHostForecastProjection(snap, grant.organisationId, grant.eventId);
  const chapters: HostAtelierChapterView[] = [];
  for (const type of ATELIER_CHAPTER_TYPES) {
    if (!grant.chapters.includes(type)) continue;
    const configured = snap.atelierChapters.find((item) => item.atelierId === atelier.id && item.chapterType === type);
    if (!configured || configured.publicationState !== "PUBLISHED") continue;
    if (type === "TODAY") {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: `${event.name} is being prepared with quiet care. Up to three host actions appear only when a decision is open.`,
      });
    } else if (type === "VISION" && narrative) {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: `${narrative.story} ${narrative.atmosphere} Pillars: ${narrative.pillars.join(" · ")}.`,
      });
    } else if (type === "JOURNEY" && journey) {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: `${journey.hostWording} ${milestones.map((item) => `${item.title}: ${item.meaning}`).join(" ")}`,
      });
    } else if (type === "BLUEPRINT") {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: "The occasion takes shape through church and reception, each held in its own house. Operational control remains with Maison Doclar.",
      });
    } else if (type === "ENSEMBLE" && ensemble.length > 0) {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: ensemble.map((item) => `${item.serviceLabel} — ${item.attribution}.`).join(" "),
      });
    } else if (type === "ASSURANCE") {
      const range =
        forecast && forecast.available && forecast.range
          ? `Attendance outlook: about ${forecast.range.expected} people, between ${forecast.range.low} and ${forecast.range.high}. ${forecast.confidencePlainLanguage}`
          : "Attendance outlook is being prepared.";
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: [
          range,
          contingency?.hostStatement ?? "",
          budget?.available === false ? "Budget assurance will appear only when a finance authority exists." : "",
        ]
          .filter(Boolean)
          .join(" "),
      });
    } else if (type === "EDITIONS" && editions.length > 0) {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: editions.map((item) => `${item.title}: ${item.summary}`).join(" "),
      });
    } else if (type === "UPDATES" && updates.length > 0) {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: updates.map((item) => `${item.title}. ${item.body}`).join(" "),
      });
    } else if (type === "DECISIONS") {
      chapters.push({
        type,
        title: CHAPTER_TITLES[type],
        body: grant.canDecide
          ? "Reserved decisions appear with options, consequence and a truthful receipt."
          : "This access is for reading. Decisions are reserved for another host.",
      });
    }
  }
  const session = snap.atelierSessions.find((item) => item.grantId === grant.id && item.status === "ACTIVE");
  const stepUpRequired = Boolean(
    session && session.elevatedUntil && Date.parse(session.elevatedUntil) <= Date.parse(now),
  );
  const openDecisions = grant.canDecide
    ? snap.hostDecisionRequests.filter(
        (item) =>
          item.atelierId === atelier.id &&
          (item.status === "PUBLISHED" || item.status === "REVIEW_PENDING") &&
          Date.parse(item.deadlineAt) > Date.parse(now),
      )
    : [];
  return {
    eventName: event.name,
    hostDisplayName: person.displayName,
    hostRole: grant.hostRole,
    statusSentence: "Maison Doclar is accompanying this occasion with a single, commissioned story.",
    chapters,
    decisions: openDecisions
      .filter((item) => item.status === "PUBLISHED")
      .map((item) => ({
        id: item.id,
        title: item.title,
        question: item.question,
        consequence: item.consequence,
        options: item.options,
        deadlineAt: item.deadlineAt,
        expectedVersion: item.version,
        requiresStepUp: item.requiresStepUp,
        status: item.status,
      })),
    receipts: snap.hostDecisionReceipts
      .filter((item) => item.atelierId === atelier.id && item.submittedByPersonId === grant.personId)
      .map((item) => {
        const request = snap.hostDecisionRequests.find((row) => row.id === item.requestId);
        return {
          id: item.id,
          requestTitle: request?.title ?? "Decision",
          submittedChoice: item.submittedChoice,
          changedCanonicalData: false as const,
          reviewStatus: item.reviewStatus,
          nextOwner: item.nextOwner,
          finalOutcome: item.finalOutcome,
        };
      }),
    canDecide: grant.canDecide,
    stepUpRequired,
  };
}
