import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { admissionApi } from "../../../lib/api/admissionApi";
import { ApiError } from "../../../lib/api/client";
import { SystemHealthSection } from "./SystemHealthSection";

vi.mock("../../../lib/api/admissionApi", () => ({ admissionApi: { getReadiness: vi.fn() } }));

const getReadiness = vi.mocked(admissionApi.getReadiness);

describe("SystemHealthSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getReadiness.mockResolvedValue("Healthy");
  });

  afterEach(() => vi.useRealTimers());

  it("shows online API and connected PostgreSQL after a 200 readiness response", async () => {
    render(<SystemHealthSection />);
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();
    expect(await screen.findByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Last Checked")).toBeInTheDocument();
  });

  it("shows an unavailable database for a 503 readiness response", async () => {
    getReadiness.mockRejectedValue(new ApiError("Unhealthy", 503));
    render(<SystemHealthSection />);
    expect(await screen.findByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("shows offline and unknown when the readiness request cannot reach the API", async () => {
    getReadiness.mockRejectedValue(new ApiError("Unable to reach the admission service.", 0));
    render(<SystemHealthSection />);
    expect(await screen.findByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("keeps the API online and database unknown for an unexpected HTTP response", async () => {
    getReadiness.mockRejectedValue(new ApiError("Unexpected response", 500));
    render(<SystemHealthSection />);
    expect(await screen.findByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("refreshes status when requested manually", async () => {
    const user = userEvent.setup();
    render(<SystemHealthSection />);
    await screen.findByText("Connected");
    await user.click(screen.getByRole("button", { name: "Refresh Status" }));
    await waitFor(() => expect(getReadiness).toHaveBeenCalledTimes(2));
  });

  it("stops scheduled polling after unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<SystemHealthSection />);
    expect(getReadiness).toHaveBeenCalledTimes(1);
    unmount();
    act(() => vi.advanceTimersByTime(30_000));
    expect(getReadiness).toHaveBeenCalledTimes(1);
  });
});
