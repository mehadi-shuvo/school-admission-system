import { useCallback, useEffect, useRef, useState } from "react";
import { admissionApi } from "../../../lib/api/admissionApi";
import type { AdmissionClass } from "../../../types/api";

export function useClassDetails(classId: string | null) {
  const [admissionClass, setAdmissionClass] = useState<AdmissionClass | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!classId) {
      return;
    }

    if (activeRequest.current) return;
    const controller = new AbortController();
    const version = ++requestVersion.current;
    activeRequest.current = controller;
    setIsLoading(!hasLoaded.current);
    setError(null);

    try {
      const result = await admissionApi.getClass(classId, controller.signal);
      if (!controller.signal.aborted && version === requestVersion.current) {
        hasLoaded.current = true;
        setAdmissionClass(result);
      }
    } catch (requestError) {
      if (!controller.signal.aborted && version === requestVersion.current) {
        setError(requestError);
      }
    } finally {
      if (!controller.signal.aborted && version === requestVersion.current) {
        setIsLoading(false);
      }
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [classId]);

  useEffect(() => {
    setAdmissionClass(null);
    hasLoaded.current = false;
    setError(null);
    if (classId) {
      void refresh();
    } else {
      return undefined;
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, 5_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      requestVersion.current += 1;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activeRequest.current?.abort();
    };
  }, [classId, refresh]);

  return { admissionClass, isLoading, error, refresh };
}
