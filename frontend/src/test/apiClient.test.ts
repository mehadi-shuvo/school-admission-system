import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api/client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
