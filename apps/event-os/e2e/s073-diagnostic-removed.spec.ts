import { expect, test } from "@playwright/test";

test("S073 retired diagnostic routes return 404", async ({ request }) => {
  const loop = await request.get("/api/_diag/event-loop");
  const settlement = await request.get("/api/s073-diag/settlement?commandId=00000000-0000-4000-8000-000000000073");
  const dbWait = await request.get("/api/_diag/db-wait");
  expect(loop.status()).toBe(404);
  expect(settlement.status()).toBe(404);
  expect(dbWait.status()).toBe(404);
});
