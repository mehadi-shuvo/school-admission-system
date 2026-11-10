import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HoldCountdown } from "./HoldCountdown";

describe("HoldCountdown", () => {
  afterEach(() => vi.useRealTimers());

  it("counts down using the absolute expiry timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    render(<HoldCountdown expiresAt="2030-01-01T00:01:02Z" />);
    expect(screen.getByText("01:02 remaining")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("01:00 remaining")).toBeInTheDocument();
  });

  it("reaches zero once and notifies the caller", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const elapsed = vi.fn();
    render(<HoldCountdown expiresAt="2030-01-01T00:00:01Z" onElapsed={elapsed} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Time elapsed")).toBeInTheDocument();
    expect(elapsed).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(elapsed).toHaveBeenCalledTimes(1);
  });

  it("supports durations longer than one hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    render(<HoldCountdown expiresAt="2030-01-01T02:03:04Z" />);
    expect(screen.getByText("2:03:04 remaining")).toBeInTheDocument();
  });
});
