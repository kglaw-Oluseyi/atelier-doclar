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
