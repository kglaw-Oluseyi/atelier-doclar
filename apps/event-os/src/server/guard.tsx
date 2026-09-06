import { redirect } from "next/navigation";
import { PlatformError } from "@maison-doclar/shared-platform";
import { staffSessionRedirectStatus } from "./staff-session-status";
import { requireActor } from "./with-session";

export async function guardedActor() {
  try {
    return await requireActor();
  } catch (error) {
    if (error instanceof PlatformError && error.code === "DEPENDENCY_UNAVAILABLE") {
      redirect("/access-denied?state=DEPENDENCY_UNAVAILABLE");
    }
    if (error instanceof PlatformError && error.code === "ACCESS_PENDING") {
      redirect("/access-pending");
    }
    if (error instanceof PlatformError && error.code === "AUTH_REQUIRED") {
      redirect(`/sign-in?status=${staffSessionRedirectStatus(error.details)}`);
    }
    redirect("/sign-in?status=session-ended");
  }
}
