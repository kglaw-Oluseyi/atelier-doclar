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
  const [state, formAction] = useActionState(action, idleProtectionFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "validation") return;
    const form = formRef.current;
    if (!form) return;
    for (const [name, value] of Object.entries(state.attemptedValues)) {
      applyControlValue(namedControl(form, name), value);
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
    target?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={className} data-testid={testId} noValidate>
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
      {children}
    </form>
  );
}
