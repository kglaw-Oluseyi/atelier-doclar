"use client";

import { useFormStatus } from "react-dom";
import { useMemo, useState, type ReactNode } from "react";

export function BudgetCalculateForm({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      data-testid="budget-calculate-form"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const submitted = String(new FormData(form).get("guestCountOverride") ?? "");
        const visible = (form.elements.namedItem("guestCountOverride") as HTMLInputElement | null)?.value ?? "";
        if (submitted !== visible) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}

export function BudgetGuestCountField({
  governingCount,
  governingKind,
  currentOverride,
  briefHash,
  recoveredReason,
}: {
  governingCount?: string;
  governingKind?: "CURRENT_BRIEF" | "UNRESOLVED_CONTRADICTION" | "BRIEF_NOT_CURRENT" | "UNKNOWN" | "NOT_APPLICABLE";
  currentOverride?: string;
  briefHash?: string;
  recoveredReason?: string;
}) {
  const { pending } = useFormStatus();
  const [edited, setEdited] = useState<string | undefined>(undefined);
  const value = edited ?? currentOverride ?? (governingKind === "CURRENT_BRIEF" ? governingCount ?? "" : "");
  const differs = Boolean(governingKind === "CURRENT_BRIEF" && governingCount && value && value !== governingCount);
  const sourceCopy = useMemo(() => {
    if (differs) {
      return `Scenario assumption — differs from current Event Brief (${governingCount})`;
    }
    if (governingKind === "CURRENT_BRIEF") {
      return `From current Event Brief. Edition hash ${briefHash?.slice(0, 12) ?? ""} is secondary provenance. Changing this value becomes a labelled scenario assumption and does not rewrite the brief.`;
    }
    if (governingKind === "UNRESOLVED_CONTRADICTION") {
      return "The guest-count contradiction must be resolved before Budget Studio can use it. An example such as 180 is not the event value.";
    }
    if (governingKind === "BRIEF_NOT_CURRENT") {
      return "A guest count is recorded, but the Event Brief is still awaiting approval. Budget Studio will not treat it as governing yet. An example such as 180 is not the event value.";
    }
    return "The current Event Brief records the guest count as unknown. An example such as 180 is not the event value.";
  }, [briefHash, differs, governingCount, governingKind]);

  return (
    <>
      <label htmlFor="budget-guest-count">
        Guest count
        <input
          id="budget-guest-count"
          name="guestCountOverride"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          value={value}
          onChange={(event) => setEdited(event.target.value)}
          aria-describedby="budget-guest-count-source budget-guest-count-help"
          data-testid="budget-guest-count"
        />
      </label>
      <p
        id="budget-guest-count-source"
        data-testid={governingKind === "CURRENT_BRIEF" || differs ? "budget-guest-source" : "budget-guest-unknown"}
        aria-live="polite"
      >
        {sourceCopy}
      </p>
      <p id="budget-guest-count-help" className="lede">
        {pending ? "Calculation in progress. The typed value is held." : "The visible count is the value sent to calculation."}
      </p>
      {differs ? (
        <label htmlFor="budget-guest-count-reason">
          Why this scenario assumption differs
          <input
            id="budget-guest-count-reason"
            name="guestCountOverrideReason"
            required
            minLength={8}
            maxLength={500}
            defaultValue={recoveredReason ?? "Synthetic planning reduction for scenario review"}
            data-testid="budget-guest-reason"
          />
        </label>
      ) : governingKind !== "CURRENT_BRIEF" ? (
        <label>
          <input type="checkbox" name="assumptionAcknowledged" value="1" /> I am entering a planning assumption, not a
          confirmed brief fact
        </label>
      ) : null}
    </>
  );
}
