import { FULFILMENT_STATES, PlatformError } from "@maison-doclar/shared-platform";
import { redirect } from "next/navigation";
import { VendorFrame } from "../../components/vendor-frame";
import { IdempotencyField, PendingSubmit } from "../../components/atelier-pending-submit";
import { vendorLogoutAction, vendorSubmitUpdateAction } from "../../server/actions";
import { readVendorSessionCookie } from "../../server/vendor-access";
import { getRuntime } from "../../server/runtime";

export default async function VendorPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; state?: string }>;
}) {
  const token = await readVendorSessionCookie();
  if (!token) redirect("/vendor/unavailable");
  const query = await searchParams;
  try {
    const { ensureRuntime } = await import("../../server/runtime");
    await ensureRuntime();
    const view = getRuntime().service.vendorPortalView(token);
    return (
      <VendorFrame vendorName={view.vendorDisplayName}>
        {query.ok ? (
          <p className="md-status" data-tone="ok" role="status" data-testid="vendor-update-success">
            The attributed milestone was recorded for review.
          </p>
        ) : null}
        {query.state === "conflict" ? (
          <p className="alert" data-tone="danger" role="alert">
            This fulfilment changed. Reload before reporting again.
          </p>
        ) : null}
        {query.error ? (
          <p className="alert" data-tone="danger" role="alert">
            {query.error}
          </p>
        ) : null}
        <p data-testid="vendor-scope">
          You can see {view.fulfilments.length} assigned fulfilments. Guest list, RSVP and core records stay hidden.
        </p>
        {view.fulfilments.map((item) => (
          <article key={item.id} className="vendor-card">
            <h2 className="guest-name">{item.displayName}</h2>
            <p>
              {item.itemName}
              {item.variantLabel ? ` · ${item.variantLabel}` : ""} · ref {item.vendorReference}
            </p>
            <p>Current milestone: {item.milestoneStatus.replaceAll("_", " ")}</p>
            <form action={vendorSubmitUpdateAction}>
              <input type="hidden" name="assignmentId" value={view.assignmentId} />
              <input type="hidden" name="fulfilmentId" value={item.id} />
              <input type="hidden" name="expectedFulfilmentVersion" value={item.version} />
              <IdempotencyField />
              <label>
                Report milestone
                <select name="reportedState" defaultValue={item.milestoneStatus} required>
                  {FULFILMENT_STATES.filter((state) => state !== "OFFERED").map((state) => (
                    <option key={state} value={state}>
                      {state.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason
                <input name="reason" required defaultValue="Vendor operational update" />
              </label>
              <PendingSubmit>Submit attributed update</PendingSubmit>
            </form>
          </article>
        ))}
        <form action={vendorLogoutAction}>
          <button type="submit" className="secondary">
            End vendor session
          </button>
        </form>
      </VendorFrame>
    );
  } catch (error) {
    if (error instanceof PlatformError) redirect("/vendor/unavailable");
    throw error;
  }
}
