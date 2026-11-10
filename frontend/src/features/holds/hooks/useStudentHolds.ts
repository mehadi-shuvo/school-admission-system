import { useCallback, useEffect, useRef, useState } from "react";
import { admissionApi } from "../../../lib/api/admissionApi";
import type { StudentHold } from "../../../types/api";

interface StudentHoldsState {
  holds: StudentHold[];
  studentId: string | null;
  isLoading: boolean;
  error: unknown;
  hasLoaded: boolean;
}

export function useStudentHolds() {
  const [state, setState] = useState<StudentHoldsState>({ holds: [], studentId: null, isLoading: false, error: null, hasLoaded: false });
  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async (studentId: string) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    const version = ++requestVersion.current;
    activeRequest.current = controller;
    setState({ holds: [], studentId, isLoading: true, error: null, hasLoaded: false });

    try {
      const holds = await admissionApi.getStudentHolds(studentId, controller.signal);
      if (version === requestVersion.current) {
        setState({ holds, studentId, isLoading: false, error: null, hasLoaded: true });
      }
    } catch (error) {
      if (!controller.signal.aborted && version === requestVersion.current) {
        setState({ holds: [], studentId, isLoading: false, error, hasLoaded: true });
      }
    }
  }, []);

  const clear = useCallback(() => {
    activeRequest.current?.abort();
    requestVersion.current += 1;
    setState({ holds: [], studentId: null, isLoading: false, error: null, hasLoaded: false });
  }, []);

  useEffect(() => () => {
    requestVersion.current += 1;
    activeRequest.current?.abort();
  }, []);

  return { ...state, load, clear };
}
