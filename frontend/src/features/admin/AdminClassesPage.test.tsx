import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api/client";
import { admissionApi } from "../../lib/api/admissionApi";
import { AdminClassesPage } from "./AdminClassesPage";

vi.mock("../../lib/api/admissionApi", () => ({ admissionApi: { createClass: vi.fn(), getReadiness: vi.fn() } }));

const createClass = vi.mocked(admissionApi.createClass);
const getReadiness = vi.mocked(admissionApi.getReadiness);

function renderPage() {
  return render(<MemoryRouter><AdminClassesPage /></MemoryRouter>);
}

describe("admin class creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getReadiness.mockResolvedValue("Healthy");
  });

  it("renders and validates the required class name and whole-number seats", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Save Class" }));
    expect(screen.getByText("শ্রেণির নাম লিখুন।")).toBeInTheDocument();
    expect(screen.getByText("মোট আসনসংখ্যা ধনাত্মক পূর্ণসংখ্যা হতে হবে।")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Class Name"), "Class 6");
    await user.type(screen.getByLabelText("Total Seats"), "2.5");
    await user.click(screen.getByRole("button", { name: "Save Class" }));
    expect(createClass).not.toHaveBeenCalled();
  });

  it("trims the request and shows the created class", async () => {
    const user = userEvent.setup();
    createClass.mockResolvedValue({ id: "c_1", name: "Class 6 Morning", totalSeats: 120 });
    renderPage();
    await user.type(screen.getByLabelText("Class Name"), "  Class 6   Morning ");
    await user.type(screen.getByLabelText("Total Seats"), "120");
    await user.click(screen.getByRole("button", { name: "Save Class" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Class 6 Morning");
    expect(createClass).toHaveBeenCalledWith({ name: "Class 6 Morning", totalSeats: 120 });
  });

  it("prevents duplicate submission and explains network uncertainty", async () => {
    const user = userEvent.setup();
    let rejectRequest: (reason: unknown) => void = () => undefined;
    createClass.mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject; }));
    renderPage();
    await user.type(screen.getByLabelText("Class Name"), "Class 6");
    await user.type(screen.getByLabelText("Total Seats"), "30");
    const submit = screen.getByRole("button", { name: "Save Class" });
    await user.click(submit);
    await user.click(submit);
    expect(createClass).toHaveBeenCalledTimes(1);
    rejectRequest(new ApiError("offline", 0));
    expect(await screen.findByRole("alert")).toHaveTextContent("শ্রেণিটি তৈরি হয়েছে কি না তালিকায় দেখে নিন");
    expect(createClass).toHaveBeenCalledTimes(1);
  });

  it("shows the backend reference ID with the existing creation error message", async () => {
    const user = userEvent.setup();
    createClass.mockRejectedValue(new ApiError("duplicate", 409, undefined, "admin-error-9"));
    renderPage();
    await user.type(screen.getByLabelText("Class Name"), "Class 6");
    await user.type(screen.getByLabelText("Total Seats"), "30");
    await user.click(screen.getByRole("button", { name: "Save Class" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("এই নামে একটি শ্রেণি ইতোমধ্যে থাকতে পারে");
    expect(screen.getByText("admin-error-9")).toBeInTheDocument();
  });
});
