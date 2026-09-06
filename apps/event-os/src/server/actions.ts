"use server";

import { redirect } from "next/navigation";
import {
  AGE_BANDS,
  HONORIFICS,
  NonProductionIdentityAdapter,
  PlatformError,
  type AgeBand,
  type Honorific,
} from "@maison-doclar/shared-platform";
import { fixturesAllowed } from "./config";
import { classifyActionError } from "./operational-state";
import { getRuntime, withDurable } from "./runtime";
import { clearStaffSessionCookie, readStaffSessionCookie, writeStaffSessionCookie } from "./staff-session-cookie";
import { requireActor } from "./with-session";

function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export async function signInAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const next = safeNextPath(String(formData.get("next") ?? "/app"));
  const fail = `/sign-in?next=${encodeURIComponent(next)}&error=`;
  const denied = `${fail}${encodeURIComponent("Sign in failed. Check the named identity and access token.")}`;
  if (!fixturesAllowed()) {
    redirect(`${fail}${encodeURIComponent("The non-production identity adapter cannot be used here.")}`);
  }
  const email = String(formData.get("email") ?? "").trim();
  const accessToken = String(formData.get("accessToken") ?? "");
  if (!email) {
    redirect(denied);
  }
  try {
    new NonProductionIdentityAdapter(true).resolve({ externalSubject: email, email });
    const issued = getRuntime().service.authenticateNamedStaff({ email, accessToken });
    await writeStaffSessionCookie(issued.token);
  } catch (error) {
    if (error instanceof PlatformError && (error.code === "AUTH_REQUIRED" || error.code === "VALIDATION_FAILED")) {
      redirect(denied);
    }
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(next);
  });
}

export async function signOutAction(): Promise<void> {
  return await withDurable(async () => {
  const token = await readStaffSessionCookie();
  if (!token) {
    await clearStaffSessionCookie();
    redirect("/sign-in?status=already-signed-out");
  }
  let revoked = false;
  try {
    revoked = getRuntime().service.logoutStaffSession(token).revoked;
  } catch {
    await clearStaffSessionCookie();
    redirect("/sign-in?error=" + encodeURIComponent("Sign out could not be completed. Sign in again if needed."));
  }
  await clearStaffSessionCookie();
  redirect(revoked ? "/sign-in?status=signed-out" : "/sign-in?status=already-signed-out");
  });
}

function toIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function actionError(error: unknown): string {
  return classifyActionError(error).message;
}

function failQuery(error: unknown): string {
  const classified = classifyActionError(error);
  return `state=${encodeURIComponent(classified.code)}&error=${encodeURIComponent(classified.message)}`;
}

function optionalHonorific(value: string): Honorific | undefined {
  return (HONORIFICS as readonly string[]).includes(value) ? (value as Honorific) : undefined;
}

function optionalAgeBand(value: string): AgeBand | undefined {
  return (AGE_BANDS as readonly string[]).includes(value) ? (value as AgeBand) : undefined;
}

function optionalList(value: string): string[] | undefined {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function sessionOrAssignmentRedirect(error: unknown, nextPath: string): void {
  const classified = classifyActionError(error);
  if (classified.code === "AUTH_REQUIRED") {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}&status=session-expired&state=AUTH_REQUIRED`);
  }
  if (classified.code === "ACCESS_PENDING") {
    redirect(`/access-pending?state=ACCESS_PENDING`);
  }
}

export async function createClientAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect("/app/clients/new?error=No+organisation+assignment+is+available.");
  }
  let client;
  try {
    client = runtime.service.createClient(actor, {
      organisationId: organisation.id,
      code: String(formData.get("code") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      legalName: String(formData.get("legalName") ?? "") || undefined,
      status: String(formData.get("status") ?? "PROSPECT"),
    });
  } catch (error) {
    redirect(`/app/clients/new?error=${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/clients/${client.id}`);
  });
}

export async function createEventAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const clientId = String(formData.get("clientId") ?? "");
  const returnTo = `/app/events/new${clientId ? `?clientId=${encodeURIComponent(clientId)}&` : "?"}error=`;
  if (!organisation) {
    redirect(`${returnTo}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  const startsAt = toIso(String(formData.get("startsAt") ?? ""));
  const endsAt = toIso(String(formData.get("endsAt") ?? ""));
  if (!startsAt || !endsAt) {
    redirect(`${returnTo}${encodeURIComponent("Start and end times are required and must be valid.")}`);
  }
  let event;
  try {
    event = runtime.service.createEvent(actor, {
      organisationId: organisation.id,
      clientId,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      startsAt,
      endsAt,
      timezone: String(formData.get("timezone") ?? "Africa/Lagos"),
      venueSummary: String(formData.get("venueSummary") ?? "") || undefined,
    });
  } catch (error) {
    redirect(`${returnTo}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${event.id}`);
  });
}

export async function grantAssignmentAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect("/app/admin/access?error=No+organisation+assignment+is+available.");
  }
  const eventId = String(formData.get("eventId") ?? "") || undefined;
  let clientId: string | undefined;
  if (eventId) {
    try {
      clientId = runtime.service.getEvent(actor, organisation.id, eventId).clientId;
    } catch (error) {
      redirect(`/app/admin/access?error=${encodeURIComponent(actionError(error))}`);
    }
  }
  try {
    runtime.service.grantAssignment(actor, {
      organisationId: organisation.id,
      personId: String(formData.get("personId") ?? ""),
      roleKey: String(formData.get("roleKey") ?? ""),
      reason: String(formData.get("reason") ?? ""),
      ...(eventId ? { eventId } : {}),
      ...(clientId ? { clientId } : {}),
    });
  } catch (error) {
    redirect(`/app/admin/access?error=${encodeURIComponent(actionError(error))}`);
  }
  redirect("/app/admin/access");
  });
}

export async function intakeGuestAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const eventId = String(formData.get("eventId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests/new?`;
  let actor;
  try {
    ({ actor } = await requireActor());
  } catch (error) {
    sessionOrAssignmentRedirect(error, `/app/events/${eventId}/guests/new`);
    redirect(`${fail}${failQuery(error)}`);
  }
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}state=ACCESS_PENDING&error=${encodeURIComponent("No organisation assignment is available.")}`);
  }
  let guest;
  try {
    guest = runtime.service.intakeGuest(actor, {
      organisationId: organisation.id,
      eventId,
      givenName: String(formData.get("givenName") ?? "") || undefined,
      familyName: String(formData.get("familyName") ?? "") || undefined,
      preferredName: String(formData.get("preferredName") ?? "") || undefined,
      email: String(formData.get("email") ?? "") || undefined,
      phone: String(formData.get("phone") ?? "") || undefined,
      dietaryRequirement: String(formData.get("dietaryRequirement") ?? "") || undefined,
      accessibilityRequirement: String(formData.get("accessibilityRequirement") ?? "") || undefined,
      operationalNote: String(formData.get("operationalNote") ?? "") || undefined,
      householdKey: String(formData.get("householdKey") ?? "") || undefined,
      honorific: optionalHonorific(String(formData.get("honorific") ?? "")),
      professionalTitle: String(formData.get("professionalTitle") ?? "") || undefined,
      traditionalTitle: String(formData.get("traditionalTitle") ?? "") || undefined,
      middleNames: String(formData.get("middleNames") ?? "") || undefined,
      postNominals: optionalList(String(formData.get("postNominals") ?? "")),
      preferredDisplayName: String(formData.get("preferredDisplayName") ?? "") || undefined,
      preferredFormalSalutation: String(formData.get("preferredFormalSalutation") ?? "") || undefined,
      ageBand: optionalAgeBand(String(formData.get("ageBand") ?? "")),
      reason: String(formData.get("reason") ?? ""),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    redirect(`${fail}${failQuery(error)}`);
  }
  redirect(`/app/events/${eventId}/guests/${guest.id}?ok=intake`);
  });
}

export async function amendGuestAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guestId)}?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.amendGuest(actor, {
      organisationId: organisation.id,
      eventId,
      guestId,
      expectedVersion: Number(formData.get("expectedVersion")),
      givenName: String(formData.get("givenName") ?? "") || undefined,
      familyName: String(formData.get("familyName") ?? "") || undefined,
      preferredName: String(formData.get("preferredName") ?? "") || undefined,
      email: String(formData.get("email") ?? "") || undefined,
      phone: String(formData.get("phone") ?? "") || undefined,
      dietaryRequirement: String(formData.get("dietaryRequirement") ?? "") || undefined,
      accessibilityRequirement: String(formData.get("accessibilityRequirement") ?? "") || undefined,
      operationalNote: String(formData.get("operationalNote") ?? "") || undefined,
      lifecycle: String(formData.get("lifecycle") ?? "") || undefined,
      replaceVerifiedField: formData.get("replaceVerifiedField") === "true",
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}`);
  });
}

export async function resolveDuplicateAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const organisation = runtime.service.listOrganisations(actor)[0];
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests?error=`;
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.resolveGuestDuplicate(actor, {
      organisationId: organisation.id,
      eventId,
      candidateId: String(formData.get("candidateId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      decision: String(formData.get("decision") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/guests`);
  });
}

export async function importGuestsAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests?importError=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.importGuests(actor, {
      organisationId: organisation.id,
      eventId,
      filename: String(formData.get("filename") ?? ""),
      csv: String(formData.get("csv") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/guests`);
  });
}

export async function transitionEventAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const eventId = String(formData.get("eventId") ?? "");
  const settings = `/app/events/${encodeURIComponent(eventId)}/settings?error=`;
  if (!organisation) {
    redirect(`${settings}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.transitionEvent(actor, {
      organisationId: organisation.id,
      eventId,
      expectedVersion: Number(formData.get("expectedVersion")),
      toPhase: String(formData.get("toPhase") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${settings}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/settings`);
  });
}

export async function prepareRsvpAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/rsvp?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.prepareEventRsvp(actor, {
      organisationId: organisation.id,
      eventId,
      hostDisplayName: String(formData.get("hostDisplayName") ?? "") || undefined,
      eventDisplayName: String(formData.get("eventDisplayName") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "Prepare guest RSVP"),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/rsvp`);
  });
}

export async function upsertRsvpPolicyAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/rsvp/policy?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.upsertRsvpPolicy(actor, {
      organisationId: organisation.id,
      eventId,
      hostDisplayName: String(formData.get("hostDisplayName") ?? ""),
      eventDisplayName: String(formData.get("eventDisplayName") ?? ""),
      privacyNotice: String(formData.get("privacyNotice") ?? ""),
      amendmentsPermitted: formData.get("amendmentsPermitted") === "1",
      companionsPermitted: formData.get("companionsPermitted") === "1",
      defaultCompanionAllowance: Number(formData.get("defaultCompanionAllowance") ?? 0),
      expectedVersion: Number(formData.get("expectedVersion") || 0) || undefined,
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/rsvp/policy`);
  });
}

export async function issueRsvpInvitationAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guestId)}?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  let token = "";
  try {
    const issued = runtime.service.issueRsvpInvitation(actor, {
      organisationId: organisation.id,
      eventId,
      guestId,
      reason: String(formData.get("reason") ?? "Issue guest access"),
    });
    token = issued.token;
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?issued=${encodeURIComponent(token)}`);
  });
}

export async function staffEnterRsvpAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guestId)}?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.staffEnterRsvp(actor, {
      organisationId: organisation.id,
      eventId,
      guestId,
      expectedVersion: Number(formData.get("expectedVersion") || 0) || undefined,
      attendanceIntent: String(formData.get("attendanceIntent") ?? ""),
      withdraw: formData.get("withdraw") === "1",
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}`);
  });
}

export async function reviewRsvpExceptionAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/rsvp/exceptions?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.reviewRsvpException(actor, {
      organisationId: organisation.id,
      eventId,
      exceptionId: String(formData.get("exceptionId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      decision: String(formData.get("decision") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/rsvp/exceptions`);
  });
}

export async function acknowledgeAssistanceAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/rsvp/exceptions?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  try {
    runtime.service.acknowledgeAssistance(actor, {
      organisationId: organisation.id,
      eventId,
      assistanceId: String(formData.get("assistanceId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      status: String(formData.get("status") ?? "ACKNOWLEDGED"),
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/rsvp/exceptions`);
  });
}

function invitationToken(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return decoded.startsWith("/rsvp/") ? decoded.slice("/rsvp/".length) : decoded;
}

export async function exchangeGuestAccessAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const token = invitationToken(String(formData.get("token") ?? ""));
  const access = await import("./guest-access");
  try {
    const exchanged = getRuntime().service.exchangeGuestAccess(token);
    await access.setGuestSessionCookie(exchanged.sessionToken);
  } catch {
    redirect("/rsvp/unavailable");
  }
  redirect("/rsvp");
  });
}

export async function submitGuestRsvpAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const token = await (await import("./guest-access")).readGuestSessionCookie();
  if (!token) {
    redirect("/rsvp/unavailable");
  }
  const runtime = getRuntime();
  try {
    runtime.service.saveGuestRsvp(token, {
      expectedVersion: Number(formData.get("expectedVersion") || 0) || undefined,
      submit: formData.get("submit") === "1",
      answers: {
        attendanceIntent: String(formData.get("attendanceIntent") ?? "") || undefined,
        dietary: String(formData.get("dietary") ?? "") || undefined,
        accessibility: String(formData.get("accessibility") ?? "") || undefined,
        assistanceRequested: formData.get("assistanceRequested") === "1",
        assistanceNote: String(formData.get("assistanceNote") ?? "") || undefined,
        sensitiveConsent: formData.get("sensitiveConsent") === "1",
        companionCount: Number(formData.get("companionCount") || 0) || undefined,
        companionNames: String(formData.get("companionNames") ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    });
  } catch (error) {
    redirect(`/rsvp?error=${encodeURIComponent(actionError(error))}`);
  }
  if (formData.get("submit") === "1") {
    redirect("/rsvp/confirmed");
  }
  redirect("/rsvp");
  });
}

export async function logoutGuestRsvpAction(): Promise<void> {
  return await withDurable(async () => {
  const access = await import("./guest-access");
  const token = await access.readGuestSessionCookie();
  if (token) {
    try {
      getRuntime().service.logoutGuestSession(token);
    } catch {
      // Session may already be unavailable.
    }
  }
  await access.clearGuestSessionCookie();
  redirect("/rsvp/unavailable");
  });
}

function commsFail(eventId: string, path: string, error: unknown): never {
  redirect(`/app/events/${encodeURIComponent(eventId)}/communications/${path}?error=${encodeURIComponent(actionError(error))}`);
}

function commsOrg(actor: Awaited<ReturnType<typeof requireActor>>["actor"], eventId: string, path: string) {
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) commsFail(eventId, path, new Error("No organisation assignment is available."));
  return organisation;
}

export async function prepareCommunicationsAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "");
    getRuntime().service.prepareCommunications(actor, {
      organisationId: organisation.id,
      eventId,
      reason: String(formData.get("reason") ?? "Prepare guest communications"),
    });
  } catch (error) {
    commsFail(eventId, "", error);
  }
  redirect(`/app/events/${eventId}/communications`);
  });
}

export async function publishChannelPolicyAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "policy");
    getRuntime().service.publishChannelPolicy(actor, {
      organisationId: organisation.id,
      eventId,
      expectedVersion: Number(formData.get("expectedVersion")),
      quietHoursStart: String(formData.get("quietHoursStart") ?? "") || undefined,
      quietHoursEnd: String(formData.get("quietHoursEnd") ?? "") || undefined,
      frequencyCapPerDay: Number(formData.get("frequencyCapPerDay") || 0) || undefined,
      acknowledgementMinutes: Number(formData.get("acknowledgementMinutes") || 0) || undefined,
      sandboxDispatchEnabled: formData.get("sandboxDispatchEnabled") === "1",
      reason: String(formData.get("reason") ?? "Publish channel policy"),
    });
  } catch (error) {
    commsFail(eventId, "policy", error);
  }
  redirect(`/app/events/${eventId}/communications/policy?status=published`);
  });
}

export async function publishOccasionAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "policy");
    getRuntime().service.publishGuestSafeOccasion(actor, {
      organisationId: organisation.id,
      eventId,
      expectedVersion: Number(formData.get("expectedVersion")),
      verifyWhen: formData.get("verifyWhen") === "1",
      verifyVenue: formData.get("verifyVenue") === "1",
      arrival: String(formData.get("arrival") ?? "") || undefined,
      dress: String(formData.get("dress") ?? "") || undefined,
      context: String(formData.get("context") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "Publish guest-safe occasion"),
    });
  } catch (error) {
    commsFail(eventId, "policy", error);
  }
  redirect(`/app/events/${eventId}/communications/policy?status=occasion-published`);
  });
}

export async function createTemplateVersionAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, `templates/${templateId}`);
    getRuntime().service.createTemplateVersion(actor, {
      organisationId: organisation.id,
      eventId,
      templateId,
      subject: String(formData.get("subject") ?? "") || undefined,
      body: String(formData.get("body") ?? ""),
      reason: String(formData.get("reason") ?? "Create template version"),
    });
  } catch (error) {
    commsFail(eventId, `templates/${templateId}`, error);
  }
  redirect(`/app/events/${eventId}/communications/templates/${templateId}`);
  });
}

export async function approveTemplateAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, `templates/${templateId}`);
    getRuntime().service.approveTemplate(actor, {
      organisationId: organisation.id,
      eventId,
      templateVersionId: String(formData.get("templateVersionId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      reason: String(formData.get("reason") ?? "Approve template"),
    });
  } catch (error) {
    commsFail(eventId, `templates/${templateId}`, error);
  }
  redirect(`/app/events/${eventId}/communications/templates/${templateId}?status=approved`);
  });
}

export async function upsertAudienceAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  let audienceId: string;
  try {
    const organisation = commsOrg(actor, eventId, "audiences");
    const audience = getRuntime().service.upsertAudience(actor, {
      organisationId: organisation.id,
      eventId,
      audienceId: String(formData.get("audienceId") ?? "") || undefined,
      expectedVersion: Number(formData.get("expectedVersion") || 0) || undefined,
      name: String(formData.get("name") ?? ""),
      filters: [
        { predicate: "LIFECYCLE", value: "ACTIVE" },
        { predicate: "HAS_EMAIL", value: "YES" },
      ],
      reason: String(formData.get("reason") ?? "Save audience"),
    });
    audienceId = audience.id;
  } catch (error) {
    commsFail(eventId, "audiences", error);
  }
  redirect(`/app/events/${eventId}/communications/audiences/${audienceId}`);
  });
}

export async function createCampaignAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  let campaignId: string;
  try {
    const organisation = commsOrg(actor, eventId, "campaigns/new");
    const campaign = getRuntime().service.createCampaign(actor, {
      organisationId: organisation.id,
      eventId,
      name: String(formData.get("name") ?? ""),
      purpose: String(formData.get("purpose") ?? "INVITATION"),
      channel: String(formData.get("channel") ?? "EMAIL"),
      templateId: String(formData.get("templateId") ?? ""),
      audienceDefinitionId: String(formData.get("audienceDefinitionId") ?? ""),
      linkedInvitationId: String(formData.get("linkedInvitationId") ?? "") || undefined,
      testOnly: formData.get("testOnly") === "1",
      reason: String(formData.get("reason") ?? "Create campaign"),
    });
    campaignId = campaign.id;
  } catch (error) {
    commsFail(eventId, "campaigns/new", error);
  }
  redirect(`/app/events/${eventId}/communications/campaigns/${campaignId}`);
  });
}

export async function requestCampaignApprovalAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, `campaigns/${campaignId}`);
    getRuntime().service.requestCampaignApproval(actor, {
      organisationId: organisation.id,
      eventId,
      campaignId,
      expectedVersion: Number(formData.get("expectedVersion")),
      reason: String(formData.get("reason") ?? "Request approval"),
    });
  } catch (error) {
    commsFail(eventId, `campaigns/${campaignId}`, error);
  }
  redirect(`/app/events/${eventId}/communications/campaigns/${campaignId}`);
  });
}

export async function decideCampaignAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, `campaigns/${campaignId}`);
    getRuntime().service.decideCampaign(actor, {
      organisationId: organisation.id,
      eventId,
      campaignId,
      expectedVersion: Number(formData.get("expectedVersion")),
      decision: String(formData.get("decision") ?? "APPROVED"),
      comment: String(formData.get("comment") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "Decide campaign"),
    });
  } catch (error) {
    commsFail(eventId, `campaigns/${campaignId}`, error);
  }
  redirect(`/app/events/${eventId}/communications/campaigns/${campaignId}`);
  });
}

export async function actOnCampaignAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, `campaigns/${campaignId}`);
    const action = String(formData.get("action") ?? "RUN");
    getRuntime().service.actOnCampaign(actor, {
      organisationId: organisation.id,
      eventId,
      campaignId,
      expectedVersion: Number(formData.get("expectedVersion")),
      action,
      failMode: String(formData.get("failMode") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "Campaign action"),
    });
  } catch (error) {
    commsFail(eventId, `campaigns/${campaignId}`, error);
  }
  redirect(`/app/events/${eventId}/communications/campaigns/${campaignId}?act=${encodeURIComponent(String(formData.get("action") ?? "RUN"))}`);
  });
}

export async function ingestInboundAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "inbox");
    const sender = String(formData.get("sender") ?? "");
    const body = String(formData.get("body") ?? "");
    const providerMessageId = String(formData.get("providerMessageId") ?? `in-${crypto.randomUUID()}`);
    const signature = getRuntime().service.signSynthetic(`${providerMessageId}:${sender}:${body}`);
    getRuntime().service.ingestInbound(actor, {
      organisationId: organisation.id,
      eventId,
      channel: String(formData.get("channel") ?? "EMAIL"),
      providerMessageId,
      sender,
      body,
      attachmentFileName: String(formData.get("attachmentFileName") ?? "") || undefined,
      signature,
      reason: String(formData.get("reason") ?? "Inject synthetic inbound"),
    });
  } catch (error) {
    commsFail(eventId, "inbox", error);
  }
  redirect(`/app/events/${eventId}/communications/inbox`);
  });
}

export async function resolveUnmatchedAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "unmatched");
    getRuntime().service.resolveUnmatchedInbound(actor, {
      organisationId: organisation.id,
      eventId,
      inboundId: String(formData.get("inboundId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      guestId: String(formData.get("guestId") ?? "") || undefined,
      action: String(formData.get("action") ?? "LINK"),
      reason: String(formData.get("reason") ?? "Resolve unmatched inbound"),
    });
  } catch (error) {
    commsFail(eventId, "unmatched", error);
  }
  redirect(`/app/events/${eventId}/communications/unmatched`);
  });
}

export async function replyOnThreadAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const threadId = String(formData.get("threadId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, `inbox/${threadId}`);
    getRuntime().service.replyOnThread(actor, {
      organisationId: organisation.id,
      eventId,
      threadId,
      body: String(formData.get("body") ?? ""),
      privateNote: String(formData.get("privateNote") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "Concierge reply"),
    });
  } catch (error) {
    commsFail(eventId, `inbox/${threadId}`, error);
  }
  redirect(`/app/events/${eventId}/communications/inbox/${threadId}`);
  });
}

export async function actOnTaskAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "tasks");
    getRuntime().service.actOnTask(actor, {
      organisationId: organisation.id,
      eventId,
      taskId: String(formData.get("taskId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      action: String(formData.get("action") ?? "ACKNOWLEDGE"),
      ownerPersonId: String(formData.get("ownerPersonId") ?? "") || undefined,
      resolution: String(formData.get("resolution") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "Task action"),
    });
  } catch (error) {
    commsFail(eventId, "tasks", error);
  }
  redirect(`/app/events/${eventId}/communications/tasks`);
  });
}

function correctionDecisionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("different named human")) {
    return "A different authorised person must review this correction. You cannot decide a proposal you made.";
  }
  if (message.includes("attribution is unavailable")) {
    return "This correction cannot be decided because proposer attribution is unavailable. Recreate the proposal.";
  }
  if (error instanceof PlatformError && error.code === "VERSION_CONFLICT") {
    return "This correction or guest record changed while you were reviewing. Reload before deciding. Canonical contact information is unchanged.";
  }
  if (message.includes("expected version") || message.includes("VERSION_CONFLICT")) {
    return "This correction or guest record changed while you were reviewing. Reload before deciding. Canonical contact information is unchanged.";
  }
  return actionError(error);
}

export async function decideCorrectionAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "corrections");
    getRuntime().service.decideContactCorrection(actor, {
      organisationId: organisation.id,
      eventId,
      correctionId: String(formData.get("correctionId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      decision,
      reason: String(formData.get("reason") ?? "Decide contact correction"),
    });
  } catch (error) {
    redirect(
      `/app/events/${encodeURIComponent(eventId)}/communications/corrections?error=${encodeURIComponent(correctionDecisionError(error))}`,
    );
  }
  const status = decision === "REJECTED" ? "rejected" : "applied";
  redirect(`/app/events/${eventId}/communications/corrections?status=${status}`);
  });
}

export async function proposeCorrectionAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, "unmatched");
    getRuntime().service.proposeContactCorrection(actor, {
      organisationId: organisation.id,
      eventId,
      guestId: String(formData.get("guestId") ?? ""),
      channel: String(formData.get("channel") ?? "EMAIL"),
      proposedValue: String(formData.get("proposedValue") ?? ""),
      sourceMessageId: String(formData.get("sourceMessageId") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "Propose contact correction"),
    });
  } catch (error) {
    commsFail(eventId, "unmatched", error);
  }
  redirect(`/app/events/${eventId}/communications/unmatched?status=correction-proposed`);
  });
}

export async function applySyntheticCallbackAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const organisation = commsOrg(actor, eventId, `campaigns/${campaignId}`);
    const providerRequestKey = String(formData.get("providerRequestKey") ?? "");
    const type = String(formData.get("type") ?? "DELIVERED");
    const providerEventId = String(formData.get("providerEventId") ?? `cb-${crypto.randomUUID()}`);
    const signature = getRuntime().service.signSynthetic(`${providerRequestKey}:${type}:${providerEventId}`);
    getRuntime().service.applySyntheticCallback(actor, {
      organisationId: organisation.id,
      eventId,
      providerRequestKey,
      providerEventId,
      type,
      signature,
    });
  } catch (error) {
    commsFail(eventId, `campaigns/${campaignId}`, error);
  }
  redirect(`/app/events/${eventId}/communications/campaigns/${campaignId}`);
  });
}

function guestFail(eventId: string, guestId: string, error: unknown): never {
  sessionOrAssignmentRedirect(error, `/app/events/${eventId}/guests/${guestId}`);
  const classified = classifyActionError(error);
  const permissionChanged = classified.code === "FORBIDDEN" ? "&hint=permission" : "";
  redirect(
    `/app/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guestId)}?${failQuery(error)}${permissionChanged}`,
  );
}

function optionalFormValue(formData: FormData, name: string): string | undefined {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value : undefined;
}

export async function updateGuestAddressingAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guestId)}?error=`;
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
  }
  const confirm = formData.get("confirm") === "true";
  try {
    getRuntime().service.updateGuestAddressing(actor, {
      organisationId: organisation.id,
      eventId,
      guestId,
      expectedVersion: Number(formData.get("expectedVersion")),
      honorific: optionalFormValue(formData, "honorific"),
      clearHonorific: formData.get("clearHonorific") === "true" || formData.get("honorific") === "",
      professionalTitle: optionalFormValue(formData, "professionalTitle"),
      traditionalTitle: optionalFormValue(formData, "traditionalTitle"),
      middleNames: optionalFormValue(formData, "middleNames"),
      preferredDisplayName: optionalFormValue(formData, "preferredDisplayName"),
      preferredFormalSalutation: optionalFormValue(formData, "preferredFormalSalutation"),
      pronunciationNote: optionalFormValue(formData, "pronunciationNote"),
      addressingSource: optionalFormValue(formData, "addressingSource") ?? "STAFF",
      ...(confirm
        ? { addressingStatus: optionalFormValue(formData, "addressingStatus") ?? "HOST_CONFIRMED" }
        : {}),
      ageBand: optionalAgeBand(String(formData.get("ageBand") ?? "")),
      postNominals: optionalList(String(formData.get("postNominals") ?? "")),
      reason: String(formData.get("reason") ?? ""),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=addressing`);
  });
}

export async function nominateCompanionAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  try {
    getRuntime().service.nominateCompanion(actor, {
      organisationId: organisation.id,
      eventId,
      entitlementId: String(formData.get("entitlementId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      guestId: optionalFormValue(formData, "nominatedGuestId"),
      suppliedGivenName: optionalFormValue(formData, "suppliedGivenName"),
      suppliedFamilyName: optionalFormValue(formData, "suppliedFamilyName"),
      suppliedEmail: optionalFormValue(formData, "suppliedEmail"),
      reason: String(formData.get("reason") ?? "Nominate companion"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=nominate`);
  });
}

export async function reconcileCompanionNamesAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  try {
    getRuntime().service.reconcileCompanionNames(actor, {
      organisationId: organisation.id,
      eventId,
      guestId,
      reason: String(formData.get("reason") ?? "Reconcile S03 companion names"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=reconcile`);
  });
}

export async function createResponsibleAdultLinkAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  try {
    getRuntime().service.createResponsibleAdultLink(actor, {
      organisationId: organisation.id,
      eventId,
      childGuestId: guestId,
      responsibleAdultGuestId: String(formData.get("responsibleAdultGuestId") ?? ""),
      scope: optionalFormValue(formData, "scope") ?? "EVENT",
      reason: String(formData.get("reason") ?? "Record responsible adult"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=child`);
  });
}

export async function endResponsibleAdultLinkAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const { actor } = await requireActor().catch((error) => {
    const eventId = String(formData.get("eventId") ?? "");
    const guestId = String(formData.get("guestId") ?? "");
    guestFail(eventId, guestId, error);
  });
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  try {
    getRuntime().service.endResponsibleAdultLink(actor, {
      organisationId: organisation.id,
      eventId,
      linkId: String(formData.get("linkId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      reason: String(formData.get("reason") ?? "End responsible-adult link"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=child`);
  });
}

export async function createGuestPartyAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const { actor } = await requireActor().catch((error) => guestFail(eventId, guestId, error));
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  try {
    const principalGuestId = optionalFormValue(formData, "principalGuestId");
    const party = getRuntime().service.createGuestParty(actor, {
      organisationId: organisation.id,
      eventId,
      type: String(formData.get("type") ?? ""),
      label: String(formData.get("label") ?? ""),
      principalGuestId,
      reason: String(formData.get("reason") ?? "Create operational party"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
    getRuntime().service.addGuestPartyMember(actor, {
      organisationId: organisation.id,
      eventId,
      partyId: party.id,
      guestId,
      expectedPartyVersion: party.version,
      role: principalGuestId === guestId ? "PRINCIPAL" : "MEMBER",
      reason: String(formData.get("reason") ?? "Add creating guest as an explicit party member"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=party`);
  });
}

export async function addGuestPartyMemberAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const { actor } = await requireActor().catch((error) => guestFail(eventId, guestId, error));
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  try {
    getRuntime().service.addGuestPartyMember(actor, {
      organisationId: organisation.id,
      eventId,
      partyId: String(formData.get("partyId") ?? ""),
      guestId: String(formData.get("memberGuestId") ?? ""),
      expectedPartyVersion: Number(formData.get("expectedPartyVersion")),
      role: String(formData.get("role") ?? "MEMBER"),
      reason: String(formData.get("reason") ?? "Add party member"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=member`);
  });
}

export async function removeGuestPartyMemberAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const { actor } = await requireActor().catch((error) => guestFail(eventId, guestId, error));
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  try {
    getRuntime().service.removeGuestPartyMember(actor, {
      organisationId: organisation.id,
      eventId,
      partyMemberId: String(formData.get("partyMemberId") ?? ""),
      expectedVersion: Number(formData.get("expectedVersion")),
      reason: String(formData.get("reason") ?? "Remove party member"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=member`);
  });
}

export async function administerCompanionEntitlementAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
  const eventId = String(formData.get("eventId") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const { actor } = await requireActor().catch((error) => guestFail(eventId, guestId, error));
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
  const authorityKind = String(formData.get("authorityKind") ?? "");
  const authorityId = String(formData.get("authorityId") ?? "");
  const status = optionalFormValue(formData, "status");
  try {
    getRuntime().service.administerCompanionEntitlement(actor, {
      organisationId: organisation.id,
      eventId,
      principalGuestId: guestId,
      allowance: Number(formData.get("allowance")),
      authority:
        authorityKind === "RSVP_POLICY_DEFAULT"
          ? { kind: "RSVP_POLICY_DEFAULT" as const, rsvpPolicyId: authorityId }
          : { kind: "RSVP_ENTITLEMENT" as const, rsvpEntitlementId: authorityId },
      ...(status ? { status } : {}),
      reason: String(formData.get("reason") ?? "Administer companion entitlement"),
      idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
    });
  } catch (error) {
    const classified = classifyActionError(error);
    if (classified.code === "FORBIDDEN" && status === "EXCEPTION_REVIEW") {
      redirect(
        `/app/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guestId)}?state=FORBIDDEN&hint=permission&error=${encodeURIComponent(classified.message)}`,
      );
    }
    guestFail(eventId, guestId, error);
  }
  redirect(`/app/events/${eventId}/guests/${guestId}?ok=entitlement`);
  });
}

export async function createGuestRelationshipAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const eventId = String(formData.get("eventId") ?? "");
    const guestId = String(formData.get("guestId") ?? "");
    const { actor } = await requireActor().catch((error) => guestFail(eventId, guestId, error));
    const organisation = getRuntime().service.listOrganisations(actor)[0];
    if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
    try {
      getRuntime().service.createGuestRelationship(actor, {
        organisationId: organisation.id,
        eventId,
        fromGuestId: guestId,
        toGuestId: String(formData.get("toGuestId") ?? ""),
        type: String(formData.get("type") ?? ""),
        direction: String(formData.get("direction") ?? "FORWARD"),
        source: String(formData.get("source") ?? "STAFF"),
        visibility: String(formData.get("visibility") ?? "STAFF"),
        reason: String(formData.get("reason") ?? "Declare relationship"),
        idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
      });
    } catch (error) {
      guestFail(eventId, guestId, error);
    }
    redirect(`/app/events/${eventId}/guests/${guestId}?ok=relationship`);
  });
}

export async function administerGuestRelationshipAction(formData: FormData): Promise<void> {
  return await withDurable(async () => {
    const eventId = String(formData.get("eventId") ?? "");
    const guestId = String(formData.get("guestId") ?? "");
    const { actor } = await requireActor().catch((error) => guestFail(eventId, guestId, error));
    const organisation = getRuntime().service.listOrganisations(actor)[0];
    if (!organisation) guestFail(eventId, guestId, new Error("No organisation assignment is available."));
    try {
      getRuntime().service.administerGuestRelationship(actor, {
        organisationId: organisation.id,
        eventId,
        relationshipId: String(formData.get("relationshipId") ?? ""),
        expectedVersion: Number(formData.get("expectedVersion")),
        type: optionalFormValue(formData, "type"),
        status: optionalFormValue(formData, "status"),
        source: optionalFormValue(formData, "source"),
        reason: String(formData.get("reason") ?? "Amend declared relationship"),
        idempotencyKey: optionalFormValue(formData, "idempotencyKey"),
      });
    } catch (error) {
      guestFail(eventId, guestId, error);
    }
    redirect(`/app/events/${eventId}/guests/${guestId}?ok=relationship`);
  });
}
