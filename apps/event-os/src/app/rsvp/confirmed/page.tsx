import { PlatformError } from "@maison-doclar/shared-platform";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GuestFrame } from "../../../components/guest-frame";
import { GuestLogoutForm } from "../../../components/guest-rsvp-form";
import { readGuestSessionCookie } from "../../../server/guest-access";
import { getRuntime } from "../../../server/runtime";

function labelFor(intent: string): string {
  if (intent === "ATTENDING") return "You will attend";
  if (intent === "NOT_ATTENDING") return "You will not attend";
  if (intent === "UNCERTAIN") return "You are still deciding";
  return "Your response has been received";
}

export default async function GuestRsvpConfirmedPage() {
  const token = await readGuestSessionCookie();
  if (!token) redirect("/rsvp/unavailable");
  try {
    const view = getRuntime().service.guestSelfServiceView(token);
    return (
      <GuestFrame host={view.hostDisplayName} eventName={view.eventDisplayName}>
        <h2>Thank you</h2>
        <p className="lede" role="status">
          {labelFor(view.attendanceIntent)}. The host team can see this response. It is not an admission decision.
        </p>
        {view.amendmentsPermitted ? (
          <p>
            <Link href="/rsvp">Update your response</Link>
          </p>
        ) : null}
        <GuestLogoutForm />
      </GuestFrame>
    );
  } catch (error) {
    if (error instanceof PlatformError) redirect("/rsvp/unavailable");
    throw error;
  }
}
