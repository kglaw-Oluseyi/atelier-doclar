import { test } from "@playwright/test";
import {runCheckpointP2, checkpointManifestConfigured} from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "on-first-retry" });

test.skip(!checkpointManifestConfigured(), "checkpoint phases require EVENT_OS_CHECKPOINT_MANIFEST");

test("S075 checkpoint P2: layout publish", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await runCheckpointP2(page, browser);
});
