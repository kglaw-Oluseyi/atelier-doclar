import { expect, test } from "@playwright/test";
import {runCheckpointJ3, checkpointManifestConfigured} from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "off" });

test.skip(!checkpointManifestConfigured(), "checkpoint phases require EVENT_OS_CHECKPOINT_MANIFEST");

test("S075 checkpoint j3: exports and role boundaries on j2 LKG", async ({ page, browser, request }) => {
  test.setTimeout(600_000);
  const manifest = await runCheckpointJ3(page, browser, request);
  expect(manifest.phasesCompleted).toContain("j3");
  expect(manifest.j2PublicationBadge).toMatch(/Publication 1/);
});
