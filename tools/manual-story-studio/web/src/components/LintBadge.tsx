import type { PromptLintResult } from "../types/manual-story.js";

interface LintBadgeProps {
  lint: PromptLintResult;
  sectionCount?: number;
}

export function LintBadge({ lint, sectionCount }: LintBadgeProps) {
  if (lint.cleanForCopy) {
    const sectionsClause =
      sectionCount !== undefined ? ` (${sectionCount} sections)` : "";
    return (
      <div role="status" className="lint-badge lint-badge--clean">
        Clean external prompt{sectionsClause}
      </div>
    );
  }

  const hardFindings = lint.findings.filter((f) => f.tier === "hard");
  const softFindings = lint.findings.filter((f) => f.tier === "soft");
  const className =
    hardFindings.length > 0
      ? "lint-badge lint-badge--hard"
      : "lint-badge lint-badge--soft";
  const heading =
    hardFindings.length > 0
      ? `${hardFindings.length} hard violation${hardFindings.length === 1 ? "" : "s"} (Copy blocked)`
      : `${softFindings.length} soft violation${softFindings.length === 1 ? "" : "s"}`;

  return (
    <div role="alert" className={className}>
      <h3>{heading}</h3>
      <ol>
        {lint.findings.map((finding, idx) => (
          <li key={`${finding.rule}-${idx}`}>
            <strong>{finding.tier}</strong>
            {" · "}
            <span>{finding.section ?? "—"}</span>
            {" · "}
            <span>{finding.rule}</span>: {finding.message}
            {finding.snippet ? (
              <>
                {" "}
                <code>{finding.snippet}</code>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
