import { PlatformError } from "@maison-doclar/shared-platform";
import { redirect } from "next/navigation";
import { GuestFrame } from "../../components/guest-frame";
import { GuestLogoutForm, GuestRsvpForm } from "../../components/guest-rsvp-form";
import { readGuestSessionCookie } from "../../server/guest-access";
import { getRuntime } from "../../server/runtime";

export default async function GuestRsvpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const token = await readGuestSessionCookie();
  if (!token) redirect("/rsvp/unavailable");
  const error = (await searchParams).error;
  try {
    const view = getRuntime().service.guestSelfServiceView(token);
    return (
      <GuestFrame host={view.hostDisplayName} eventName={view.eventDisplayName}>
        <p className="guest-welcome">
          {view.guestDisplayName}, you are invited to respond for this occasion. This is not an admission or
          check-in.
        </p>
        {view.confirmation ? (
          <p className="md-status" data-tone="ok" role="status">
            A response is already recorded. You may update it if the host still permits changes.
          </p>
        ) : null}
        <GuestRsvpForm view={view} error={error} />
        <GuestLogoutForm />
      </GuestFrame>
    );
  } catch (caught) {
    if (caught instanceof PlatformError) redirect("/rsvp/unavailable");
    throw caught;
  }
}
