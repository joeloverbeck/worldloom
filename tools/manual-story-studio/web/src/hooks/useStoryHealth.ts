import { useCallback, useEffect, useState } from "react";

import { fetchStoryHealth } from "../api/health.js";
import type { HealthReport } from "../types/health.js";

export interface StoryHealthState {
  report: HealthReport | null;
  refetch: () => Promise<void>;
}

export function useStoryHealth(
  worldSlug: string | undefined,
  msSlug: string | undefined,
): StoryHealthState {
  const [report, setReport] = useState<HealthReport | null>(null);

  const refetch = useCallback(async () => {
    if (!worldSlug || !msSlug) {
      setReport(null);
      return;
    }
    setReport(await fetchStoryHealth(worldSlug, msSlug));
  }, [worldSlug, msSlug]);

  useEffect(() => {
    let cancelled = false;

    if (!worldSlug || !msSlug) {
      setReport(null);
      return;
    }

    fetchStoryHealth(worldSlug, msSlug).then((nextReport) => {
      if (!cancelled) setReport(nextReport);
    });

    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug]);

  return { report, refetch };
}
