import { useCallback, useEffect, useRef, useState } from "react";
import { admissionApi } from "../../../lib/api/admissionApi";
import { ApiError } from "../../../lib/api/client";

const POLL_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 8_000;

export type ApiServiceStatus = "online" | "offline";
export type DatabaseStatus = "connected" | "unavailable" | "unknown";

interface SystemHealthState {
  apiStatus: ApiServiceStatus | null;
  databaseStatus: DatabaseStatus;
  isLoading: boolean;
  lastCheckedAt: Date | null;
  error: ApiError | null;
}

export function useSystemHealth() {
  const [state, setState] = useState<SystemHealthState>({
    apiStatus: null,
    databaseStatus: "unknown",
    isLoading: true,
    lastCheckedAt: null,
    error: null
  });
  const activeRequest = useRef<AbortController | null>(null);
  const isMounted = useRef(false);

  const refresh = useCallback(async () => {
    if (activeRequest.current) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    activeRequest.current = controller;
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      await admissionApi.getReadiness(controller.signal);
      if (!isMounted.current) return;
      setState({
        apiStatus: "online",
        databaseStatus: "connected",
        isLoading: false,
        lastCheckedAt: new Date(),
        error: null
      });
    } catch (error) {
      if (!isMounted.current) return;
      const apiError = error instanceof ApiError
        ? error
        : new ApiError("Unable to reach the admission service.", 0);

      if (apiError.status === 503) {
        setState({
          apiStatus: "online",
          databaseStatus: "unavailable",
          isLoading: false,
          lastCheckedAt: new Date(),
          error: apiError
        });
      } else if (apiError.status !== 0) {
        setState({
          apiStatus: "online",
          databaseStatus: "unknown",
          isLoading: false,
          lastCheckedAt: new Date(),
          error: apiError
        });
      } else {
        setState({
          apiStatus: "offline",
          databaseStatus: "unknown",
          isLoading: false,
          lastCheckedAt: new Date(),
          error: apiError
        });
      }
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      window.clearInterval(interval);
      activeRequest.current?.abort();
    };
  }, [refresh]);

  return { ...state, refresh };
}
