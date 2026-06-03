import { Link } from "react-router-dom";

import { useEffect, useState, type ReactNode } from "react";

import { listRecordsForClasses } from "../api/records.js";
import type {
  PromptWorkingSet,
  ManualRecordClass,
} from "../types/manual-story.js";

export interface CurrentStatePanelProps {
  ctx: PromptWorkingSet | null;
  worldSlug: string;
  msSlug: string;
}

const DISPLAY_RECORD_CLASSES: ManualRecordClass[] = [
  "cast",
  "locations",
  "clocks",
  "secrets",
  "questions",
];

function displayTitle(id: string, titleById: Record<string, string>): string {
  return titleById[id] ?? id;
}

function chipList(ids: string[], titleById: Record<string, string>): ReactNode {
  if (ids.length === 0) return <em>None</em>;
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {ids.map((id) => (
        <span
          key={id}
          style={{
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: "2px 6px",
            fontSize: "0.85em",
          }}
        >
          {displayTitle(id, titleById)}
        </span>
      ))}
    </span>
  );
}

export function CurrentStatePanel({
  ctx,
  worldSlug,
  msSlug,
}: CurrentStatePanelProps) {
  const [titleById, setTitleById] = useState<Record<string, string>>({});
  const [titleLoadError, setTitleLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTitleLoadError(null);
    listRecordsForClasses(worldSlug, msSlug, DISPLAY_RECORD_CLASSES, {
      includeInactive: true,
    })
      .then((records) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const entry of records) {
          next[entry.summary.id] = entry.summary.title;
        }
        setTitleById(next);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTitleLoadError(
          error instanceof Error ? error.message : "record title load failed",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug]);

  if (ctx === null) {
    return (
      <section aria-label="prompt-working-set">
        <h2>Prompt Working Set</h2>
        <p>No prompt working set has been saved yet.</p>
        <Link
          to={`/worlds/${worldSlug}/manual-stories/${msSlug}/prompt-working-set/edit`}
        >
          Set prompt working set
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="prompt-working-set">
      <h2>Prompt Working Set</h2>
      {titleLoadError ? (
        <p role="alert">Failed to load record titles: {titleLoadError}</p>
      ) : null}
      <dl>
        <dt>Current location</dt>
        <dd>
          {ctx.current_location ? (
            displayTitle(ctx.current_location, titleById)
          ) : (
            <em>Unset</em>
          )}
        </dd>
        <dt>POV holder</dt>
        <dd>
          {ctx.pov_holder ? displayTitle(ctx.pov_holder, titleById) : <em>Unset</em>}
        </dd>
        <dt>Current cast</dt>
        <dd>{chipList(ctx.current_cast, titleById)}</dd>
        <dt>Active pressure clocks</dt>
        <dd>{chipList(ctx.active_pressure_clocks, titleById)}</dd>
        <dt>Active secrets and questions</dt>
        <dd>{chipList(ctx.active_secrets_questions, titleById)}</dd>
      </dl>
      {ctx.current_handoff_summary.trim().length > 0 ? (
        <p>{ctx.current_handoff_summary}</p>
      ) : (
        <p>
          <em>No handoff summary.</em>
        </p>
      )}
    </section>
  );
}
