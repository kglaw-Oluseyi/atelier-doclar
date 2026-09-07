import { PlatformError } from "@maison-doclar/shared-platform";
import { redirect } from "next/navigation";
import { GuestFrame } from "../../components/guest-frame";
import { GuestMerchandiseForm } from "../../components/guest-merchandise-form";
import { GuestLogoutForm, GuestRsvpForm } from "../../components/guest-rsvp-form";
import { readGuestSessionCookie } from "../../server/guest-access";
import { getRuntime } from "../../server/runtime";

export default async function GuestRsvpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const token = await readGuestSessionCookie();
  if (!token) redirect("/rsvp/unavailable");
  const query = await searchParams;
  const error = query.error;
  try {
    const { ensureRuntime } = await import("../../server/runtime");
    await ensureRuntime();
    const view = getRuntime().service.guestSelfServiceView(token);
    let merchandise;
    try {
      merchandise = getRuntime().service.guestMerchandiseView(token);
    } catch {
      merchandise = undefined;
    }
    return (
      <GuestFrame host={view.hostDisplayName} eventName={view.eventDisplayName}>
        <p className="guest-welcome">
          {view.guestDisplayName}, you are invited to respond for this occasion. This is not an admission or
          check-in.
        </p>
        {query.ok === "merchandise" ? (
          <p className="md-status" data-tone="ok" role="status">
            Your private merchandise choice was recorded. It does not change your RSVP.
          </p>
        ) : null}
        {query.ok === "cap" ? (
          <p className="md-status" data-tone="ok" role="status">
            The consented cap circumference was stored for the named fila only.
          </p>
        ) : null}
        {query.ok === "cap-withdrawn" ? (
          <p className="md-status" data-tone="ok" role="status">
            Cap-measurement consent was withdrawn.
          </p>
        ) : null}
        {view.occasion?.published ? (
          <section className="guest-occasion" aria-label="Occasion">
            {view.occasion.when ? <p>{view.occasion.when}</p> : null}
            {view.occasion.venue ? <p>{view.occasion.venue}</p> : null}
            {view.occasion.arrival ? <p>{view.occasion.arrival}</p> : null}
            {view.occasion.dress ? <p>{view.occasion.dress}</p> : null}
          </section>
        ) : null}
        {view.confirmation ? (
          <p className="md-status" data-tone="ok" role="status">
            A response is already recorded. You may update it if the host still permits changes.
          </p>
        ) : null}
        <GuestRsvpForm view={view} error={error} />
        {merchandise ? <GuestMerchandiseForm projection={merchandise} guestId={merchandise.guestId} /> : null}
        <GuestLogoutForm />
      </GuestFrame>
    );
  } catch (caught) {
    if (caught instanceof PlatformError) redirect("/rsvp/unavailable");
    throw caught;
  }
}
