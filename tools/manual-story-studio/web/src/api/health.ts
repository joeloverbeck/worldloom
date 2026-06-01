import type { HealthReport } from "../types/health.js";

const enc = encodeURIComponent;

function healthUrl(worldSlug: string, msSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/manual-stories/${enc(msSlug)}/health`;
}

function failedHealthReport(
  code: string,
  path: string,
  message: string,
): HealthReport {
  return {
    status: "degraded",
    findings: [
      {
        severity: "warn",
        code,
        path,
        message,
        repair_hint: "Check backend connectivity and reload.",
      },
    ],
    blocked_actions: [],
  };
}

export async function fetchStoryHealth(
  worldSlug: string,
  msSlug: string,
): Promise<HealthReport> {
  const url = healthUrl(worldSlug, msSlug);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return failedHealthReport(
        "health-fetch-failed",
        response.url || url,
        `Failed to fetch health (${response.status})`,
      );
    }
    return (await response.json()) as HealthReport;
  } catch (error) {
    return failedHealthReport(
      "health-fetch-failed",
      url,
      error instanceof Error ? error.message : "Failed to fetch health",
    );
  }
}
