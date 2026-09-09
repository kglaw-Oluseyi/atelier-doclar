import { GuestFrame } from "../../../../components/guest-frame";
import { ClientSessionNav } from "../../../../components/client-session-nav";
import { formatMoneyMinor, PlatformError } from "@maison-doclar/shared-platform";
import { IdempotencyField, PendingSubmit } from "../../../../components/atelier-pending-submit";
import { recordClientInvestmentAction } from "../../../../server/actions";
import { getRuntime, ensureRuntime } from "../../../../server/runtime";

export default async function ClientInvestmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  await ensureRuntime();
  let projection;
  try {
    projection = getRuntime().service.getClientDiscoveryProjection(token);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "This review link is not available.";
    return (
      <GuestFrame host="Maison Doclar" eventName="Client investment">
        <p>{message}</p>
      </GuestFrame>
    );
  }
  const investment = projection.investment;
  return (
    <GuestFrame host="Maison Doclar" eventName={projection.engagementReference}>
      <ClientSessionNav token={token} current="investment" />
      <section className="form programme-form" data-testid="client-investment">
        <h2>Planning investment</h2>
        <p className="lede">This is a client planning conversation. It is not Budget Studio and it does not authorise payment or booking.</p>
        {query.ok === "1" ? <p data-testid="client-investment-receipt">Your investment preference was recorded as a proposal.</p> : null}
        <p>Envelope status: {investment.envelopeStatus.replaceAll("_", " ").toLowerCase()}</p>
        <p>Stated envelope: {investment.envelopeMinor ? formatMoneyMinor(investment.envelopeMinor) : "not shared"}</p>
        <p>
          Planning forecast range:{" "}
          {investment.forecastLowMinor && investment.forecastHighMinor
            ? `${formatMoneyMinor(investment.forecastLowMinor)} to ${formatMoneyMinor(investment.forecastHighMinor)}`
            : "not yet calculated"}
        </p>
        <p>Forecast maturity: {String(investment.forecastStatus).toLowerCase()}</p>
        <p>Protected priorities: {investment.protectedPriorities.join(" · ") || "none recorded yet"}</p>
        <ul>
          {investment.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
        {investment.scenarioChoices.length ? (
          <ul className="atelier-queue" data-testid="client-investment-scenarios">
            {investment.scenarioChoices.map((item) => (
              <li key={item.purpose}>
                {item.purpose.replaceAll("_", " ").toLowerCase()} · {item.status.toLowerCase()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No client-visible scenario choices yet.</p>
        )}
        <form action={recordClientInvestmentAction}>
          <IdempotencyField />
          <input type="hidden" name="token" value={token} />
          <label>
            What would you like to record
            <select name="kind" defaultValue="NO_ENVELOPE">
              <option value="CONFIRM_ENVELOPE">Confirm an envelope</option>
              <option value="NO_ENVELOPE">No envelope has been decided</option>
              <option value="CORRECT_AMOUNT">Correct an amount</option>
              <option value="CHOOSE_SCENARIO">Choose a presented scenario</option>
              <option value="REJECT_SCENARIO">Reject a presented scenario</option>
              <option value="CONFIRM_PRIORITIES">Confirm priorities independently of spend</option>
              <option value="CLARIFY">Request clarification</option>
              <option value="DEFER">Defer</option>
              <option value="PREFER_NOT">Prefer not to disclose</option>
            </select>
          </label>
          <label>
            Amount in kobo, if you are sharing one
            <input name="amountMinor" inputMode="numeric" pattern="[0-9]*" />
          </label>
          <label>
            Scenario, if choosing or rejecting one
            <input name="scenarioPurpose" maxLength={80} />
          </label>
          <label>
            Note
            <textarea name="narrative" maxLength={400} rows={3} />
          </label>
          <PendingSubmit>Record my preference</PendingSubmit>
        </form>
      </section>
    </GuestFrame>
  );
}
