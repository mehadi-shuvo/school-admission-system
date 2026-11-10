import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api/client";
import { admissionApi } from "../../lib/api/admissionApi";
import { AdminClassesPage } from "./AdminClassesPage";

vi.mock("../../lib/api/admissionApi", () => ({ admissionApi: { createClass: vi.fn() } }));

const createClass = vi.mocked(admissionApi.createClass);

function renderPage() {
  return render(<MemoryRouter><AdminClassesPage /></MemoryRouter>);
}

describe("admin class creation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders and validates the required class name and whole-number seats", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create class" }));
    expect(screen.getByText("Class/shift name is required.")).toBeInTheDocument();
    expect(screen.getByText("Total seats must be a positive whole number.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Class/shift name"), "Class 6");
    await user.type(screen.getByLabelText("Total seats"), "2.5");
    await user.click(screen.getByRole("button", { name: "Create class" }));
    expect(createClass).not.toHaveBeenCalled();
  });

  it("trims the request and shows the created class", async () => {
    const user = userEvent.setup();
    createClass.mockResolvedValue({ id: "c_1", name: "Class 6 Morning", totalSeats: 120 });
    renderPage();
    await user.type(screen.getByLabelText("Class/shift name"), "  Class 6   Morning ");
    await user.type(screen.getByLabelText("Total seats"), "120");
    await user.click(screen.getByRole("button", { name: "Create class" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Class 6 Morning");
    expect(createClass).toHaveBeenCalledWith({ name: "Class 6 Morning", totalSeats: 120 });
  });

  it("prevents duplicate submission and explains network uncertainty", async () => {
    const user = userEvent.setup();
    let rejectRequest: (reason: unknown) => void = () => undefined;
    createClass.mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject; }));
    renderPage();
    await user.type(screen.getByLabelText("Class/shift name"), "Class 6");
    await user.type(screen.getByLabelText("Total seats"), "30");
    const submit = screen.getByRole("button", { name: "Create class" });
    await user.click(submit);
    await user.click(submit);
    expect(createClass).toHaveBeenCalledTimes(1);
    rejectRequest(new ApiError("offline", 0));
    expect(await screen.findByRole("alert")).toHaveTextContent("may have been created");
    expect(createClass).toHaveBeenCalledTimes(1);
  });
});
