import { redirect } from "next/navigation";
import { PlatformError } from "@maison-doclar/shared-platform";
import { requireActor } from "./with-session";

export async function guardedActor() {
  try {
    return await requireActor();
  } catch (error) {
    if (error instanceof PlatformError && error.code === "ACCESS_PENDING") {
      redirect("/access-pending");
    }
    redirect("/sign-in");
  }
}
