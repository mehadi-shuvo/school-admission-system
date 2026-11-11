import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationErrorBoundary } from "./ApplicationErrorBoundary";

function BrokenScreen(): never {
  throw new Error("Test-only render failure");
}

describe("ApplicationErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders children when no render error occurs", () => {
    render(<ApplicationErrorBoundary><p>Admission content</p></ApplicationErrorBoundary>);
    expect(screen.getByText("Admission content")).toBeInTheDocument();
  });

  it("renders a safe fallback and reload action after a render failure", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<ApplicationErrorBoundary onReload={onReload}><BrokenScreen /></ApplicationErrorBoundary>);

    expect(screen.getByRole("alert")).toHaveTextContent("পৃষ্ঠা লোড করতে সমস্যা হয়েছে");
    expect(screen.queryByText("Test-only render failure")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reload Application" }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
