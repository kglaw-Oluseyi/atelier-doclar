import { expect, test } from "@playwright/test";
import {runCheckpointJ2Prep, checkpointManifestConfigured} from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "off" });

test.skip(!checkpointManifestConfigured(), "checkpoint phases require EVENT_OS_CHECKPOINT_MANIFEST");

test("S075 checkpoint J2-prep: SECURITY rule, freeze, submit", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const manifest = await runCheckpointJ2Prep(page, browser);
  expect(manifest.phasesCompleted).toContain("j2-prep");
  expect(manifest.j2SubmittedHash).toMatch(/^[a-f0-9]{64}$/i);
});
