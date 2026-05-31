import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { previewPrompt, savePrompt } from "../api/prompts.js";
import { LintBadge } from "../components/LintBadge.js";
import type {
  PromptComposeRequestInput,
  PromptComposeResult,
  PromptLintFinding,
} from "../types/manual-story.js";

interface NavState {
  composeResult?: PromptComposeResult;
  composeInput?: PromptComposeRequestInput;
}

type FocusHint = "directive" | "cast" | "records" | "template";

export function PromptPreview() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as NavState;

  const [composeResult, setComposeResult] = useState<PromptComposeResult | null>(
    navState.composeResult ?? null,
  );
  const [composeInput] = useState<PromptComposeRequestInput | null>(
    navState.composeInput ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }
  if (!composeResult || !composeInput) {
    return (
      <section>
        <p role="alert">
          No compose context. Return to Moment Composer to generate a prompt.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate(
              `/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`,
            )
          }
        >
          Back to Moment Composer
        </button>
      </section>
    );
  }

  const lint = composeResult.lint;
  const sectionCount = (composeResult.markdown.match(/^## /gm) ?? []).length;

  async function onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(composeResult!.markdown);
      setStatusMessage("Copied to clipboard.");
      setErrorMessage(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "copy_failed");
    }
  }

  async function onRegenerate(): Promise<void> {
    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const fresh = await previewPrompt(worldSlug!, msSlug!, composeInput!);
      setComposeResult(fresh);
      setStatusMessage("Regenerated.");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "regenerate_failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave(): Promise<void> {
    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      let lint_override: { findings: PromptLintFinding[]; copied_anyway_at: string } | undefined;
      if (!lint.cleanForCopy) {
        if (lint.blockingForCopy) {
          // Button should be disabled; treat as unreachable.
          setErrorMessage("Hard lint violations block save. Edit upstream and regenerate.");
          return;
        }
        const accept = window.confirm(
          `This prompt has ${lint.findings.length} soft lint violation(s) — save anyway?`,
        );
        if (!accept) return;
        lint_override = {
          findings: lint.findings,
          copied_anyway_at: new Date().toISOString(),
        };
      }
      const outcome = await savePrompt(worldSlug!, msSlug!, {
        ...composeInput!,
        ...(lint_override ? { lint_override } : {}),
      });
      if (outcome.ok) {
        setStatusMessage(`Saved as ${outcome.saved.id}.`);
      } else if (outcome.error === "lint_blocks_save") {
        setErrorMessage(
          `Save blocked by hard lint: ${outcome.findings.map((f) => f.rule).join(", ")}`,
        );
      } else {
        setErrorMessage(outcome.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onEditBack(focusHint: FocusHint): void {
    navigate(`/worlds/${worldSlug}/manual-stories/${msSlug}/moment-composer`, {
      state: { ...composeInput, focusHint },
    });
  }

  return (
    <section
      aria-labelledby="prompt-preview-heading"
      style={{ display: "grid", gap: 16 }}
    >
      <h2 id="prompt-preview-heading">Prompt Preview</h2>
      <LintBadge lint={lint} sectionCount={sectionCount} />
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          background: "#f6f6f6",
          padding: 12,
          maxHeight: "60vh",
          overflow: "auto",
        }}
      >
        {composeResult.markdown}
      </pre>
      <div role="toolbar" aria-label="prompt actions" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={onCopy} disabled={lint.blockingForCopy}>
          Copy to clipboard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={lint.blockingForCopy || submitting}
        >
          Save Prompt
        </button>
        <button type="button" onClick={onRegenerate} disabled={submitting}>
          Regenerate
        </button>
        <button type="button" onClick={() => onEditBack("directive")}>
          Edit Directive
        </button>
        <button type="button" onClick={() => onEditBack("cast")}>
          Edit Cast
        </button>
        <button type="button" onClick={() => onEditBack("records")}>
          Edit Records
        </button>
        <button
          type="button"
          onClick={() => onEditBack("template")}
          disabled
        >
          Edit Template (SPEC-104)
        </button>
      </div>
      {statusMessage ? (
        <p role="status" style={{ color: "green" }}>
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" style={{ color: "crimson" }}>
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
