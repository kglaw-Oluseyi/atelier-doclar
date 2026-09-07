import { SCHEMA_VERSION } from "./constants.js";
import { S04A_FIXTURE_IDS } from "./addressing-fixtures.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { S04B_FIXTURE_IDS } from "./programme-fixtures.js";
import { hashVendorAssignmentToken, vendorTokenPrefix } from "./merchandise-vendor-access.js";
import { DEFAULT_NON_PRODUCTION_VENDOR_ACCESS } from "./merchandise-vendor-access.js";
import type {
  CapMeasurement,
  ExternalContactLink,
  Fulfilment,
  GuestOffer,
  GuestParticipation,
  HostOfferRule,
  ItemVariant,
  MerchandiseCohort,
  MerchandiseCohortMember,
  MerchandiseCollection,
  MerchandiseException,
  MerchandiseItem,
  VendorAssignment,
} from "./merchandise-schemas.js";
import type { OperationalGuest } from "./guest-schemas.js";
import type { PlatformSnapshot } from "./store.js";

const AT = "2026-09-07T12:00:00.000Z";

export const S04C_VENDOR_TOKEN = "s04c-vendor-token-not-for-production-aso-oke";
export const S04C_OTHER_VENDOR_TOKEN = "s04c-other-vendor-token-not-for-production";

export const S04C_FIXTURE_IDS = {
  collectionTraditional: "00000000-0000-4000-8000-0000000000a0",
  itemParentSet: "00000000-0000-4000-8000-0000000000a1",
  itemFriendFabric: "00000000-0000-4000-8000-0000000000a2",
  itemCap: "00000000-0000-4000-8000-0000000000a3",
  itemNamed: "00000000-0000-4000-8000-0000000000a4",
  variantParent: "00000000-0000-4000-8000-0000000000a5",
  variantFriend: "00000000-0000-4000-8000-0000000000a6",
  variantCap: "00000000-0000-4000-8000-0000000000a7",
  variantNamed: "00000000-0000-4000-8000-0000000000a8",
  cohortParents: "00000000-0000-4000-8000-0000000000a9",
  cohortFriends: "00000000-0000-4000-8000-0000000000aa",
  cohortFamily: "00000000-0000-4000-8000-0000000000ab",
  guestBabatunde: "00000000-0000-4000-8000-0000000000ac",
  guestFolake: "00000000-0000-4000-8000-0000000000ad",
  guestAdewale: "00000000-0000-4000-8000-0000000000ae",
  guestYetunde: "00000000-0000-4000-8000-0000000000af",
  guestOmotola: "00000000-0000-4000-8000-0000000000b0",
  ruleParents: "00000000-0000-4000-8000-0000000000b1",
  ruleFriends: "00000000-0000-4000-8000-0000000000b2",
  ruleFamily: "00000000-0000-4000-8000-0000000000b3",
  ruleNamed: "00000000-0000-4000-8000-0000000000b4",
  ruleCap: "00000000-0000-4000-8000-0000000000b5",
  offerBabatunde: "00000000-0000-4000-8000-0000000000b6",
  offerFolake: "00000000-0000-4000-8000-0000000000b7",
  offerAdewale: "00000000-0000-4000-8000-0000000000b8",
  offerYetunde: "00000000-0000-4000-8000-0000000000b9",
  offerEbunFamily: "00000000-0000-4000-8000-0000000000ba",
  offerOlufemiFamily: "00000000-0000-4000-8000-0000000000bb",
  offerOmotola: "00000000-0000-4000-8000-0000000000bc",
  offerOlufemiCap: "00000000-0000-4000-8000-0000000000bd",
  fulfilmentBabatunde: "00000000-0000-4000-8000-0000000000be",
  fulfilmentFolake: "00000000-0000-4000-8000-0000000000bf",
  fulfilmentAdewale: "00000000-0000-4000-8000-0000000000c0",
  fulfilmentYetunde: "00000000-0000-4000-8000-0000000000c1",
  fulfilmentEbun: "00000000-0000-4000-8000-0000000000c2",
  fulfilmentOlufemiFamily: "00000000-0000-4000-8000-0000000000c3",
  fulfilmentOmotola: "00000000-0000-4000-8000-0000000000c4",
  fulfilmentOlufemiCap: "00000000-0000-4000-8000-0000000000c5",
  assignmentAsoOke: "00000000-0000-4000-8000-0000000000c6",
  assignmentOther: "00000000-0000-4000-8000-0000000000c7",
  linkWhatsapp: "00000000-0000-4000-8000-0000000000c8",
  participationAdewale: "00000000-0000-4000-8000-0000000000c9",
  capOlufemi: "00000000-0000-4000-8000-0000000000ca",
  exceptionDelay: "00000000-0000-4000-8000-0000000000cb",
} as const;

function stamp<T extends object>(value: T): T & { nonProductionFixture: true } {
  return { ...value, nonProductionFixture: true };
}

function versioned() {
  return {
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

function nameField(value: string) {
  return { value, quality: "UNVERIFIED" as const };
}

function blankField() {
  return { quality: "NOT_SUPPLIED" as const };
}

export function fixtureS04CGuests(): OperationalGuest[] {
  const shared = {
    ...scoped(),
    email: blankField(),
    phone: blankField(),
    dietaryRequirement: blankField(),
    accessibilityRequirement: blankField(),
    operationalNote: blankField(),
    lifecycle: "ACTIVE" as const,
    identityResolution: "UNRESOLVED" as const,
    intakeSource: "MANUAL_STAFF" as const,
    provenance: {
      source: "MANUAL_STAFF" as const,
      recordedByPersonId: FIXTURE_IDS.personPlanner,
      recordedAt: AT,
      correlationId: "corr-s04c-fixture",
      reason: "EOS-S04C synthetic fixture",
    },
    attentionRequired: false,
    ageBand: "ADULT" as const,
    ...versioned(),
  };
  return [
    stamp({
      ...shared,
      id: S04C_FIXTURE_IDS.guestBabatunde,
      givenName: nameField("Bàbátúndé"),
      familyName: nameField("Ọlábọ̀dé"),
      preferredName: nameField("Bàbátúndé"),
    }),
    stamp({
      ...shared,
      id: S04C_FIXTURE_IDS.guestFolake,
      givenName: nameField("Folákẹ́"),
      familyName: nameField("Ọlábọ̀dé"),
      preferredName: nameField("Folákẹ́"),
    }),
    stamp({
      ...shared,
      id: S04C_FIXTURE_IDS.guestAdewale,
      givenName: nameField("Adéwálé"),
      familyName: nameField("Ọkẹ́"),
      preferredName: nameField("Adéwálé"),
    }),
    stamp({
      ...shared,
      id: S04C_FIXTURE_IDS.guestYetunde,
      givenName: nameField("Yétúndé"),
      familyName: nameField("Àlàdé"),
      preferredName: nameField("Yétúndé"),
    }),
    stamp({
      ...shared,
      id: S04C_FIXTURE_IDS.guestOmotola,
      givenName: nameField("Ọmọ́tọ́lá"),
      familyName: nameField("Adéyẹmí"),
      preferredName: nameField("Ọmọ́tọ́lá"),
    }),
  ];
}

export function applyS04CFixturesIfMissing(snap: PlatformSnapshot): PlatformSnapshot {
  if (snap.merchandiseCollections.some((item) => item.id === S04C_FIXTURE_IDS.collectionTraditional)) return snap;
  const next = structuredClone(snap);
  const event = next.events.find((item) => item.id === FIXTURE_IDS.eventAlphaOne);
  if (!event) return snap;
  for (const guest of fixtureS04CGuests()) {
    if (!next.operationalGuests.some((item) => item.id === guest.id)) next.operationalGuests.push(guest);
  }

  const collection: MerchandiseCollection = stamp({
    id: S04C_FIXTURE_IDS.collectionTraditional,
    ...scoped(),
    name: "Traditional ceremony aso-oke",
    hostOwnerLabel: "Host family",
    phaseIds: [S04B_FIXTURE_IDS.phaseChurch],
    windowStartsAt: "2026-09-01T08:00:00.000Z",
    windowEndsAt: "2026-09-11T18:00:00.000Z",
    status: "ACTIVE",
    ...versioned(),
  });
  const items: MerchandiseItem[] = [
    stamp({
      id: S04C_FIXTURE_IDS.itemParentSet,
      ...scoped(),
      collectionId: collection.id,
      type: "ASO_OKE_SET",
      name: "Parent aso-oke set",
      description: "Host-sponsored gele, ipele and fila for confirmed parent cohort.",
      madeToMeasureCap: false,
      status: "ACTIVE",
      ...versioned(),
    }),
    stamp({
      id: S04C_FIXTURE_IDS.itemFriendFabric,
      ...scoped(),
      collectionId: collection.id,
      type: "ASO_EBI_FABRIC",
      name: "Friend fabric",
      description: "Fabric-only route for the host-assigned friends cohort.",
      madeToMeasureCap: false,
      status: "ACTIVE",
      ...versioned(),
    }),
    stamp({
      id: S04C_FIXTURE_IDS.itemCap,
      ...scoped(),
      collectionId: collection.id,
      type: "MADE_TO_MEASURE_CAP",
      name: "Made-to-measure fila",
      description: "Optional male-cap circumference in inches with consent.",
      madeToMeasureCap: true,
      status: "ACTIVE",
      ...versioned(),
    }),
    stamp({
      id: S04C_FIXTURE_IDS.itemNamed,
      ...scoped(),
      collectionId: collection.id,
      type: "ACCESSORY",
      name: "Ọmọ́tọ́lá complementary gele",
      description: "Named individual override. Does not change invitation or phase access.",
      madeToMeasureCap: false,
      status: "ACTIVE",
      ...versioned(),
    }),
  ];
  const variants: ItemVariant[] = [
    stamp({ id: S04C_FIXTURE_IDS.variantParent, ...scoped(), itemId: S04C_FIXTURE_IDS.itemParentSet, label: "Coral and gold set", colour: "Coral", ...versioned() }),
    stamp({ id: S04C_FIXTURE_IDS.variantFriend, ...scoped(), itemId: S04C_FIXTURE_IDS.itemFriendFabric, label: "Coral fabric", colour: "Coral", ...versioned() }),
    stamp({ id: S04C_FIXTURE_IDS.variantCap, ...scoped(), itemId: S04C_FIXTURE_IDS.itemCap, label: "Navy fila", colour: "Navy", ...versioned() }),
    stamp({ id: S04C_FIXTURE_IDS.variantNamed, ...scoped(), itemId: S04C_FIXTURE_IDS.itemNamed, label: "Ivory gele", colour: "Ivory", ...versioned() }),
  ];
  const cohorts: MerchandiseCohort[] = [
    stamp({ id: S04C_FIXTURE_IDS.cohortParents, ...scoped(), label: "Parents", hostAssigned: true, inferred: false, ...versioned() }),
    stamp({ id: S04C_FIXTURE_IDS.cohortFriends, ...scoped(), label: "Friends", hostAssigned: true, inferred: false, ...versioned() }),
    stamp({ id: S04C_FIXTURE_IDS.cohortFamily, ...scoped(), label: "Family", hostAssigned: true, inferred: false, ...versioned() }),
  ];
  const members: MerchandiseCohortMember[] = [
    stamp({ id: "00000000-0000-4000-8000-0000000000d1", ...scoped(), cohortId: S04C_FIXTURE_IDS.cohortParents, guestId: S04C_FIXTURE_IDS.guestBabatunde, ...versioned() }),
    stamp({ id: "00000000-0000-4000-8000-0000000000d2", ...scoped(), cohortId: S04C_FIXTURE_IDS.cohortParents, guestId: S04C_FIXTURE_IDS.guestFolake, ...versioned() }),
    stamp({ id: "00000000-0000-4000-8000-0000000000d3", ...scoped(), cohortId: S04C_FIXTURE_IDS.cohortFriends, guestId: S04C_FIXTURE_IDS.guestAdewale, ...versioned() }),
    stamp({ id: "00000000-0000-4000-8000-0000000000d4", ...scoped(), cohortId: S04C_FIXTURE_IDS.cohortFriends, guestId: S04C_FIXTURE_IDS.guestYetunde, ...versioned() }),
    stamp({ id: "00000000-0000-4000-8000-0000000000d5", ...scoped(), cohortId: S04C_FIXTURE_IDS.cohortFamily, guestId: S04A_FIXTURE_IDS.guestEbunoluwa, ...versioned() }),
    stamp({ id: "00000000-0000-4000-8000-0000000000d6", ...scoped(), cohortId: S04C_FIXTURE_IDS.cohortFamily, guestId: S04A_FIXTURE_IDS.guestOlufemi, ...versioned() }),
  ];
  const rules: HostOfferRule[] = [
    stamp({
      id: S04C_FIXTURE_IDS.ruleParents,
      ...scoped(),
      collectionId: collection.id,
      itemId: S04C_FIXTURE_IDS.itemParentSet,
      variantIds: [S04C_FIXTURE_IDS.variantParent],
      audienceKind: "EXPLICIT_COHORT",
      audienceGuestIds: [],
      cohortId: S04C_FIXTURE_IDS.cohortParents,
      hostSponsored: true,
      priority: 1,
      status: "ISSUED",
      ...versioned(),
    }),
    stamp({
      id: S04C_FIXTURE_IDS.ruleFriends,
      ...scoped(),
      collectionId: collection.id,
      itemId: S04C_FIXTURE_IDS.itemFriendFabric,
      variantIds: [S04C_FIXTURE_IDS.variantFriend],
      audienceKind: "EXPLICIT_COHORT",
      audienceGuestIds: [],
      cohortId: S04C_FIXTURE_IDS.cohortFriends,
      hostSponsored: false,
      priority: 2,
      status: "ISSUED",
      ...versioned(),
    }),
    stamp({
      id: S04C_FIXTURE_IDS.ruleFamily,
      ...scoped(),
      collectionId: collection.id,
      itemId: S04C_FIXTURE_IDS.itemParentSet,
      variantIds: [S04C_FIXTURE_IDS.variantParent],
      audienceKind: "EXPLICIT_COHORT",
      audienceGuestIds: [],
      cohortId: S04C_FIXTURE_IDS.cohortFamily,
      hostSponsored: false,
      priority: 3,
      status: "ISSUED",
      ...versioned(),
    }),
    stamp({
      id: S04C_FIXTURE_IDS.ruleNamed,
      ...scoped(),
      collectionId: collection.id,
      itemId: S04C_FIXTURE_IDS.itemNamed,
      variantIds: [S04C_FIXTURE_IDS.variantNamed],
      audienceKind: "NAMED_GUESTS",
      audienceGuestIds: [S04C_FIXTURE_IDS.guestOmotola],
      hostSponsored: false,
      priority: 4,
      status: "ISSUED",
      ...versioned(),
    }),
    stamp({
      id: S04C_FIXTURE_IDS.ruleCap,
      ...scoped(),
      collectionId: collection.id,
      itemId: S04C_FIXTURE_IDS.itemCap,
      variantIds: [S04C_FIXTURE_IDS.variantCap],
      audienceKind: "NAMED_GUESTS",
      audienceGuestIds: [S04A_FIXTURE_IDS.guestOlufemi],
      hostSponsored: false,
      priority: 5,
      status: "ISSUED",
      ...versioned(),
    }),
  ];

  function offer(
    id: string,
    guestId: string,
    itemId: string,
    variantId: string,
    ruleId: string,
    individual: boolean,
    sponsored: boolean,
  ): GuestOffer {
    return stamp({
      id,
      ...scoped(),
      guestId,
      collectionId: collection.id,
      itemId,
      variantIds: [variantId],
      sourceRuleId: ruleId,
      individualOverride: individual,
      hostSponsored: sponsored,
      state: "ISSUED",
      ...versioned(),
    });
  }
  function fulfilment(id: string, guestId: string, offerId: string, itemId: string, variantId: string, status: Fulfilment["milestoneStatus"], commercial: Fulfilment["commercialStatus"]): Fulfilment {
    return stamp({
      id,
      ...scoped(),
      guestId,
      guestOfferId: offerId,
      itemId,
      variantId,
      vendorReference: `VR-${guestId.slice(0, 8)}-${itemId.slice(0, 6)}`.toUpperCase(),
      milestoneStatus: status,
      commercialStatus: commercial,
      commercialAttributed: commercial !== "NOT_REQUIRED" && commercial !== "WAIVED_OR_HOST_SPONSORED",
      ...versioned(),
    });
  }

  const offers: GuestOffer[] = [
    offer(S04C_FIXTURE_IDS.offerBabatunde, S04C_FIXTURE_IDS.guestBabatunde, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, S04C_FIXTURE_IDS.ruleParents, false, true),
    offer(S04C_FIXTURE_IDS.offerFolake, S04C_FIXTURE_IDS.guestFolake, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, S04C_FIXTURE_IDS.ruleParents, false, true),
    offer(S04C_FIXTURE_IDS.offerAdewale, S04C_FIXTURE_IDS.guestAdewale, S04C_FIXTURE_IDS.itemFriendFabric, S04C_FIXTURE_IDS.variantFriend, S04C_FIXTURE_IDS.ruleFriends, false, false),
    offer(S04C_FIXTURE_IDS.offerYetunde, S04C_FIXTURE_IDS.guestYetunde, S04C_FIXTURE_IDS.itemFriendFabric, S04C_FIXTURE_IDS.variantFriend, S04C_FIXTURE_IDS.ruleFriends, false, false),
    offer(S04C_FIXTURE_IDS.offerEbunFamily, S04A_FIXTURE_IDS.guestEbunoluwa, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, S04C_FIXTURE_IDS.ruleFamily, false, false),
    offer(S04C_FIXTURE_IDS.offerOlufemiFamily, S04A_FIXTURE_IDS.guestOlufemi, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, S04C_FIXTURE_IDS.ruleFamily, false, false),
    offer(S04C_FIXTURE_IDS.offerOmotola, S04C_FIXTURE_IDS.guestOmotola, S04C_FIXTURE_IDS.itemNamed, S04C_FIXTURE_IDS.variantNamed, S04C_FIXTURE_IDS.ruleNamed, true, false),
    offer(S04C_FIXTURE_IDS.offerOlufemiCap, S04A_FIXTURE_IDS.guestOlufemi, S04C_FIXTURE_IDS.itemCap, S04C_FIXTURE_IDS.variantCap, S04C_FIXTURE_IDS.ruleCap, true, false),
  ];
  const fulfilments: Fulfilment[] = [
    fulfilment(S04C_FIXTURE_IDS.fulfilmentBabatunde, S04C_FIXTURE_IDS.guestBabatunde, S04C_FIXTURE_IDS.offerBabatunde, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, "OFFERED", "WAIVED_OR_HOST_SPONSORED"),
    fulfilment(S04C_FIXTURE_IDS.fulfilmentFolake, S04C_FIXTURE_IDS.guestFolake, S04C_FIXTURE_IDS.offerFolake, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, "OFFERED", "WAIVED_OR_HOST_SPONSORED"),
    fulfilment(S04C_FIXTURE_IDS.fulfilmentAdewale, S04C_FIXTURE_IDS.guestAdewale, S04C_FIXTURE_IDS.offerAdewale, S04C_FIXTURE_IDS.itemFriendFabric, S04C_FIXTURE_IDS.variantFriend, "GUEST_SELECTED", "NOT_REQUIRED"),
    fulfilment(S04C_FIXTURE_IDS.fulfilmentYetunde, S04C_FIXTURE_IDS.guestYetunde, S04C_FIXTURE_IDS.offerYetunde, S04C_FIXTURE_IDS.itemFriendFabric, S04C_FIXTURE_IDS.variantFriend, "OFFERED", "NOT_REQUIRED"),
    fulfilment(S04C_FIXTURE_IDS.fulfilmentEbun, S04A_FIXTURE_IDS.guestEbunoluwa, S04C_FIXTURE_IDS.offerEbunFamily, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, "OFFERED", "NOT_REQUIRED"),
    fulfilment(S04C_FIXTURE_IDS.fulfilmentOlufemiFamily, S04A_FIXTURE_IDS.guestOlufemi, S04C_FIXTURE_IDS.offerOlufemiFamily, S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.variantParent, "OFFERED", "NOT_REQUIRED"),
    fulfilment(S04C_FIXTURE_IDS.fulfilmentOmotola, S04C_FIXTURE_IDS.guestOmotola, S04C_FIXTURE_IDS.offerOmotola, S04C_FIXTURE_IDS.itemNamed, S04C_FIXTURE_IDS.variantNamed, "OFFERED", "NOT_REQUIRED"),
    fulfilment(S04C_FIXTURE_IDS.fulfilmentOlufemiCap, S04A_FIXTURE_IDS.guestOlufemi, S04C_FIXTURE_IDS.offerOlufemiCap, S04C_FIXTURE_IDS.itemCap, S04C_FIXTURE_IDS.variantCap, "GUEST_SELECTED", "NOT_REQUIRED"),
  ];
  const participation: GuestParticipation = stamp({
    id: S04C_FIXTURE_IDS.participationAdewale,
    ...scoped(),
    guestOfferId: S04C_FIXTURE_IDS.offerAdewale,
    guestId: S04C_FIXTURE_IDS.guestAdewale,
    choice: "FABRIC_ONLY",
    selectedVariantId: S04C_FIXTURE_IDS.variantFriend,
    status: "RECORDED",
    private: true,
    ...versioned(),
  });
  const cap: CapMeasurement = stamp({
    id: S04C_FIXTURE_IDS.capOlufemi,
    ...scoped(),
    guestId: S04A_FIXTURE_IDS.guestOlufemi,
    itemId: S04C_FIXTURE_IDS.itemCap,
    headCircumferenceInches: 22.5,
    consentGiven: true,
    consentRecordedAt: AT,
    source: "GUEST_ENTERED",
    status: "ACTIVE",
    purpose: "NAMED_CAP_MANUFACTURE",
    ...versioned(),
  });
  const assignment: VendorAssignment = stamp({
    id: S04C_FIXTURE_IDS.assignmentAsoOke,
    ...scoped(),
    vendorId: "vendor-aso-oke-house",
    vendorDisplayName: "Aso-Oke House",
    collectionIds: [collection.id],
    itemIds: [S04C_FIXTURE_IDS.itemParentSet, S04C_FIXTURE_IDS.itemFriendFabric, S04C_FIXTURE_IDS.itemCap, S04C_FIXTURE_IDS.itemNamed],
    tokenHash: hashVendorAssignmentToken(S04C_VENDOR_TOKEN, DEFAULT_NON_PRODUCTION_VENDOR_ACCESS),
    tokenPrefix: vendorTokenPrefix(S04C_VENDOR_TOKEN),
    status: "ACTIVE",
    expiresAt: "2026-12-31T23:59:59.000Z",
    failedExchangeCount: 0,
    portalPermissions: ["fulfilment.view", "fulfilment.update", "exception.report"],
    ...versioned(),
  });
  const otherAssignment: VendorAssignment = stamp({
    id: S04C_FIXTURE_IDS.assignmentOther,
    organisationId: FIXTURE_IDS.orgOther,
    clientId: FIXTURE_IDS.clientOther,
    eventId: FIXTURE_IDS.eventOther,
    vendorId: "vendor-other-house",
    vendorDisplayName: "Other House Textiles",
    collectionIds: [],
    itemIds: [],
    tokenHash: hashVendorAssignmentToken(S04C_OTHER_VENDOR_TOKEN, DEFAULT_NON_PRODUCTION_VENDOR_ACCESS),
    tokenPrefix: vendorTokenPrefix(S04C_OTHER_VENDOR_TOKEN),
    status: "ACTIVE",
    expiresAt: "2026-12-31T23:59:59.000Z",
    failedExchangeCount: 0,
    portalPermissions: ["fulfilment.view", "fulfilment.update", "exception.report"],
    ...versioned(),
  });
  const link: ExternalContactLink = stamp({
    id: S04C_FIXTURE_IDS.linkWhatsapp,
    ...scoped(),
    collectionId: collection.id,
    channel: "WHATSAPP",
    label: "Contact Aso-Oke House",
    urlTemplate: "https://wa.me/2348000000000?text=Aso-oke%20{itemLabel}%20{vendorReference}",
    published: true,
    ...versioned(),
  });
  const exception: MerchandiseException = stamp({
    id: S04C_FIXTURE_IDS.exceptionDelay,
    ...scoped(),
    type: "DELAY",
    guestId: S04C_FIXTURE_IDS.guestBabatunde,
    fulfilmentId: S04C_FIXTURE_IDS.fulfilmentBabatunde,
    ownerLabel: "Event Director",
    reason: "Vendor reports delayed coral weave.",
    guestSafeMessage: "Your aso-oke remains in preparation. We will update you privately.",
    status: "OPEN",
    ...versioned(),
  });

  next.merchandiseCollections.push(collection);
  next.merchandiseItems.push(...items);
  next.merchandiseItemVariants.push(...variants);
  next.merchandiseCohorts.push(...cohorts);
  next.merchandiseCohortMembers.push(...members);
  next.hostOfferRules.push(...rules);
  next.guestOffers.push(...offers);
  next.guestParticipations.push(participation);
  next.capMeasurements.push(cap);
  next.merchandiseFulfilments.push(...fulfilments);
  next.vendorAssignments.push(assignment, otherAssignment);
  next.externalContactLinks.push(link);
  next.merchandiseExceptions.push(exception);
  return next;
}
