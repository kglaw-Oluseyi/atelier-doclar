"use client";

import { useActionState } from "react";
import { attemptGateApproval } from "../server/attempt-approve";

export function ApproveButton({ gateId }: { gateId: string }) {
  const [message, action] = useActionState(attemptGateApproval, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="gateId" value={gateId} />
      <button type="submit">Attempt approve</button>
      {message ? <span role="status"> {message}</span> : null}
    </form>
  );
}
