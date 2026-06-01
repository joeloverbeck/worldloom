import { useLocation } from "react-router-dom";

import { useStoryHealth } from "../hooks/useStoryHealth.js";

interface StoryRouteParams {
  worldSlug?: string;
  msSlug?: string;
}

function decodeSegment(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

function parseStoryPath(pathname: string): StoryRouteParams {
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts[0] !== "worlds" ||
    parts[2] !== "manual-stories" ||
    !parts[1] ||
    !parts[3] ||
    parts[3] === "new"
  ) {
    return {};
  }

  const worldSlug = decodeSegment(parts[1]);
  const msSlug = decodeSegment(parts[3]);
  if (!worldSlug || !msSlug) return {};
  return { worldSlug, msSlug };
}

export function HealthBanner() {
  const { pathname } = useLocation();
  const { worldSlug, msSlug } = parseStoryPath(pathname);
  const { report } = useStoryHealth(worldSlug, msSlug);

  if (!report || report.status === "ok") return null;

  return (
    <aside
      role="alert"
      aria-live="polite"
      className={`health-banner health-banner--${report.status}`}
    >
      <div className="health-banner__summary">
        <strong>Story health: {report.status}</strong>
        {report.blocked_actions.length > 0 ? (
          <span>
            Blocked: {report.blocked_actions.join(", ")}
          </span>
        ) : null}
      </div>
      <ul className="health-banner__findings">
        {report.findings.map((finding) => (
          <li key={`${finding.code}:${finding.path}:${finding.message}`}>
            <span className="health-banner__severity">{finding.severity}</span>
            <code>{finding.code}</code>
            <span className="health-banner__path">{finding.path}</span>
            <span>{finding.message}</span>
            <em>{finding.repair_hint}</em>
          </li>
        ))}
      </ul>
    </aside>
  );
}
