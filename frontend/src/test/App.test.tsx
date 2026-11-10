import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../app/App";
import { router } from "../app/router";

describe("application routing", () => {
  beforeEach(async () => {
    await router.navigate("/");
  });

  it("renders the class discovery shell", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Find the right class" })).toBeInTheDocument();
  });

  it("navigates to My Holds", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "My Holds" }));
    expect(screen.getByRole("heading", { name: "My reservations" })).toBeInTheDocument();
  });

  it("renders a not found page for unknown routes", async () => {
    await router.navigate("/missing");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
