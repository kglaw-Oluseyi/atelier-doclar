import { operationalDisplayName } from "./guest-matching.js";
import { describeMerchandiseAccessState } from "./merchandise-access-state.js";
import { safeVendorContactUrl } from "./merchandise-operations.js";
import type { PermissionKey } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";

export interface MerchandiseCapabilities {
  canViewCollection: boolean;
  canManageCollection: boolean;
  canViewOffer: boolean;
  canManageOffer: boolean;
  canSponsor: boolean;
  canViewParticipation: boolean;
  canManageParticipation: boolean;
  canViewCap: boolean;
  canManageCap: boolean;
  canViewFulfilment: boolean;
  canManageFulfilment: boolean;
  canViewVendorAssignment: boolean;
  canManageVendorAssignment: boolean;
  canViewException: boolean;
  canReviewException: boolean;
  canViewReport: boolean;
  canViewAudit: boolean;
}

export function merchandisePermissionAllowed(check: (permission: PermissionKey) => boolean): MerchandiseCapabilities {
  return {
    canViewCollection: check("merch.collection.view"),
    canManageCollection: check("merch.collection.manage"),
    canViewOffer: check("merch.offer.view"),
    canManageOffer: check("merch.offer.manage"),
    canSponsor: check("merch.offer.sponsor"),
    canViewParticipation: check("merch.participation.view"),
    canManageParticipation: check("merch.participation.manage"),
    canViewCap: check("merch.capMeasurement.view"),
    canManageCap: check("merch.capMeasurement.manage"),
    canViewFulfilment: check("merch.fulfilment.view"),
    canManageFulfilment: check("merch.fulfilment.manage"),
    canViewVendorAssignment: check("merch.vendorAssignment.view"),
    canManageVendorAssignment: check("merch.vendorAssignment.manage"),
    canViewException: check("merch.exception.view"),
    canReviewException: check("merch.exception.review"),
    canViewReport: check("merch.report.view"),
    canViewAudit: check("merch.audit.view"),
  };
}

function guestName(snap: PlatformSnapshot, guestId: string): string {
  const guest = snap.operationalGuests.find((item) => item.id === guestId);
  return guest ? operationalDisplayName(guest) : "Guest";
}

function itemName(snap: PlatformSnapshot, itemId: string): string {
  return snap.merchandiseItems.find((item) => item.id === itemId)?.name ?? "Item";
}

export function buildEventMerchandiseWorkspace(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  capabilities: MerchandiseCapabilities,
  now = new Date().toISOString(),
) {
  const event = snap.events.find((item) => item.id === eventId && item.organisationId === organisationId);
  if (!event) return undefined;
  const collections = snap.merchandiseCollections.filter((item) => item.eventId === eventId);
  const offers = snap.guestOffers.filter((item) => item.eventId === eventId && item.state !== "WITHDRAWN");
  const fulfilments = snap.merchandiseFulfilments.filter((item) => item.eventId === eventId);
  const exceptions = snap.merchandiseExceptions.filter((item) => item.eventId === eventId && item.status === "OPEN");
  const updates = snap.vendorUpdates.filter((item) => item.eventId === eventId);
  return {
    eventId: event.id,
    organisationId: event.organisationId,
    eventName: event.name,
    capabilities,
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      status: collection.status,
      phaseIds: collection.phaseIds,
      windowEndsAt: collection.windowEndsAt,
      version: collection.version,
      itemCount: snap.merchandiseItems.filter((item) => item.collectionId === collection.id).length,
      nextAction:
        snap.merchandiseItems.filter((item) => item.collectionId === collection.id).length === 0
          ? "Add the first item to this collection"
          : undefined,
    })),
    items: snap.merchandiseItems
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        id: item.id,
        collectionId: item.collectionId,
        name: item.name,
        type: item.type,
        description: item.description,
        madeToMeasureCap: item.madeToMeasureCap,
        version: item.version,
        variants: snap.merchandiseItemVariants
          .filter((variant) => variant.itemId === item.id)
          .map((variant) => ({ id: variant.id, label: variant.label })),
      })),
    directoryGuests: capabilities.canManageOffer
      ? snap.operationalGuests
          .filter((item) => item.eventId === eventId && item.organisationId === organisationId)
          .map((item) => ({ id: item.id, displayName: operationalDisplayName(item) }))
      : [],
    phases: snap.programmePhases
      .filter((item) => item.eventId === eventId && item.organisationId === organisationId)
      .map((item) => ({ id: item.id, name: item.name })),
    cohorts: snap.merchandiseCohorts
      .filter((item) => item.eventId === eventId)
      .map((cohort) => ({
        id: cohort.id,
        label: cohort.label,
        hostAssigned: cohort.hostAssigned,
        inferred: cohort.inferred,
        members: snap.merchandiseCohortMembers
          .filter((member) => member.cohortId === cohort.id)
          .map((member) => ({
            guestId: member.guestId,
            displayName: guestName(snap, member.guestId),
          })),
      })),
    rules: snap.hostOfferRules
      .filter((item) => item.eventId === eventId)
      .map((rule) => ({
        id: rule.id,
        itemName: itemName(snap, rule.itemId),
        audienceKind: rule.audienceKind,
        hostSponsored: rule.hostSponsored,
        status: rule.status,
        conflictReason: rule.conflictReason,
        version: rule.version,
      })),
    offers: capabilities.canViewOffer
      ? offers.map((offer) => ({
          id: offer.id,
          guestId: offer.guestId,
          guestDisplayName: guestName(snap, offer.guestId),
          itemName: itemName(snap, offer.itemId),
          state: offer.state,
          hostSponsored: offer.hostSponsored,
          individualOverride: offer.individualOverride,
          version: offer.version,
          choice: capabilities.canViewParticipation
            ? snap.guestParticipations.find((item) => item.guestOfferId === offer.id && item.status === "RECORDED")?.choice
            : undefined,
        }))
      : [],
    fulfilments: capabilities.canViewFulfilment
      ? fulfilments.map((item) => ({
          id: item.id,
          guestDisplayName: guestName(snap, item.guestId),
          itemName: itemName(snap, item.itemId),
          vendorReference: item.vendorReference,
          milestoneStatus: item.milestoneStatus,
          commercialStatus: item.commercialAttributed
            ? { status: item.commercialStatus, attributed: true as const, maisonTruth: false as const }
            : { status: item.commercialStatus, attributed: false as const, maisonTruth: false as const },
          version: item.version,
        }))
      : [],
    vendorAssignments: capabilities.canViewVendorAssignment
      ? snap.vendorAssignments
          .filter((item) => item.eventId === eventId)
          .map((item) => {
            const access = describeMerchandiseAccessState({
              status: item.status,
              expiresAt: item.expiresAt,
              revokedAt: item.revokedAt,
              renewedAt: item.renewedAt,
              now,
              hasUsableIssuedLink: false,
            });
            return {
              id: item.id,
              vendorId: item.vendorId,
              vendorDisplayName: item.vendorDisplayName,
              status: item.status,
              accessState: access.state,
              accessLabel: access.label,
              ready: false,
              expiresAt: item.expiresAt,
              version: item.version,
              tokenPrefix: item.tokenPrefix,
              collectionIds: item.collectionIds,
              itemIds: item.itemIds,
            };
          })
      : [],
    guestGrants: capabilities.canViewOffer
      ? snap.merchandiseGuestGrants
          .filter((item) => item.eventId === eventId)
          .map((item) => {
            const access = describeMerchandiseAccessState({
              status: item.status,
              expiresAt: item.expiresAt,
              revokedAt: item.revokedAt,
              renewedAt: item.renewedAt,
              now,
              hasUsableIssuedLink: false,
            });
            return {
              id: item.id,
              guestId: item.guestId,
              guestDisplayName: guestName(snap, item.guestId),
              status: item.status,
              accessState: access.state,
              accessLabel: access.label,
              ready: false,
              expiresAt: item.expiresAt,
              version: item.version,
              tokenPrefix: item.tokenPrefix,
            };
          })
      : [],
    vendorUpdates: capabilities.canReviewException || capabilities.canViewFulfilment
      ? updates.map((item) => ({
          id: item.id,
          fulfilmentId: item.fulfilmentId,
          reportedState: item.reportedState,
          reviewState: item.reviewState,
          vendorActorLabel: item.vendorActorLabel,
          attributed: true as const,
          version: item.version,
        }))
      : [],
    exceptions: capabilities.canViewException || capabilities.canViewReport
      ? exceptions.map((item) => ({
          id: item.id,
          type: item.type,
          reason: item.reason,
          guestSafeMessage: item.guestSafeMessage,
          status: item.status,
        }))
      : [],
    readiness: {
      offered: offers.length,
      selected: fulfilments.filter((item) => item.milestoneStatus === "GUEST_SELECTED").length,
      delayed: exceptions.filter((item) => item.type === "DELAY").length,
      pendingVendorReview: updates.filter((item) => item.reviewState === "PENDING_REVIEW").length,
    },
    moneyHandling: false,
    invitationAuthority: "EOS-S03" as const,
    phaseAuthority: "EOS-S04B" as const,
  };
}

export type EventMerchandiseWorkspace = NonNullable<ReturnType<typeof buildEventMerchandiseWorkspace>>;

export function buildGuestMerchandiseProjection(snap: PlatformSnapshot, eventId: string, guestId: string) {
  const offers = snap.guestOffers.filter((item) => item.eventId === eventId && item.guestId === guestId && item.state !== "WITHDRAWN");
  return {
    guestId,
    eventId,
    offers: offers.map((offer) => {
      const item = snap.merchandiseItems.find((record) => record.id === offer.itemId);
      const fulfilment = snap.merchandiseFulfilments.find((record) => record.guestOfferId === offer.id);
      const participation = snap.guestParticipations.find(
        (record) => record.guestOfferId === offer.id && record.status === "RECORDED",
      );
      const link = snap.externalContactLinks.find((record) => record.collectionId === offer.collectionId && record.published);
      const cap = item?.madeToMeasureCap
        ? snap.capMeasurements.find((record) => record.guestId === guestId && record.itemId === offer.itemId && record.status === "ACTIVE")
        : undefined;
      return {
        id: offer.id,
        itemId: offer.itemId,
        itemName: item?.name ?? "Item",
        itemType: item?.type,
        madeToMeasureCap: Boolean(item?.madeToMeasureCap),
        variants: snap.merchandiseItemVariants
          .filter((variant) => offer.variantIds.includes(variant.id))
          .map((variant) => ({ id: variant.id, label: variant.label })),
        hostSponsored: offer.hostSponsored,
        state: offer.state,
        version: offer.version,
        choice: participation?.choice,
        milestoneStatus: fulfilment?.milestoneStatus,
        vendorReference: fulfilment?.vendorReference,
        contactUrl:
          link && fulfilment
            ? safeVendorContactUrl(link.urlTemplate, fulfilment.vendorReference, item?.name ?? "item")
            : undefined,
        contactLabel: link?.label,
        capMeasurement: cap
          ? { id: cap.id, headCircumferenceInches: cap.headCircumferenceInches, version: cap.version }
          : undefined,
      };
    }),
  };
}

export function buildGuestDirectoryMerchandiseBadge(snap: PlatformSnapshot, eventId: string, guestId: string) {
  const offers = snap.guestOffers.filter((item) => item.eventId === eventId && item.guestId === guestId && item.state !== "WITHDRAWN");
  const risk = snap.merchandiseExceptions.some(
    (item) => item.eventId === eventId && item.guestId === guestId && item.status === "OPEN",
  );
  return { guestId, offerCount: offers.length, risk };
}

export function buildVendorPortalProjection(
  snap: PlatformSnapshot,
  assignmentId: string,
  eventId: string,
) {
  const assignment = snap.vendorAssignments.find((item) => item.id === assignmentId && item.eventId === eventId);
  if (!assignment || assignment.status !== "ACTIVE") return undefined;
  const fulfilments = snap.merchandiseFulfilments.filter(
    (item) => item.eventId === eventId && assignment.itemIds.includes(item.itemId),
  );
  return {
    assignmentId: assignment.id,
    vendorDisplayName: assignment.vendorDisplayName,
    eventId: assignment.eventId,
    expiresAt: assignment.expiresAt,
    fulfilments: fulfilments.map((item) => {
      const merchItem = snap.merchandiseItems.find((record) => record.id === item.itemId);
      const cap =
        merchItem?.madeToMeasureCap
          ? snap.capMeasurements.find(
              (record) =>
                record.guestId === item.guestId &&
                record.itemId === item.itemId &&
                record.status === "ACTIVE",
            )
          : undefined;
      return {
        id: item.id,
        displayName: guestName(snap, item.guestId),
        itemName: itemName(snap, item.itemId),
        variantLabel: snap.merchandiseItemVariants.find((variant) => variant.id === item.variantId)?.label,
        vendorReference: item.vendorReference,
        milestoneStatus: item.milestoneStatus,
        version: item.version,
        headCircumferenceInches: cap?.headCircumferenceInches,
      };
    }),
    guestListRestricted: true,
    rsvpHidden: true,
    coreMutationForbidden: true,
  };
}

export type VendorPortalProjection = NonNullable<ReturnType<typeof buildVendorPortalProjection>>;
export type GuestMerchandiseProjection = ReturnType<typeof buildGuestMerchandiseProjection>;
