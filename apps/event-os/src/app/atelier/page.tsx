import { redirect } from "next/navigation";
import { HostAtelierFrame } from "../../components/host-atelier-frame";
import { HostAtelierView } from "../../components/host-atelier-view";
import { hostClockNow, readAtelierSessionCookie } from "../../server/atelier-host-access";
import { getRuntime } from "../../server/runtime";

export default async function HostAtelierPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const token = await readAtelierSessionCookie();
  if (!token) redirect("/atelier/unavailable");
  const query = await searchParams;
  try {
    const { ensureRuntime } = await import("../../server/runtime");
    await ensureRuntime();
    const view = getRuntime().service.hostAtelierView(token, hostClockNow());
    return (
      <HostAtelierFrame eventName={view.eventName} hostName={view.hostDisplayName}>
        <HostAtelierView view={view} state={query.state} />
      </HostAtelierFrame>
    );
  } catch {
    redirect("/atelier/unavailable");
  }
}
