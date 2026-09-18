import { beforeAll } from "vitest";
import { migrate } from "../src/migrate";

beforeAll(async () => {
  await migrate();
});
