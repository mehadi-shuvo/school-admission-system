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
    expect(screen.getByRole("heading", { name: "আপনার সন্তানের উজ্জ্বল ভবিষ্যৎ শুরু হোক এখানেই" })).toBeInTheDocument();
  });

  it("navigates to My Holds", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "My Applications" }));
    expect(screen.getByRole("heading", { level: 1, name: "My Applications" })).toBeInTheDocument();
  });

  it("renders a not found page for unknown routes", async () => {
    await router.navigate("/missing");
    render(<App />);
    expect(screen.getByRole("heading", { name: "পৃষ্ঠা পাওয়া যায়নি" })).toBeInTheDocument();
  });
});
