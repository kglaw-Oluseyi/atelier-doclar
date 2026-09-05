"use client";

import { useState } from "react";

export function ApproveButton({ gateId }: { gateId: string }) {
  const [message, setMessage] = useState<string | undefined>();

  async function attempt() {
    try {
      const response = await fetch("/api/programme/gates/approve", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gateId, namedAuthority: "" }),
      });
      const body = (await response.json()) as { ok?: boolean; code?: string };
      setMessage(`${gateId} approval ${body.ok ? "accepted" : "rejected"} (${body.code ?? "ERROR"})`);
    } catch {
      setMessage(`${gateId} approval rejected (ERROR)`);
    }
  }

  return (
    <span>
      <button type="button" onClick={() => void attempt()}>
        Attempt approve
      </button>
      {message ? <span role="status"> {message}</span> : null}
    </span>
  );
}
