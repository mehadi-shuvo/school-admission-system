import { useCallback, useEffect, useRef, useState } from "react";
import { admissionApi } from "../../../lib/api/admissionApi";
import type { AdmissionClass } from "../../../types/api";

export interface ClassesState {
  classes: AdmissionClass[];
  isLoading: boolean;
  error: unknown;
}

export function useClasses() {
  const [state, setState] = useState<ClassesState>({ classes: [], isLoading: true, error: null });
  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    const version = ++requestVersion.current;
    activeRequest.current = controller;
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const classes = await admissionApi.listClasses(controller.signal);
      if (version === requestVersion.current) {
        setState({ classes, isLoading: false, error: null });
      }
    } catch (error) {
      if (controller.signal.aborted || version !== requestVersion.current) {
        return;
      }
      setState((current) => ({ ...current, isLoading: false, error }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => activeRequest.current?.abort();
  }, [refresh]);

  return { ...state, refresh };
}
