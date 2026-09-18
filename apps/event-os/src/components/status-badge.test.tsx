import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StatusBadge } from "./status-badge";

test("status badge exposes the status as text", () => {
  render(<StatusBadge status="ACTIVE" />);
  expect(screen.getByText("ACTIVE").textContent).toBe("ACTIVE");
});
