"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  NonProductionIdentityAdapter,
  PlatformError,
  SESSION_COOKIE,
  issueSession,
} from "@maison-doclar/shared-platform";
import { cookieSecure, fixturesAllowed, sessionConfig, sessionTtlSeconds } from "./config";
import { getRuntime } from "./runtime";
import { requireActor } from "./with-session";

function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export async function signInAction(formData: FormData): Promise<void> {
  const next = safeNextPath(String(formData.get("next") ?? "/app"));
  const fail = `/sign-in?next=${encodeURIComponent(next)}&error=`;
  if (!fixturesAllowed()) {
    redirect(`${fail}${encodeURIComponent("The non-production identity adapter cannot be used here.")}`);
  }
  const email = String(formData.get("email") ?? "");
  const accessToken = String(formData.get("accessToken") ?? "");
  const denied = `${fail}${encodeURIComponent("Sign in failed. Check the named identity and access token.")}`;
  let token: string;
  try {
    const identity = new NonProductionIdentityAdapter(true).resolve({
      externalSubject: email,
      email,
    });
    const runtime = getRuntime();
    const person = runtime.service.findPersonByIdentity({
      externalSubject: identity.externalSubject,
      email,
    });
    if (!person) {
      throw new PlatformError("AUTH_REQUIRED", "unrecognised identity");
    }
    token = issueSession({ personId: person.id, accessToken }, sessionConfig());
    runtime.service.recordAuthentication(person.id, new Date().toISOString(), crypto.randomUUID(), "SUCCESS");
    (await cookies()).set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      path: "/",
      maxAge: sessionTtlSeconds(),
    });
  } catch (error) {
    if (error instanceof PlatformError && (error.code === "AUTH_REQUIRED" || error.code === "VALIDATION_FAILED")) {
      redirect(denied);
    }
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  (await cookies()).set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 0,
  });
  redirect("/sign-in");
}

function toIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function actionError(error: unknown): string {
  if (error instanceof PlatformError) {
    return [error.publicMessage, ...(error.details ?? [])].filter(Boolean).join(" ");
  }
  return "The request could not be completed.";
}

export async function createClientAction(formData: FormData): Promise<void> {
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
}

export async function createEventAction(formData: FormData): Promise<void> {
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
}

export async function grantAssignmentAction(formData: FormData): Promise<void> {
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
}

export async function intakeGuestAction(formData: FormData): Promise<void> {
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const eventId = String(formData.get("eventId") ?? "");
  const fail = `/app/events/${encodeURIComponent(eventId)}/guests/new?error=`;
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    redirect(`${fail}${encodeURIComponent("No organisation assignment is available.")}`);
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
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(`${fail}${encodeURIComponent(actionError(error))}`);
  }
  redirect(`/app/events/${eventId}/guests/${guest.id}`);
}

export async function amendGuestAction(formData: FormData): Promise<void> {
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
}

export async function resolveDuplicateAction(formData: FormData): Promise<void> {
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
}

export async function importGuestsAction(formData: FormData): Promise<void> {
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
}

export async function transitionEventAction(formData: FormData): Promise<void> {
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
}

export async function prepareRsvpAction(formData: FormData): Promise<void> {
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
}

export async function upsertRsvpPolicyAction(formData: FormData): Promise<void> {
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
}

export async function issueRsvpInvitationAction(formData: FormData): Promise<void> {
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
}

export async function staffEnterRsvpAction(formData: FormData): Promise<void> {
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
}

export async function reviewRsvpExceptionAction(formData: FormData): Promise<void> {
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
}

export async function acknowledgeAssistanceAction(formData: FormData): Promise<void> {
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
  const token = invitationToken(String(formData.get("token") ?? ""));
  const access = await import("./guest-access");
  try {
    const exchanged = getRuntime().service.exchangeGuestAccess(token);
    await access.setGuestSessionCookie(exchanged.sessionToken);
  } catch {
    redirect("/rsvp/unavailable");
  }
  redirect("/rsvp");
}

export async function submitGuestRsvpAction(formData: FormData): Promise<void> {
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
}

export async function logoutGuestRsvpAction(): Promise<void> {
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
}
