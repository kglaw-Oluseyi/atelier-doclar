"use server";

import { redirect } from "next/navigation";
import { ensureRuntime, getRuntime, withDurable } from "./runtime";

export async function recordClientDossierTokenMessageAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  await ensureRuntime();
  await withDurable(async () => {
    getRuntime().service.recordClientDossierMessageByToken(token, {
      kind: String(formData.get("kind") ?? "QUESTION"),
      body: String(formData.get("body") ?? ""),
    });
  });
  redirect(`/client-dossier/${token}`);
}
