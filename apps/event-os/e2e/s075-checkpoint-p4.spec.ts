import { test } from "@playwright/test";
import {runCheckpointP4, checkpointManifestConfigured} from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "on-first-retry" });

test.skip(!checkpointManifestConfigured(), "checkpoint phases require EVENT_OS_CHECKPOINT_MANIFEST");

test("S075 checkpoint P4: j1a hard rejection", async ({ page }) => {
  test.setTimeout(180_000);
  await runCheckpointP4(page);
});
