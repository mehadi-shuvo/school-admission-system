import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api/client";
import { admissionApi } from "../../lib/api/admissionApi";
import type { StudentHold } from "../../types/api";
import { ReservationProvider, useReservation } from "../holds/context/ReservationContext";
import { MyHoldsPage } from "./MyHoldsPage";

vi.mock("../../lib/api/admissionApi", () => ({
  admissionApi: {
    getStudentHolds: vi.fn(),
    getHold: vi.fn(),
    confirmHold: vi.fn(),
    cancelHold: vi.fn()
  }
}));

const studentId = "00123456789012345";
const future = "2030-01-01T01:00:00Z";
const holds: StudentHold[] = [
  { holdId: "h_held", classId: "c_1", className: "Class 6 Morning", status: "HELD", expiresAt: future },
  { holdId: "h_confirmed", classId: "c_2", className: "Class 6 Afternoon", status: "CONFIRMED", expiresAt: "2020-01-01T01:00:00Z" },
  { holdId: "h_cancelled", classId: "c_3", className: "Class 7 Morning", status: "CANCELLED", expiresAt: future },
  { holdId: "h_expired", classId: "c_4", className: "Class 7 Afternoon", status: "EXPIRED", expiresAt: "2020-01-01T01:00:00Z" }
];

const getStudentHolds = vi.mocked(admissionApi.getStudentHolds);
const getHold = vi.mocked(admissionApi.getHold);
const confirmHold = vi.mocked(admissionApi.confirmHold);
const cancelHold = vi.mocked(admissionApi.cancelHold);

function renderPage() {
  return render(<MemoryRouter><ReservationProvider><MyHoldsPage /></ReservationProvider></MemoryRouter>);
}

async function loadHistory(user: ReturnType<typeof userEvent.setup>, id = studentId) {
  await user.type(screen.getByLabelText("Student ID"), id);
  await user.click(screen.getByRole("button", { name: "View reservations" }));
}

describe("My Holds workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStudentHolds.mockResolvedValue(holds);
    getHold.mockResolvedValue({ holdId: "h_held", classId: "c_1", status: "EXPIRED", expiresAt: future });
    confirmHold.mockResolvedValue({ holdId: "h_held", status: "CONFIRMED" });
    cancelHold.mockResolvedValue(undefined);
  });

  it("rejects invalid Student IDs without fetching history", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Student ID"), "123");
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("exactly 17 ASCII digits");
    expect(screen.getByRole("button", { name: "View reservations" })).toBeDisabled();
    expect(getStudentHolds).not.toHaveBeenCalled();
  });

  it("loads valid history and renders all backend status records", async () => {
    const user = userEvent.setup();
    renderPage();
    await loadHistory(user);
    expect(await screen.findByRole("heading", { name: "Class 6 Morning" })).toBeInTheDocument();
    expect(screen.getByText("HELD")).toBeInTheDocument();
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    expect(screen.getByText("EXPIRED")).toBeInTheDocument();
    expect(getStudentHolds).toHaveBeenCalledWith(studentId, expect.any(AbortSignal));
  });

  it("shows loading and empty history states", async () => {
    const user = userEvent.setup();
    let resolveHistory: (value: StudentHold[]) => void = () => undefined;
    getStudentHolds.mockReturnValueOnce(new Promise<StudentHold[]>((resolve) => { resolveHistory = resolve; }));
    renderPage();
    await loadHistory(user);
    expect(screen.getByRole("status", { name: "Loading reservation history" })).toBeInTheDocument();
    resolveHistory([]);
    expect(await screen.findByRole("heading", { name: "No reservations found" })).toBeInTheDocument();
  });

  it("shows an API error and retries", async () => {
    const user = userEvent.setup();
    getStudentHolds.mockRejectedValueOnce(new ApiError("offline", 0)).mockResolvedValueOnce([]);
    renderPage();
    await loadHistory(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load reservation history");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "No reservations found" })).toBeInTheDocument();
    expect(getStudentHolds).toHaveBeenCalledTimes(2);
  });

  it("shows actions only for held records", async () => {
    const user = userEvent.setup();
    renderPage();
    await loadHistory(user);
    const heldCard = screen.getByRole("heading", { name: "Class 6 Morning" }).closest("article");
    const confirmedCard = screen.getByRole("heading", { name: "Class 6 Afternoon" }).closest("article");
    const cancelledCard = screen.getByRole("heading", { name: "Class 7 Morning" }).closest("article");
    const expiredCard = screen.getByRole("heading", { name: "Class 7 Afternoon" }).closest("article");
    expect(heldCard).toHaveTextContent("Pay admission fee (demo) & confirm");
    expect(heldCard).toHaveTextContent("Cancel hold");
    expect(confirmedCard).not.toHaveTextContent("Cancel hold");
    expect(confirmedCard).not.toHaveTextContent("Time remaining");
    expect(cancelledCard).not.toHaveTextContent("Pay admission fee (demo) & confirm");
    expect(expiredCard).not.toHaveTextContent("Cancel hold");
  });

  it("confirms a held reservation and refreshes history", async () => {
    const user = userEvent.setup();
    getStudentHolds.mockResolvedValueOnce([holds[0]]).mockResolvedValueOnce([{ ...holds[0], status: "CONFIRMED" }]);
    renderPage();
    await loadHistory(user);
    await user.click(screen.getByRole("button", { name: "Pay admission fee (demo) & confirm" }));
    expect(await screen.findByText("CONFIRMED")).toBeInTheDocument();
    expect(confirmHold).toHaveBeenCalledWith("h_held", studentId);
    await waitFor(() => expect(getStudentHolds).toHaveBeenCalledTimes(2));
  });

  it("requires an inline confirmation and cancels without reading a body", async () => {
    const user = userEvent.setup();
    getStudentHolds.mockResolvedValueOnce([holds[0]]).mockResolvedValueOnce([{ ...holds[0], status: "CANCELLED" }]);
    renderPage();
    await loadHistory(user);
    await user.click(screen.getByRole("button", { name: "Cancel hold" }));
    expect(screen.getByText("Cancel this temporary hold?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, cancel hold" }));
    expect(await screen.findByText("CANCELLED")).toBeInTheDocument();
    expect(cancelHold).toHaveBeenCalledWith("h_held", studentId);
  });

  it("refreshes after confirmation and cancellation conflicts", async () => {
    const user = userEvent.setup();
    confirmHold.mockRejectedValueOnce(new ApiError("expired", 409));
    getStudentHolds.mockResolvedValueOnce([holds[0]]).mockResolvedValueOnce([{ ...holds[0], status: "EXPIRED" }]);
    renderPage();
    await loadHistory(user);
    await user.click(screen.getByRole("button", { name: "Pay admission fee (demo) & confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("can no longer be confirmed");
    await waitFor(() => expect(getStudentHolds).toHaveBeenCalledTimes(2));
  });

  it("refreshes after a cancellation conflict", async () => {
    const user = userEvent.setup();
    cancelHold.mockRejectedValueOnce(new ApiError("confirmed", 409));
    getStudentHolds.mockResolvedValueOnce([holds[0]]).mockResolvedValueOnce([{ ...holds[0], status: "CONFIRMED" }]);
    renderPage();
    await loadHistory(user);
    await user.click(screen.getByRole("button", { name: "Cancel hold" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel hold" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("can no longer be cancelled");
    await waitFor(() => expect(getStudentHolds).toHaveBeenCalledTimes(2));
  });

  it("explains mutation network uncertainty without automatic retries", async () => {
    const user = userEvent.setup();
    confirmHold.mockRejectedValueOnce(new ApiError("offline", 0));
    getStudentHolds.mockResolvedValueOnce([holds[0]]);
    renderPage();
    await loadHistory(user);
    await user.click(screen.getByRole("button", { name: "Pay admission fee (demo) & confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("may have succeeded");
    expect(confirmHold).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeInTheDocument();
  });

  it("prevents duplicate lifecycle clicks while pending", async () => {
    const user = userEvent.setup();
    let resolveConfirm: (value: { holdId: string; status: "CONFIRMED" }) => void = () => undefined;
    confirmHold.mockReturnValueOnce(new Promise((resolve) => { resolveConfirm = resolve; }));
    getStudentHolds.mockResolvedValueOnce([holds[0]]).mockResolvedValueOnce([{ ...holds[0], status: "CONFIRMED" }]);
    renderPage();
    await loadHistory(user);
    const confirmButton = screen.getByRole("button", { name: "Pay admission fee (demo) & confirm" });
    await user.click(confirmButton);
    await user.click(confirmButton);
    expect(confirmHold).toHaveBeenCalledTimes(1);
    resolveConfirm({ holdId: "h_held", status: "CONFIRMED" });
    expect(await screen.findByText("CONFIRMED")).toBeInTheDocument();
  });

  it("does not let a stale Student ID response overwrite a newer lookup", async () => {
    const user = userEvent.setup();
    let resolveFirst: (value: StudentHold[]) => void = () => undefined;
    let resolveSecond: (value: StudentHold[]) => void = () => undefined;
    getStudentHolds.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    renderPage();
    await loadHistory(user, studentId);
    await user.clear(screen.getByLabelText("Student ID"));
    await user.type(screen.getByLabelText("Student ID"), "10123456789012345");
    await user.click(screen.getByRole("button", { name: "View reservations" }));
    resolveSecond([{ ...holds[0], className: "Student B Class" }]);
    expect(await screen.findByRole("heading", { name: "Student B Class" })).toBeInTheDocument();
    resolveFirst([{ ...holds[0], className: "Student A Class" }]);
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Student A Class" })).not.toBeInTheDocument());
  });
});

function HandoffSeed() {
  const { setLatestReservation } = useReservation();
  useEffect(() => setLatestReservation({ hold: { holdId: "h_handoff", classId: "c_1", studentId, status: "HELD", expiresAt: future }, className: "Class 6 Morning" }), [setLatestReservation]);
  return <MyHoldsPage />;
}

describe("reservation handoff", () => {
  it("pre-fills and fetches the in-memory reservation Student ID", async () => {
    render(<MemoryRouter><ReservationProvider><HandoffSeed /></ReservationProvider></MemoryRouter>);
    expect(await screen.findByDisplayValue(studentId)).toBeInTheDocument();
    await waitFor(() => expect(getStudentHolds).toHaveBeenCalledWith(studentId, expect.any(AbortSignal)));
  });
});
