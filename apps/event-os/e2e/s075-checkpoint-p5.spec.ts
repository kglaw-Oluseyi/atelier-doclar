import { test } from "@playwright/test";
import {runCheckpointP5, checkpointManifestConfigured} from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "on-first-retry" });

test.skip(!checkpointManifestConfigured(), "checkpoint phases require EVENT_OS_CHECKPOINT_MANIFEST");

test("S075 checkpoint P5: j1b two-tab CAS", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await runCheckpointP5(page, browser);
});
