import { useCallback, useEffect, useRef, useState } from "react";
import { admissionApi } from "../../../lib/api/admissionApi";
import type { AdmissionClass } from "../../../types/api";

export function useClassDetails(classId: string | null) {
  const [admissionClass, setAdmissionClass] = useState<AdmissionClass | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!classId) {
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const result = await admissionApi.getClass(classId, controller.signal);
      if (!controller.signal.aborted) {
        setAdmissionClass(result);
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [classId]);

  useEffect(() => {
    setAdmissionClass(null);
    setError(null);
    if (classId) {
      void refresh();
    }
    return () => activeRequest.current?.abort();
  }, [classId, refresh]);

  return { admissionClass, isLoading, error, refresh };
}
