import { Link } from "react-router-dom";

import type { ReactNode } from "react";
import type { CurrentContext } from "../types/manual-story.js";

export interface CurrentStatePanelProps {
  ctx: CurrentContext | null;
  worldSlug: string;
  msSlug: string;
}

function chipList(ids: string[]): ReactNode {
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
          {id}
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
  if (ctx === null) {
    return (
      <section aria-label="current-state">
        <h2>Current State</h2>
        <p>No current context set yet.</p>
        <Link
          to={`/worlds/${worldSlug}/manual-stories/${msSlug}/current-context/edit`}
        >
          Set current context
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="current-state">
      <h2>Current State</h2>
      <dl>
        <dt>Current location</dt>
        <dd>{ctx.current_location ?? <em>Unset</em>}</dd>
        <dt>POV holder</dt>
        <dd>{ctx.pov_holder ?? <em>Unset</em>}</dd>
        <dt>Current cast</dt>
        <dd>{chipList(ctx.current_cast)}</dd>
        <dt>Active pressure clocks</dt>
        <dd>{chipList(ctx.active_pressure_clocks)}</dd>
        <dt>Active secrets and questions</dt>
        <dd>{chipList(ctx.active_secrets_questions)}</dd>
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
