"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ProtectionFormState } from "@maison-doclar/shared-platform";

const idleProtectionFormState: ProtectionFormState = {
  status: "idle",
  application: null,
  didDataChange: false,
  fieldErrors: {},
  attemptedValues: {},
};

const TRANSPORT_FAILURE_SUMMARY =
  "The seating action could not be confirmed. Reload to verify whether it was recorded before retrying.";

function isSensitiveFormKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return /password|secret|token|ciphertext|objectkey/.test(lowered);
}

function formDataToRecord(formData: FormData): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  const keys = new Set<string>();
  for (const key of formData.keys()) keys.add(key);
  for (const key of keys) {
    if (isSensitiveFormKey(key)) {
      record[key] = "";
      continue;
    }
    const all = formData.getAll(key).flatMap((item) => (typeof item === "string" ? [item] : []));
    record[key] = all.length > 1 ? all : (all[0] ?? "");
  }
  return record;
}

function safeAttemptedValues(raw: Record<string, string | string[]>): {
  values: Record<string, string>;
  sensitiveCleared: string[];
} {
  const values: Record<string, string> = {};
  const sensitiveCleared: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (isSensitiveFormKey(key)) {
      sensitiveCleared.push(key);
      continue;
    }
    const joined = Array.isArray(value) ? value.filter(Boolean).join(",") : value;
    values[key] = joined.slice(0, 2000);
  }
  return { values, sensitiveCleared };
}

function transportFailureFormState(input: {
  attemptedValues: Record<string, string>;
  sensitiveCleared?: string[];
  summary?: string;
}): ProtectionFormState {
  return {
    status: "failure",
    application: null,
    didDataChange: false,
    fieldErrors: {},
    attemptedValues: input.attemptedValues,
    summary: input.summary ?? TRANSPORT_FAILURE_SUMMARY,
    sensitiveCleared: input.sensitiveCleared?.length ? input.sensitiveCleared : undefined,
    preserveIdempotencyKey: true,
  };
}

function namedControl(form: HTMLFormElement, name: string): Element | null {
  const found = form.elements.namedItem(name);
  if (!found) return null;
  if ("length" in found && !("tagName" in found)) {
    const list = found as RadioNodeList;
    return list.item(0);
  }
  return found as Element;
}

function applyControlValue(control: Element | null, value: string): void {
  if (!control) return;
  if (control instanceof HTMLInputElement) {
    if (control.type === "checkbox" || control.type === "radio") {
      control.checked = value === control.value || value === "true";
      return;
    }
    if (control.type === "file" || control.type === "password") return;
    control.value = value;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (control instanceof HTMLSelectElement) {
    if (control.multiple) {
      const selected = new Set(value.split(",").filter(Boolean));
      for (const option of Array.from(control.options)) option.selected = selected.has(option.value);
    } else {
      control.value = value;
    }
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (control instanceof HTMLTextAreaElement) {
    control.value = value;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function isNextNavigationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String((error as { digest: unknown }).digest) : "";
  if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")) return true;
  const message = "message" in error ? String((error as { message: unknown }).message) : "";
  return /NEXT_REDIRECT|NEXT_NOT_FOUND/.test(message);
}

function attemptedFromFormData(formData: FormData) {
  return safeAttemptedValues(formDataToRecord(formData));
}

export function ProtectionMutationForm({
  action,
  children,
  className,
  testId,
}: {
  action: (state: ProtectionFormState, formData: FormData) => Promise<ProtectionFormState>;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const [state, formAction, pending] = useActionState(
    async (prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> => {
      if (submittingRef.current) {
        return prev.status === "idle"
          ? transportFailureFormState({
              attemptedValues: attemptedFromFormData(formData).values,
              summary: "This action is already in progress. Wait for it to finish before retrying.",
            })
          : prev;
      }
      submittingRef.current = true;
      const attempted = attemptedFromFormData(formData);
      try {
        return await action(prev, formData);
      } catch (error) {
        if (isNextNavigationError(error)) throw error;
        return transportFailureFormState({
          attemptedValues: attempted.values,
          sensitiveCleared: attempted.sensitiveCleared,
        });
      } finally {
        submittingRef.current = false;
      }
    },
    idleProtectionFormState,
  );

  useEffect(() => {
    if (state.status !== "validation" && state.status !== "failure") return;
    const form = formRef.current;
    if (!form) return;
    for (const [name, value] of Object.entries(state.attemptedValues)) {
      if (state.preserveIdempotencyKey && name === "idempotencyKey") continue;
      applyControlValue(namedControl(form, name), value);
    }
    if (state.preserveIdempotencyKey && state.attemptedValues.idempotencyKey) {
      applyControlValue(namedControl(form, "idempotencyKey"), state.attemptedValues.idempotencyKey);
    }
    for (const name of Object.keys(state.fieldErrors)) {
      const el = namedControl(form, name);
      if (el instanceof HTMLElement) {
        el.setAttribute("aria-invalid", "true");
        el.setAttribute("aria-describedby", `${name}-field-error`);
        const host = el.closest("label") ?? el.parentElement;
        if (host) {
          let hint = host.querySelector<HTMLElement>(`#${CSS.escape(name)}-field-error`);
          if (!hint) {
            hint = document.createElement("p");
            hint.id = `${name}-field-error`;
            hint.className = "protection-field-error";
            hint.setAttribute("role", "alert");
            host.appendChild(hint);
          }
          hint.textContent = `Error: ${state.fieldErrors[name]}`;
        }
      }
    }
    const focusName = state.focusField;
    const focusEl = focusName ? namedControl(form, focusName) : null;
    const target = focusEl instanceof HTMLElement ? focusEl : summaryRef.current;
    if (!target) return;
    const focus = () => target.focus({ preventScroll: true });
    focus();
    requestAnimationFrame(focus);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      data-testid={testId}
      noValidate
      aria-busy={pending || undefined}
    >
      {state.status === "validation" ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          id="protection-validation-summary"
          className="protection-validation-summary"
          data-testid="protection-validation-summary"
        >
          <h3>Check the highlighted information</h3>
          <ul>
            {Object.entries(state.fieldErrors).map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`}>{message}</a>
              </li>
            ))}
          </ul>
          {state.sensitiveCleared?.length ? (
            <p>Sensitive values were not kept for correction. Re-enter only those fields.</p>
          ) : null}
        </div>
      ) : null}
      {state.status === "failure" ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          id="protection-mutation-failure-summary"
          className="protection-validation-summary"
          data-testid="protection-mutation-failure-summary"
          role="alert"
        >
          <h3>Action could not be confirmed</h3>
          <p>{state.summary}</p>
          <p>
            Your entered values were kept. Retry only once you have checked the page, so a recorded change is not
            duplicated.
          </p>
          <button
            type="submit"
            className="button"
            data-testid="protection-mutation-failure-retry"
            disabled={pending}
          >
            {pending ? "Retrying…" : "Retry this action"}
          </button>
        </div>
      ) : null}
      {children}
    </form>
  );
}
