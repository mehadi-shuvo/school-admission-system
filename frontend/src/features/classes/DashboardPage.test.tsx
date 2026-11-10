import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api/client";
import { admissionApi } from "../../lib/api/admissionApi";
import type { AdmissionClass, HoldCreated } from "../../types/api";
import { ReservationProvider, useReservation } from "../holds/context/ReservationContext";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../lib/api/admissionApi", () => ({
  admissionApi: {
    listClasses: vi.fn(),
    getClass: vi.fn(),
    createHold: vi.fn()
  }
}));

const classes: AdmissionClass[] = [
  { id: "c_morning", name: "Class 6 Morning", totalSeats: 20, heldSeats: 2, confirmedSeats: 8, availableSeats: 10 },
  { id: "c_evening", name: "Class 6 Evening", totalSeats: 20, heldSeats: 4, confirmedSeats: 16, availableSeats: 0 }
];
const hold: HoldCreated = { holdId: "h_temporary", classId: "c_morning", studentId: "00123456789012345", status: "HELD", expiresAt: "2026-11-10T10:30:00Z" };

const listClasses = vi.mocked(admissionApi.listClasses);
const getClass = vi.mocked(admissionApi.getClass);
const createHold = vi.mocked(admissionApi.createHold);

function renderDashboard() {
  return render(<MemoryRouter><ReservationProvider><DashboardPage /></ReservationProvider></MemoryRouter>);
}

async function openReservableClass(user: ReturnType<typeof userEvent.setup>) {
  const reserveButton = (await screen.findAllByRole("button", { name: /reserve seat/i })).find((button) => !button.hasAttribute("disabled"));
  if (!reserveButton) {
    throw new Error("Expected a reservable class card.");
  }
  await user.click(reserveButton);
  await screen.findByLabelText("Student ID");
}

describe("class discovery and temporary holds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listClasses.mockResolvedValue(classes);
    getClass.mockImplementation(async (classId) => classes.find((item) => item.id === classId) ?? classes[0]);
    createHold.mockResolvedValue(hold);
  });

  it("renders live backend classes and accessible occupancy", async () => {
    renderDashboard();
    expect(screen.getByRole("status", { name: "Loading classes" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Class 6 Morning" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /seat occupancy: 50% occupied/i })).toHaveAttribute("aria-valuenow", "50");
  });

  it("distinguishes an empty backend response", async () => {
    listClasses.mockResolvedValueOnce([]);
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "No classes are available" })).toBeInTheDocument();
  });

  it("shows a fetch error and retries the class request", async () => {
    const user = userEvent.setup();
    listClasses.mockRejectedValueOnce(new ApiError("offline", 0)).mockResolvedValueOnce(classes);
    renderDashboard();
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to reach the admission service");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Class 6 Morning" })).toBeInTheDocument();
    expect(listClasses).toHaveBeenCalledTimes(2);
  });

  it("filters by class name and available seats without additional requests", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByRole("heading", { name: "Class 6 Morning" });
    await user.type(screen.getByRole("searchbox", { name: "Search classes" }), "evening");
    expect(screen.queryByRole("heading", { name: "Class 6 Morning" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Class 6 Evening" })).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Search classes" }));
    await user.click(screen.getByRole("checkbox", { name: "Available only" }));
    expect(screen.queryByRole("heading", { name: "Class 6 Evening" })).not.toBeInTheDocument();
    expect(listClasses).toHaveBeenCalledTimes(1);
  });

  it("disables reservation for a full class", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Class 6 Evening" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /reserve seat/i })[0]).not.toBeDisabled();
    const fullCard = screen.getByRole("heading", { name: "Class 6 Evening" }).closest("article");
    expect(fullCard).not.toBeNull();
    expect(fullCard?.querySelector("button")).toBeDisabled();
  });

  it("loads fresh class details and rejects invalid Student IDs", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await openReservableClass(user);
    expect(getClass).toHaveBeenCalledWith("c_morning", expect.any(AbortSignal));
    const studentId = screen.getByLabelText("Student ID");
    await user.type(studentId, "123");
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter exactly 17 ASCII digits.");
    expect(screen.getByRole("button", { name: "Reserve temporary seat" })).toBeDisabled();
  });

  it("allows a valid Student ID and displays the returned hold", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await openReservableClass(user);
    await user.type(screen.getByLabelText("Student ID"), hold.studentId);
    await user.click(screen.getByRole("button", { name: "Reserve temporary seat" }));
    expect(await screen.findByRole("heading", { name: "Seat temporarily reserved" })).toBeInTheDocument();
    expect(screen.getByText(hold.holdId)).toBeInTheDocument();
    expect(screen.getByText("HELD")).toBeInTheDocument();
    expect(createHold).toHaveBeenCalledWith("c_morning", hold.studentId);
  });

  it("handles a hold conflict and refreshes availability", async () => {
    const user = userEvent.setup();
    createHold.mockRejectedValueOnce(new ApiError("full", 409));
    renderDashboard();
    await openReservableClass(user);
    await user.type(screen.getByLabelText("Student ID"), hold.studentId);
    await user.click(screen.getByRole("button", { name: "Reserve temporary seat" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("may now be full");
    await waitFor(() => expect(getClass).toHaveBeenCalledTimes(2));
  });

  it("does not retry a POST after a network failure", async () => {
    const user = userEvent.setup();
    createHold.mockRejectedValueOnce(new ApiError("offline", 0));
    renderDashboard();
    await openReservableClass(user);
    await user.type(screen.getByLabelText("Student ID"), hold.studentId);
    await user.click(screen.getByRole("button", { name: "Reserve temporary seat" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("do not retry automatically");
    expect(createHold).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate clicks while the hold request is pending", async () => {
    const user = userEvent.setup();
    let resolveHold: (value: HoldCreated) => void = () => undefined;
    createHold.mockReturnValueOnce(new Promise<HoldCreated>((resolve) => { resolveHold = resolve; }));
    renderDashboard();
    await openReservableClass(user);
    await user.type(screen.getByLabelText("Student ID"), hold.studentId);
    const submit = screen.getByRole("button", { name: "Reserve temporary seat" });
    await user.click(submit);
    await user.click(submit);
    expect(createHold).toHaveBeenCalledTimes(1);
    resolveHold(hold);
    expect(await screen.findByRole("heading", { name: "Seat temporarily reserved" })).toBeInTheDocument();
  });

  it("refreshes the list after a successful reservation", async () => {
    const user = userEvent.setup();
    listClasses.mockResolvedValueOnce(classes).mockResolvedValueOnce([{ ...classes[0], heldSeats: 3, availableSeats: 9 }, classes[1]]);
    renderDashboard();
    await openReservableClass(user);
    await user.type(screen.getByLabelText("Student ID"), hold.studentId);
    await user.click(screen.getByRole("button", { name: "Reserve temporary seat" }));
    await screen.findByRole("heading", { name: "Seat temporarily reserved" });
    await waitFor(() => expect(listClasses).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("9", { selector: "p" })).toBeInTheDocument();
  });
});

function ReservationReader() {
  const { latestReservation, setLatestReservation } = useReservation();
  const [showSecondView, setShowSecondView] = useState(false);
  return <div>
    <button onClick={() => setLatestReservation({ hold, className: "Class 6 Morning" })} type="button">Create handoff</button>
    <button onClick={() => setShowSecondView(true)} type="button">Navigate</button>
    {showSecondView ? <p>{latestReservation?.hold.holdId ?? "No reservation"}</p> : <p>First view</p>}
  </div>;
}

describe("reservation handoff", () => {
  it("keeps the hold ID in memory across SPA view changes", async () => {
    const user = userEvent.setup();
    render(<ReservationProvider><ReservationReader /></ReservationProvider>);
    await user.click(screen.getByRole("button", { name: "Create handoff" }));
    await user.click(screen.getByRole("button", { name: "Navigate" }));
    expect(screen.getByText(hold.holdId)).toBeInTheDocument();
  });
});
