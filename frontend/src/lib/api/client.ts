import { apiBasePath } from "../config/env";

export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly problem?: ProblemDetails;
  public readonly correlationId?: string;

  public constructor(message: string, status: number, problem?: ProblemDetails, correlationId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.correlationId = correlationId;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  headers?: HeadersInit;
  responseType?: "json" | "text";
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body: requestBody, headers: requestHeaders, responseType, ...requestOptions } = options;
  const headers = new Headers(requestHeaders);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (requestBody !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(requestBody);
  }

  try {
    const response = await fetch(`${apiBasePath}${path}`, {
        ...requestOptions,
      headers,
      body
    });

    if (!response.ok) {
      const problem = await readProblemDetails(response);
      throw new ApiError(
        problem?.detail ?? problem?.title ?? "The request could not be completed.",
        response.status,
        problem,
        response.headers.get("X-Correlation-ID") ?? undefined
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (responseType === "text") {
      return (await response.text()) as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError || isAbortError(error)) {
      throw error;
    }

    throw new ApiError("Unable to reach the admission service.", 0);
  }
}

async function readProblemDetails(response: Response): Promise<ProblemDetails | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    return undefined;
  }

  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return undefined;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
