import { expect, test } from "@playwright/test";
import {runCheckpointJ4, checkpointManifestConfigured} from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "off" });

test.skip(!checkpointManifestConfigured(), "checkpoint phases require EVENT_OS_CHECKPOINT_MANIFEST");

test("S075 checkpoint j4: UX accessibility and settlement on j2 LKG", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const manifest = await runCheckpointJ4(page, browser);
  expect(manifest.phasesCompleted).toContain("j4");
  expect(manifest.j2LkgDraftHash).toMatch(/^[a-f0-9]{64}$/i);
});
