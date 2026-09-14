"use server";

import { resolveVerifyAsRole, S06_VERIFY_AS_ALLOWLIST, type ProtectionFormState } from "@maison-doclar/shared-platform";
import { sessionConfig } from "./config";
import { getRuntime } from "./runtime";
import { writeStaffSessionCookie } from "./staff-session-cookie";
import { eventOsVerifyAsAvailable } from "./seating-verify-as";
import { runTrustedSeatingAction } from "./trusted-seating-action-context";

export async function switchSeatingVerifyAsAction(
  boundEventId: string,
  prev: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    prev,
    formData,
    permission: "seating.fixture_verify_as",
    actionType: "seating.verify_as",
    execute: async () => {
      if (!eventOsVerifyAsAvailable()) {
        throw new Error("This assignment cannot perform this seating action.");
      }
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
