import { useStoryHealth } from "../hooks/useStoryHealth.js";
import { useStoryRouteMatch } from "../hooks/useStoryRouteMatch.js";

export function HealthBanner() {
  const { worldSlug, msSlug } = useStoryRouteMatch();
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
