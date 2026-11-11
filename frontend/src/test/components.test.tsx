import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "../components/feedback/EmptyState";
import { ErrorState } from "../components/feedback/ErrorState";
import { LoadingState } from "../components/feedback/LoadingState";
import { isValidStudentId } from "../lib/utils/studentId";

describe("shared feedback and validation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders loading, empty, and error states", () => {
    render(<><LoadingState label="Loading classes" /><EmptyState title="Nothing here" description="No records are available." /><ErrorState description="Please try again." /></>);
    expect(screen.getByRole("status", { name: "Loading classes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Please try again.");
  });

  it("validates only 17 ASCII digit student identifiers", () => {
    expect(isValidStudentId("00123456789012345")).toBe(true);
    expect(isValidStudentId("1234567890123456")).toBe(false);
    expect(isValidStudentId("1234567890123456a")).toBe(false);
    expect(isValidStudentId("١٢٣٤٥٦٧٨٩٠١٢٣٤٥٦٧")).toBe(false);
  });

  it("shows and copies a response correlation ID without changing the error message", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ErrorState correlationId="correlation-123" description="Please try again." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Please try again.");
    expect(screen.getByText("Reference ID")).toBeInTheDocument();
    expect(screen.getByText("correlation-123")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy Reference ID" }));
    expect(writeText).toHaveBeenCalledWith("correlation-123");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("omits the reference field when an error has no correlation ID", () => {
    render(<ErrorState description="Please try again." />);
    expect(screen.queryByText("Reference ID")).not.toBeInTheDocument();
  });
});
