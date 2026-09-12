"use server";

import { resolveVerifyAsRole, S06_VERIFY_AS_ALLOWLIST, type ProtectionFormState } from "@maison-doclar/shared-platform";
import { sessionConfig } from "./config";
import { getRuntime } from "./runtime";
import { writeStaffSessionCookie } from "./staff-session-cookie";
import { requireActor } from "./with-session";
import { runProtectionFormAction } from "./protection-form-action";
import { eventOsVerifyAsAvailable } from "./seating-verify-as";

export async function switchSeatingVerifyAsAction(prev: ProtectionFormState, formData: FormData): Promise<ProtectionFormState> {
  const eventId = String(formData.get("eventId") ?? "");
  return runProtectionFormAction({
    prev,
    formData,
    scopePath: `/app/events/${eventId}/seating`,
    actionType: "seating.verify_as",
    execute: async () => {
      if (!eventOsVerifyAsAvailable()) {
        throw new Error("This assignment cannot perform this seating action.");
      }
      await requireActor();
      const role = resolveVerifyAsRole(String(formData.get("symbolicRole") ?? ""));
      if (!role) throw new Error("This assignment cannot perform this seating action.");
      const mapped = S06_VERIFY_AS_ALLOWLIST[role];
      const issued = getRuntime().service.authenticateNamedStaff({
        email: mapped.email,
        accessToken: sessionConfig().accessToken,
      });
      await writeStaffSessionCookie(issued.token);
      return { id: mapped.assignmentId };
    },
  });
}
