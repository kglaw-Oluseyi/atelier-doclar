"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AtelierRecordRefresh({
  label = "Refresh this record",
  href,
  action,
  fields,
}: {
  label?: string;
  href?: string;
  action?: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [announced, setAnnounced] = useState("");
  if (action) {
    return (
      <div className="atelier-refresh">
        <form
          action={action}
          onSubmit={() => setAnnounced("The record is being reloaded from the server.")}
        >
          {Object.entries(fields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button type="submit" className="secondary" aria-busy={pending}>
            {label}
          </button>
        </form>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announced}
        </p>
      </div>
    );
  }
  return (
    <div className="atelier-refresh">
      <button
        type="button"
        className="secondary"
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          if (href) {
            setAnnounced("The record is being reloaded from the server.");
            window.location.assign(href);
            return;
          }
          startTransition(() => {
            router.refresh();
            setAnnounced("The record is being refreshed from the server.");
          });
        }}
      >
        {pending ? "Refreshing…" : label}
      </button>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announced}
      </p>
    </div>
  );
}
