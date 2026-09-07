import { redirect } from "next/navigation";
import { GuestFrame } from "../../components/guest-frame";
import { GuestMerchandiseForm } from "../../components/guest-merchandise-form";
import { merchandiseGuestLogoutAction } from "../../server/actions";
import { readMerchandiseGuestSessionCookie } from "../../server/merchandise-guest-access";
import { isPlatformErrorLike } from "../../server/operational-state";
import { getRuntime } from "../../server/runtime";

export default async function PrivateMerchandisePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const token = await readMerchandiseGuestSessionCookie();
  if (!token) redirect("/offers/unavailable");
  const query = await searchParams;
  try {
    const { ensureRuntime } = await import("../../server/runtime");
    await ensureRuntime();
    const view = getRuntime().service.guestMerchandiseView(token);
    return (
      <GuestFrame host="Maison Doclar" eventName="Private merchandise">
        <p className="guest-welcome">
          These offers are private to this guest. This access is not an invitation, RSVP or admission right.
        </p>
        {query.ok === "merchandise" ? (
          <p className="md-status" data-tone="ok" role="status">
            Your private merchandise choice was recorded. It does not change RSVP or attendance.
          </p>
        ) : null}
        {query.ok === "cap" ? (
          <p className="md-status" data-tone="ok" role="status">
            The consented cap circumference was stored for the named fila only.
          </p>
        ) : null}
        {query.ok === "cap-withdrawn" ? (
          <p className="md-status" data-tone="ok" role="status">
            Cap-measurement consent was withdrawn. The value is no longer available.
          </p>
        ) : null}
        {query.error ? (
          <p className="alert" data-tone="danger" role="alert">
            {query.error}
          </p>
        ) : null}
        <GuestMerchandiseForm projection={view} guestId={view.guestId} surface="offers" />
        <form action={merchandiseGuestLogoutAction}>
          <button type="submit" className="secondary">
            End private merchandise session
          </button>
        </form>
      </GuestFrame>
    );
  } catch (caught) {
    if (caught && typeof caught === "object" && "digest" in caught && String((caught as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw caught;
    }
    if (isPlatformErrorLike(caught)) redirect("/offers/unavailable");
    throw caught;
  }
}
