import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

const SEATING = "/app/events/00000000-0000-4000-8000-000000000021/seating";

test("S06 publication tab keeps current publication above drafts", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "ceo");
  await page.goto(`${SEATING}#publication`);
  await expect(page.getByTestId("seating-publication")).toBeVisible();
  await expect(page.getByText("Current publication")).toBeVisible();
  await expect(page.getByText("Published without sending messages, issuing credentials or changing check-in.")).toBeVisible();
});
