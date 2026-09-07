import type { EventForecastWorkspace } from "@maison-doclar/shared-platform";
import {
  approveHostForecastProjectionAction,
  createEventForecastParameterSetAction,
  decideForecastOverrideAction,
  decideProvisionRecommendationAction,
  evaluateForecastAction,
  proposeForecastOverrideAction,
  proposeProvisionRecommendationAction,
  recordForecastCalibrationAction,
  runAttendanceForecastAction,
} from "../server/actions";
import { AtelierEmptyState } from "./atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

function RangeBand({
  label,
  low,
  expected,
  high,
  max,
  testId,
}: {
  label: string;
  low: number;
  expected: number;
  high: number;
  max: number;
  testId: string;
}) {
  const cap = Math.max(max, high, 1);
  const left = (low / cap) * 100;
  const width = ((high - low) / cap) * 100;
  const marker = (expected / cap) * 100;
  return (
    <figure className="forecast-range" data-testid={testId}>
      <figcaption>
        {label}: {low} to {high} people. Centre {expected}.
      </figcaption>
      <div className="forecast-range-track" role="img" aria-label={`${label} range ${low} to ${high}, centre ${expected}`}>
        <span className="forecast-range-fill" style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }} />
        <span className="forecast-range-marker" style={{ left: `${marker}%` }} />
      </div>
      <p className="forecast-range-text">
        Low {low} · Centre {expected} · High {high} · Eligible {max}
      </p>
    </figure>
  );
}

export function ForecastWorkspace({
  workspace,
  mutationLocked = false,
}: {
  workspace: EventForecastWorkspace;
  mutationLocked?: boolean;
}) {
  const { capabilities } = workspace;
  const people = workspace.programmePeople;
  return (
    <div className="forecast-atelier">
      <p className="forecast-synthetic" role="note" data-testid="forecast-synthetic-banner">
        Synthetic / non-production planning. Forecasts never send communications, place orders or change RSVP.
      </p>
      <section className="atelier-panel" aria-labelledby="forecast-products">
        <h2 id="forecast-products">Three different products</h2>
        <ul className="forecast-products">
          <li data-testid="forecast-product-rsvp">{workspace.products.observedRsvp}</li>
          <li data-testid="forecast-product-forecast">{workspace.products.forecast}</li>
          <li data-testid="forecast-product-provision">{workspace.products.provision}</li>
        </ul>
      </section>
      {!workspace.currentRun || !people ? (
        <AtelierEmptyState title="No attendance forecast yet">
          Run a governed forecast from the provisional defaults. This does not change RSVP or guest records.
        </AtelierEmptyState>
      ) : (
        <>
          <section className="atelier-panel" aria-labelledby="forecast-range-heading">
            <h2 id="forecast-range-heading">Whole-event distinct people</h2>
            <p className="lede">
              Counted by guest ID. Invitations, households and unnamed allowances are not people.
            </p>
            {workspace.currentRun.stale ? (
              <p className="alert" data-tone="warn" role="status">
                This forecast may be stale. Refresh before using it for a planning decision.
              </p>
            ) : null}
            <RangeBand
              label="Whole-event distinct people"
              low={people.low}
              expected={people.expected}
              high={people.high}
              max={people.eligiblePeople}
              testId="forecast-programme-range"
            />
            <p data-testid="forecast-confidence">{workspace.confidence?.plainLanguage}</p>
            <p className="forecast-meta">
              Model {workspace.currentRun.modelVersion} · Parameters {workspace.currentRun.parameterSetVersion} · As of{" "}
              {workspace.currentRun.asOf}
            </p>
            {workspace.phaseSumWarning ? (
              <p className="alert" data-tone="brass" data-testid="forecast-phase-sum-warning">
                {workspace.phaseSumWarning}
              </p>
            ) : null}
          </section>
          <section className="atelier-panel" aria-labelledby="forecast-observed">
            <h2 id="forecast-observed">Observed RSVP</h2>
            <dl className="forecast-readiness">
              <div>
                <dt>Attending</dt>
                <dd data-testid="forecast-rsvp-yes">{workspace.rsvpAdjacent.yes}</dd>
              </div>
              <div>
                <dt>Not attending</dt>
                <dd>{workspace.rsvpAdjacent.no}</dd>
              </div>
              <div>
                <dt>No response</dt>
                <dd data-testid="forecast-rsvp-no-response">{workspace.rsvpAdjacent.noResponse}</dd>
              </div>
              <div>
                <dt>Eligible people</dt>
                <dd>{workspace.rsvpAdjacent.eligiblePeople}</dd>
              </div>
            </dl>
          </section>
          <section className="atelier-panel" aria-labelledby="forecast-phases">
            <h2 id="forecast-phases">Phase occupancy</h2>
            <table className="forecast-table">
              <caption>Phase forecasts count a guest once per applicable phase. They must not be summed as whole-event attendance.</caption>
              <thead>
                <tr>
                  <th scope="col">Phase</th>
                  <th scope="col">People low</th>
                  <th scope="col">People centre</th>
                  <th scope="col">People high</th>
                  <th scope="col">Eligible people</th>
                </tr>
              </thead>
              <tbody>
                {workspace.phases.map((phase) => (
                  <tr key={phase.id} data-testid={`forecast-phase-${phase.id}`}>
                    <th scope="row">{phase.name}</th>
                    <td>{phase.people?.low ?? "—"}</td>
                    <td>{phase.people?.expected ?? "—"}</td>
                    <td>{phase.people?.high ?? "—"}</td>
                    <td>{phase.people?.eligiblePeople ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="atelier-panel" aria-labelledby="forecast-uncertainty">
            <h2 id="forecast-uncertainty">Uncertainty and confidence</h2>
            <ul>
              {workspace.drivers.map((driver) => (
                <li key={driver.id}>
                  <strong>{driver.hostSafeLabel}</strong>
                  {capabilities.canViewDetail ? ` — ${driver.explanation}` : null}
                </li>
              ))}
            </ul>
          </section>
          <section className="atelier-panel" aria-labelledby="forecast-provision">
            <h2 id="forecast-provision">Operational provision</h2>
            {workspace.provisions.length === 0 ? (
              <p>No provision recommendation is recorded. A forecast is not a catering, seating or transport order.</p>
            ) : (
              <ul className="forecast-card-list">
                {workspace.provisions.map((item) => (
                  <li key={item.id} className="forecast-card" data-testid={`forecast-provision-${item.id}`}>
                    <p className="eyebrow">{item.domain}</p>
                    <p>
                      Proposed {item.proposedQuantity} with buffer {item.buffer} · {item.status.replaceAll("_", " ")}
                    </p>
                    <p>Owner {item.ownerLabel}</p>
                    {item.rationale ? <p>{item.rationale}</p> : null}
                    {capabilities.canApproveProvision && item.status === "PROPOSED" ? (
                      <form action={decideProvisionRecommendationAction} className="forecast-form">
                        <input type="hidden" name="eventId" value={workspace.eventId} />
                        <input type="hidden" name="provisionId" value={item.id} />
                        <input type="hidden" name="expectedVersion" value={item.version} />
                        <label>
                          Decision reason
                          <input name="decisionReason" required maxLength={400} />
                        </label>
                        <IdempotencyField />
                        <p className="actions">
                          <PendingSubmit name="decision" value="APPROVE" locked={mutationLocked}>
                            Approve provision
                          </PendingSubmit>
                          <PendingSubmit className="secondary" name="decision" value="REJECT" locked={mutationLocked}>
                            Reject
                          </PendingSubmit>
                        </p>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {capabilities.canRun ? (
        <section className="atelier-panel" aria-labelledby="forecast-run">
          <h2 id="forecast-run">Run forecast</h2>
          <form action={runAttendanceForecastAction} className="forecast-form" data-testid="forecast-run-form">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <label>
              Reason
              <input name="reason" defaultValue="Run governed attendance forecast" required maxLength={400} />
            </label>
            <IdempotencyField />
            <PendingSubmit locked={mutationLocked}>Run forecast from governed defaults</PendingSubmit>
          </form>
        </section>
      ) : null}
      {capabilities.canProposeOverride && people && workspace.currentRun ? (
        <section className="atelier-panel" aria-labelledby="forecast-override">
          <h2 id="forecast-override">Propose a range override</h2>
          <form action={proposeForecastOverrideAction} className="forecast-form" data-testid="forecast-override-form">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="forecastRunId" value={workspace.currentRun.id} />
            <input type="hidden" name="estimateId" value={people.id} />
            <label>
              Low
              <input name="proposedLow" type="number" min={0} defaultValue={people.low} required />
            </label>
            <label>
              Centre
              <input name="proposedExpected" type="number" min={0} defaultValue={people.expected} required />
            </label>
            <label>
              High
              <input name="proposedHigh" type="number" min={0} defaultValue={people.high} required />
            </label>
            <label>
              Evidence
              <input name="evidence" required maxLength={400} />
            </label>
            <label>
              Reason
              <input name="reason" required maxLength={400} />
            </label>
            <IdempotencyField />
            <PendingSubmit locked={mutationLocked}>Propose override</PendingSubmit>
          </form>
        </section>
      ) : null}
      {workspace.overrides.length > 0 ? (
        <section className="atelier-panel" aria-labelledby="forecast-overrides">
          <h2 id="forecast-overrides">Override review</h2>
          <ul className="forecast-card-list">
            {workspace.overrides.map((item) => (
              <li key={item.id} className="forecast-card" data-testid={`forecast-override-${item.id}`}>
                <p>
                  {item.originalLow}–{item.originalHigh} → {item.proposedLow}–{item.proposedHigh} · {item.status}
                </p>
                {item.reason ? <p>{item.reason}</p> : null}
                {capabilities.canApproveOverride && item.status === "PROPOSED" ? (
                  <form action={decideForecastOverrideAction} className="forecast-form">
                    <input type="hidden" name="eventId" value={workspace.eventId} />
                    <input type="hidden" name="overrideId" value={item.id} />
                    <input type="hidden" name="expectedVersion" value={item.version} />
                    <label>
                      Decision reason
                      <input name="decisionReason" required maxLength={400} />
                    </label>
                    <IdempotencyField />
                    <p className="actions">
                      <PendingSubmit name="decision" value="APPROVE" locked={mutationLocked}>
                        Approve override
                      </PendingSubmit>
                      <PendingSubmit className="secondary" name="decision" value="REJECT" locked={mutationLocked}>
                        Reject
                      </PendingSubmit>
                    </p>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {capabilities.canProposeProvision && workspace.currentRun ? (
        <section className="atelier-panel" aria-labelledby="forecast-propose-provision">
          <h2 id="forecast-propose-provision">Propose operational provision</h2>
          <form action={proposeProvisionRecommendationAction} className="forecast-form" data-testid="forecast-provision-form">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="forecastRunId" value={workspace.currentRun.id} />
            <label>
              Domain
              <select name="domain" defaultValue="CATERING">
                <option value="CATERING">Catering</option>
                <option value="SEATING">Seating</option>
                <option value="TRANSPORT">Transport</option>
                <option value="PARKING">Parking</option>
                <option value="STAFFING">Staffing</option>
              </select>
            </label>
            <label>
              Proposed quantity
              <input name="proposedQuantity" type="number" min={0} defaultValue={people?.high ?? 0} required />
            </label>
            <label>
              Buffer
              <input name="buffer" type="number" min={0} defaultValue={1} required />
            </label>
            <label>
              Owner
              <input name="ownerLabel" defaultValue="Event Director" required maxLength={80} />
            </label>
            <label>
              Rationale
              <input name="rationale" required maxLength={400} />
            </label>
            <IdempotencyField />
            <PendingSubmit locked={mutationLocked}>Propose provision</PendingSubmit>
          </form>
        </section>
      ) : null}
      {capabilities.canApproveOverride && workspace.currentRun ? (
        <section className="atelier-panel" aria-labelledby="forecast-host-approve">
          <h2 id="forecast-host-approve">Approve host projection</h2>
          <form action={approveHostForecastProjectionAction} className="forecast-form" data-testid="forecast-host-approve-form">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="forecastRunId" value={workspace.currentRun.id} />
            <input type="hidden" name="expectedVersion" value={workspace.currentRun.version} />
            <label>
              Reason
              <input name="reason" defaultValue="Release the calm host projection" required />
            </label>
            <IdempotencyField />
            <PendingSubmit locked={mutationLocked}>Approve host projection</PendingSubmit>
          </form>
        </section>
      ) : null}
      {capabilities.canEvaluate && workspace.currentRun && people ? (
        <section className="atelier-panel" aria-labelledby="forecast-calibration">
          <h2 id="forecast-calibration">Shadow calibration</h2>
          <form action={recordForecastCalibrationAction} className="forecast-form" data-testid="forecast-calibration-form">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="forecastRunId" value={workspace.currentRun.id} />
            <input type="hidden" name="estimateId" value={people.id} />
            <label>
              Observed count
              <input name="observedCount" type="number" min={0} required />
            </label>
            <label>
              Notes
              <input name="notes" required maxLength={400} />
            </label>
            <IdempotencyField />
            <PendingSubmit locked={mutationLocked}>Record shadow observation</PendingSubmit>
          </form>
          {workspace.observations.map((item) => (
            <form key={item.id} action={evaluateForecastAction} className="forecast-form">
              <p>
                Observed {item.observedCount ?? "—"} against original {item.originalLow}–{item.originalHigh}.{" "}
                {item.intervalCovered ? "Inside the interval." : "Outside the interval."}
              </p>
              <input type="hidden" name="eventId" value={workspace.eventId} />
              <input type="hidden" name="observationId" value={item.id} />
              <IdempotencyField />
              <PendingSubmit locked={mutationLocked}>Evaluate without rewriting history</PendingSubmit>
            </form>
          ))}
        </section>
      ) : null}
      {capabilities.canViewAudit && workspace.history.length > 0 ? (
        <section className="atelier-panel" aria-labelledby="forecast-history">
          <h2 id="forecast-history">Forecast history</h2>
          <ol>
            {workspace.history.map((item) => (
              <li key={item.id}>
                {item.asOf} · {item.status} · {item.parameterSetVersion}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {(capabilities.canManageParameters || capabilities.canViewAudit) && workspace.parameters.length > 0 ? (
        <section className="atelier-panel" aria-labelledby="forecast-parameters">
          <h2 id="forecast-parameters">Parameter governance</h2>
          <p className="lede">
            Rates are named, versioned and labelled. They are never Lagos fact unless a later authorised pack says so.
            Changing parameters creates a new set and does not rewrite an existing forecast run.
          </p>
          <table className="forecast-table" data-testid="forecast-parameter-table">
            <caption>Governed attendance-rate bands. Units are probability of later attendance, not people.</caption>
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Scope</th>
                <th scope="col">Status</th>
                <th scope="col">Locality</th>
                <th scope="col">Yes central</th>
                <th scope="col">No-response central</th>
              </tr>
            </thead>
            <tbody>
              {workspace.parameters.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.parameterSetVersion}</th>
                  <td>{item.applicability}</td>
                  <td>{item.status}</td>
                  <td>{item.localityLabel.replaceAll("_", " ")}</td>
                  <td>{item.yesBand.central}</td>
                  <td>{item.noResponseBand.central}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {capabilities.canManageParameters ? (
            <form action={createEventForecastParameterSetAction} className="forecast-form" data-testid="forecast-parameter-form">
              <input type="hidden" name="eventId" value={workspace.eventId} />
              <p>Create an event-scoped superseding set. Existing runs stay on the version they used.</p>
              <label>
                Yes low
                <input name="yesLow" type="number" step="0.01" min={0} max={1} defaultValue={0.85} required />
              </label>
              <label>
                Yes centre
                <input name="yesCentral" type="number" step="0.01" min={0} max={1} defaultValue={0.9} required />
              </label>
              <label>
                Yes high
                <input name="yesHigh" type="number" step="0.01" min={0} max={1} defaultValue={0.95} required />
              </label>
              <label>
                No-response low
                <input name="noResponseLow" type="number" step="0.01" min={0} max={1} defaultValue={0.3} required />
              </label>
              <label>
                No-response centre
                <input name="noResponseCentral" type="number" step="0.01" min={0} max={1} defaultValue={0.4} required />
              </label>
              <label>
                No-response high
                <input name="noResponseHigh" type="number" step="0.01" min={0} max={1} defaultValue={0.5} required />
              </label>
              <label>
                No low
                <input name="noLow" type="number" step="0.01" min={0} max={1} defaultValue={0} required />
              </label>
              <label>
                No centre
                <input name="noCentral" type="number" step="0.01" min={0} max={1} defaultValue={0.05} required />
              </label>
              <label>
                No high
                <input name="noHigh" type="number" step="0.01" min={0} max={1} defaultValue={0.1} required />
              </label>
              <label>
                Unnamed-allowance low
                <input name="unnamedLow" type="number" step="0.01" min={0} max={1} defaultValue={0.2} required />
              </label>
              <label>
                Unnamed-allowance centre
                <input name="unnamedCentral" type="number" step="0.01" min={0} max={1} defaultValue={0.5} required />
              </label>
              <label>
                Unnamed-allowance high
                <input name="unnamedHigh" type="number" step="0.01" min={0} max={1} defaultValue={0.8} required />
              </label>
              <label>
                Explanation
                <input
                  name="explanation"
                  defaultValue="Event-scoped provisional rates. Not a Lagos fact and not a sensitive-trait proxy."
                  required
                  maxLength={800}
                />
              </label>
              <label>
                Reason
                <input name="reason" defaultValue="Create event-scoped forecast parameter set" required maxLength={400} />
              </label>
              <IdempotencyField />
              <PendingSubmit locked={mutationLocked}>Record event parameter set</PendingSubmit>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export function ForecastStrip({
  eventId,
  strip,
}: {
  eventId: string;
  strip: {
    hasForecast: boolean;
    title: string;
    message?: string;
    low?: number;
    expected?: number;
    high?: number;
    confidence?: string;
    stale?: boolean;
    asOf?: string;
    phaseSumWarning?: string;
  };
}) {
  return (
    <section className="atelier-panel forecast-strip" aria-labelledby={`forecast-strip-${eventId}`}>
      <h2 id={`forecast-strip-${eventId}`}>{strip.title}</h2>
      {strip.hasForecast ? (
        <>
          <p data-testid="forecast-strip-range">
            Planning range {strip.low}–{strip.high}, centre {strip.expected}. This is not RSVP truth.
          </p>
          <p>{strip.confidence}</p>
          {strip.stale ? <p className="alert" data-tone="warn">The forecast may be stale.</p> : null}
          {strip.phaseSumWarning ? <p>{strip.phaseSumWarning}</p> : null}
          <p>
            <a className="button secondary" href={`/app/events/${eventId}/forecast`}>
              Open forecasting workspace
            </a>
          </p>
        </>
      ) : (
        <p>
          {strip.message}{" "}
          <a href={`/app/events/${eventId}/forecast`}>Open forecasting</a>
        </p>
      )}
    </section>
  );
}

export function HostForecastView({
  projection,
}: {
  projection: {
    available: boolean;
    eventName: string;
    message?: string;
    asOf?: string;
    stale?: boolean;
    range?: { low: number; expected: number; high: number };
    confidencePlainLanguage?: string;
    materialUncertainty?: string[];
    approvedProvision?: Array<{ domain: string; quantity: number; buffer: number }>;
    lastRefreshedAt?: string;
    materialChange?: string;
    disclaimer?: string;
  };
}) {
  if (!projection.available || !projection.range) {
    return <p data-testid="forecast-host-empty">{projection.message ?? "No approved host projection is available yet."}</p>;
  }
  return (
    <article className="forecast-host" data-testid="forecast-host-projection">
      <p className="lede">{projection.disclaimer}</p>
      <p data-testid="forecast-host-range">
        Likely attendance {projection.range.expected}. Plausible range {projection.range.low}–{projection.range.high}.
      </p>
      <p>{projection.confidencePlainLanguage}</p>
      {projection.materialUncertainty && projection.materialUncertainty.length > 0 ? (
        <ul>
          {projection.materialUncertainty.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {projection.approvedProvision && projection.approvedProvision.length > 0 ? (
        <ul>
          {projection.approvedProvision.map((item) => (
            <li key={item.domain}>
              Approved {item.domain.toLowerCase()} planning quantity {item.quantity} with buffer {item.buffer}
            </li>
          ))}
        </ul>
      ) : (
        <p>No approved operational provision is shown yet.</p>
      )}
      <p>Last refreshed {projection.lastRefreshedAt}.</p>
      <p>{projection.materialChange}</p>
      {projection.stale ? <p className="alert" data-tone="warn">This projection may be out of date.</p> : null}
    </article>
  );
}
