import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../components/feedback/EmptyState";
import { ErrorState } from "../components/feedback/ErrorState";
import { LoadingState } from "../components/feedback/LoadingState";
import { isValidStudentId } from "../lib/utils/studentId";

describe("shared feedback and validation", () => {
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
});
