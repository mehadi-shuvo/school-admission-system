import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api/client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("supports HTTP 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiRequest<void>("/holds/h_test")).resolves.toBeUndefined();
  });

  it("parses ProblemDetails failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: "Invalid input", detail: "Student ID is invalid", status: 400 }), { status: 400, headers: { "content-type": "application/problem+json" } })));
    await expect(apiRequest("/me/holds")).rejects.toMatchObject({ status: 400, message: "Student ID is invalid" });
  });

  it("extracts the correlation ID from a failed response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Class is full" }), {
      status: 409,
      headers: { "content-type": "application/problem+json", "X-Correlation-ID": "request-42" }
    })));

    await expect(apiRequest("/classes/class-1/holds")).rejects.toEqual(expect.objectContaining({
      correlationId: "request-42",
      message: "Class is full",
      status: 409
    }));
  });

  it("does not fabricate a correlation ID when the response lacks one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(apiRequest("/classes")).rejects.toEqual(expect.objectContaining({
      correlationId: undefined,
      status: 500
    }));
  });

  it("normalizes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
    await expect(apiRequest("/classes")).rejects.toMatchObject({ status: 0, message: "Unable to reach the admission service." });
  });

  it("returns a status-zero API error when an explicitly configured timeout elapses", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_, init?: RequestInit) => pendingUntilAbort(init?.signal)));

    const request = apiRequest("/classes", { timeoutMs: 500 });
    const expectation = expect(request).rejects.toMatchObject({ status: 0, message: "The request timed out." });
    await vi.advanceTimersByTimeAsync(500);

    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves a caller cancellation when a timeout is configured", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_, init?: RequestInit) => pendingUntilAbort(init?.signal)));

    const request = apiRequest("/classes", { signal: controller.signal, timeoutMs: 500 });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up an explicit timeout after a successful response", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));

    await expect(apiRequest<unknown[]>("/classes", { timeoutMs: 500 })).resolves.toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

function pendingUntilAbort(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise((_, reject) => {
    signal?.addEventListener("abort", () => reject(new DOMException("Request aborted", "AbortError")), { once: true });
  });
}
