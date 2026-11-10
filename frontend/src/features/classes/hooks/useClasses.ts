import { useCallback, useEffect, useRef, useState } from "react";
import { admissionApi } from "../../../lib/api/admissionApi";
import type { AdmissionClass } from "../../../types/api";

export interface ClassesState {
  classes: AdmissionClass[];
  isLoading: boolean;
  error: unknown;
}

const POLL_INTERVAL_MS = 5_000;

export function useClasses() {
  const [state, setState] = useState<ClassesState>({ classes: [], isLoading: true, error: null });
  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (activeRequest.current) return;
    const controller = new AbortController();
    const version = ++requestVersion.current;
    activeRequest.current = controller;
    setState((current) => ({ ...current, isLoading: !hasLoaded.current, error: null }));

    try {
      const classes = await admissionApi.listClasses(controller.signal);
      if (version === requestVersion.current) {
        hasLoaded.current = true;
        setState({ classes, isLoading: false, error: null });
      }
    } catch (error) {
      if (controller.signal.aborted || version !== requestVersion.current) {
        return;
      }
      setState((current) => ({ ...current, isLoading: false, error }));
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const poll = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activeRequest.current?.abort();
    };
  }, [refresh]);

  return { ...state, refresh };
}
