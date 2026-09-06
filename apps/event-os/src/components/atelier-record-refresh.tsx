"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AtelierRecordRefresh({
  label = "Refresh this record",
  href,
}: {
  label?: string;
  href?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [announced, setAnnounced] = useState("");
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
