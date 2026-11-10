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

  it("normalizes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
    await expect(apiRequest("/classes")).rejects.toMatchObject({ status: 0, message: "Unable to reach the admission service." });
  });
});
