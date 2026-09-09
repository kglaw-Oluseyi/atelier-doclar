"use client";

import { useMemo, useState } from "react";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import { resolveDiscoveryConflictAction } from "../server/actions";

export type ContradictionCandidate = {
  id: string;
  countLabel: string;
  sourceLabel: string;
  quote: string;
  recordedAt?: string;
};

export function ContradictionResolveForm({
  organisationId,
  engagementId,
  conflictId,
  expectedVersion,
  candidates,
  mutationLocked,
}: {
  organisationId: string;
  engagementId: string;
  conflictId: string;
  expectedVersion: number;
  candidates: ContradictionCandidate[];
  mutationLocked: boolean;
}) {
  const [choice, setChoice] = useState("");
  const selected = candidates.find((item) => item.id === choice);
  const keepUnresolved = choice === "KEEP_UNRESOLVED";
  const superseded = useMemo(
    () => (selected ? candidates.filter((item) => item.id !== selected.id) : []),
    [candidates, selected],
  );
  const confirmation = selected
    ? `You are selecting approximately ${selected.countLabel} guests as the governing planning value. ${
        superseded.length
          ? `Approximately ${superseded.map((item) => item.countLabel).join(" and ")} guests will remain in the evidence history as superseded.`
          : ""
      }`.trim()
    : keepUnresolved
      ? "You are keeping this contradiction unresolved and seeking clarification. No governing value will be selected."
      : "Select an explicit governing value, or keep the contradiction unresolved.";
  const submitLabel = selected ? `Confirm ${selected.countLabel} as governing value` : keepUnresolved ? "Keep unresolved and seek clarification" : "Confirm governing value";
  return (
    <form action={resolveDiscoveryConflictAction} data-testid="contradiction-resolve-form">
      <IdempotencyField />
      <input type="hidden" name="organisationId" value={organisationId} />
      <input type="hidden" name="engagementId" value={engagementId} />
      <input type="hidden" name="conflictId" value={conflictId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input type="hidden" name="section" value="discovery-assertions" />
      <input type="hidden" name="decisionKind" value={keepUnresolved ? "KEEP_UNRESOLVED" : "SELECT_GOVERNING_ASSERTION"} />
      {selected ? <input type="hidden" name="governingAssertionId" value={selected.id} /> : null}
      {superseded.map((item) => (
        <input key={item.id} type="hidden" name="supersededAssertionIds" value={item.id} />
      ))}
      <fieldset className="contradiction-choice">
        <legend>Governing planning value</legend>
        {candidates.map((candidate) => {
          const accessibleName = `Use approximately ${candidate.countLabel} guests as the governing planning value. Source: ${candidate.sourceLabel}.${
            candidate.quote ? ` “${candidate.quote}”` : ""
          }`;
          return (
            <label key={candidate.id} className="contradiction-option" data-testid="contradiction-candidate">
              <input
                type="radio"
                name="contradictionChoice"
                value={candidate.id}
                checked={choice === candidate.id}
                onChange={() => setChoice(candidate.id)}
                aria-label={accessibleName}
              />
              <span>
                <strong>Use approximately {candidate.countLabel} guests as the governing planning value</strong>
                <span className="lede">
                  Source: {candidate.sourceLabel}
                  {candidate.recordedAt ? ` · ${candidate.recordedAt}` : ""}
                </span>
                {candidate.quote ? <span className="lede">“{candidate.quote}”</span> : null}
              </span>
            </label>
          );
        })}
        <label className="contradiction-option" data-testid="contradiction-keep-unresolved">
          <input
            type="radio"
            name="contradictionChoice"
            value="KEEP_UNRESOLVED"
            checked={keepUnresolved}
            onChange={() => setChoice("KEEP_UNRESOLVED")}
            aria-label="Keep unresolved and seek clarification"
          />
          <span>
            <strong>Keep unresolved and seek clarification</strong>
          </span>
        </label>
      </fieldset>
      <p data-testid="contradiction-confirm-copy">{confirmation}</p>
      <label>
        Reason
        <input name="reason" required maxLength={400} defaultValue="Resolve contradiction without silent overwrite" />
      </label>
      <PendingSubmit locked={mutationLocked} blocked={!choice} blockedLabel="Select a governing value first">
        {submitLabel}
      </PendingSubmit>
    </form>
  );
}
