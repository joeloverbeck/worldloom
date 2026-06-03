import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { previewPrompt, savePrompt } from "../api/prompts.js";
import { LintBadge } from "../components/LintBadge.js";
import { RecordCard } from "../components/RecordCard.js";
import type {
  ManualRecordClass,
  ManualRecordSummary,
  PromptComposeRequestInput,
  PromptComposeResult,
  PromptExcludedRecord,
  PromptIncludedRecord,
  PromptSuppressedRecord,
} from "../types/manual-story.js";

interface NavState {
  composeResult?: PromptComposeResult;
  composeInput?: PromptComposeRequestInput;
}

type FocusHint = "directive" | "cast" | "records" | "template";

function reasonLabel(reason: string): string {
  return reason.replaceAll("_", " ");
}

type LedgerRecord =
  | PromptIncludedRecord
  | PromptExcludedRecord
  | PromptSuppressedRecord;

function ledgerSummary(
  record: LedgerRecord,
): ManualRecordSummary {
  return {
    id: record.id,
    title: record.title,
    active: !("reason" in record && record.reason === "inactive"),
    importance: record.importance,
    tags: record.tags,
    summary: record.summary,
    prompt_visibility: record.prompt_visibility,
    involved_cast: record.involved_cast,
  };
}

function reasonLine(record: LedgerRecord): string {
  const label = reasonLabel(record.reason);
  return record.reason === "must_not_reveal"
    ? `suppressed because ${label}`
    : `${record.reason === "inactive" || record.reason === "working_set_excluded" || record.reason === "never_prompt" ? "excluded" : "included"} because ${label}`;
}

function LedgerRecordCard(props: {
  record: LedgerRecord;
  onOpen: (recordClass: ManualRecordClass, id: string) => void;
  showSection?: boolean;
}) {
  const reason = props.showSection && "section" in props.record && props.record.section
    ? `${reasonLine(props.record)}; section: ${props.record.section}`
    : reasonLine(props.record);
  return (
    <RecordCard
      summary={ledgerSummary(props.record)}
      recordClass={props.record.class}
      compact
      reason={reason}
      onOpen={(id) => props.onOpen(props.record.class, id)}
    />
  );
}

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
    if (lint.blockingForCopy) return;
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
    if (lint.blockingForCopy) return;
    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const outcome = await savePrompt(worldSlug!, msSlug!, {
        ...composeInput!,
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

  function openRecord(recordClass: ManualRecordClass, id: string): void {
    const params = new URLSearchParams({ class: recordClass, id });
    navigate(
      `/worlds/${worldSlug}/manual-stories/${msSlug}/records?${params.toString()}`,
    );
  }

  const hardFindings = lint.findings.filter((finding) => finding.tier === "hard");
  const sectionEntries = Object.entries(composeResult.resolution.section_map);
  const ledgerById = new Map<string, LedgerRecord>();
  for (const record of [
    ...composeResult.resolution.included,
    ...composeResult.resolution.excluded,
    ...composeResult.resolution.suppressed,
  ]) {
    ledgerById.set(record.id, record);
  }

  function renderLedgerIdList(ids: string[], emptyLabel: string): JSX.Element {
    if (ids.length === 0) {
      return <p>{emptyLabel}</p>;
    }
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {ids.map((id) => {
          const record = ledgerById.get(id);
          return record ? (
            <LedgerRecordCard
              key={id}
              record={record}
              onOpen={openRecord}
              showSection
            />
          ) : (
            <p key={id} style={{ margin: 0 }}>
              Identity unavailable{" "}
              <span className="id-subscript">{id}</span>
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="prompt-preview-heading"
      style={{ display: "grid", gap: 16 }}
    >
      <h2 id="prompt-preview-heading">Prompt Preview</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section aria-label="prompt markdown" style={{ display: "grid", gap: 12 }}>
          <LintBadge lint={lint} sectionCount={sectionCount} />
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              background: "#f6f6f6",
              padding: 12,
              maxHeight: "60vh",
              overflow: "auto",
              margin: 0,
            }}
          >
            {composeResult.markdown}
          </pre>
          <div
            role="toolbar"
            aria-label="prompt actions"
            style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
          >
            <button
              type="button"
              onClick={onCopy}
              disabled={lint.blockingForCopy}
            >
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
        </section>
        <aside
          aria-labelledby="prompt-inspector-heading"
          style={{
            display: "grid",
            gap: 12,
            alignContent: "start",
          }}
        >
          <h3 id="prompt-inspector-heading" style={{ margin: 0 }}>
            Prompt Confidence
          </h3>
          <section aria-label="copy status">
            <h4>This is safe to copy</h4>
            <p>{lint.blockingForCopy ? "Blocked by hard lint" : "Allowed"}</p>
          </section>
          <section aria-label="hard lint findings">
            <h4>Hard lint findings</h4>
            {hardFindings.length === 0 ? (
              <p>None</p>
            ) : (
              <ul>
                {hardFindings.map((finding) => (
                  <li key={`${finding.rule}:${finding.message}`}>
                    {finding.rule}: {finding.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label="selected cast">
            <h4>These cast members anchor the prompt</h4>
            {renderLedgerIdList(composeResult.sidecar_draft.included_cast, "None")}
          </section>
          <section aria-label="selected template">
            <h4>Selected template</h4>
            <p>
              {composeInput.selected_template ??
                composeResult.sidecar_draft.included_template_path ??
                "None"}
            </p>
          </section>
          <section aria-label="working set">
            <h4>These records were considered</h4>
            {renderLedgerIdList(composeResult.sidecar_draft.included_records, "None")}
          </section>
          <section aria-label="included records">
            <h4>These records will shape the prompt</h4>
            {composeResult.resolution.included.length === 0 ? (
              <p>None</p>
            ) : (
              composeResult.resolution.included.map((record) => (
                <LedgerRecordCard
                  key={record.id}
                  record={record}
                  onOpen={openRecord}
                  showSection
                />
              ))
            )}
          </section>
          <section aria-label="excluded records">
            <h4>These were deliberately excluded</h4>
            {composeResult.resolution.excluded.length === 0 ? (
              <p>None</p>
            ) : (
              composeResult.resolution.excluded.map((record) => (
                <LedgerRecordCard
                  key={record.id}
                  record={record}
                  onOpen={openRecord}
                />
              ))
            )}
          </section>
          <section aria-label="suppressed reveals">
            <h4>These secrets are protected</h4>
            {composeResult.resolution.suppressed.length === 0 ? (
              <p>None</p>
            ) : (
              composeResult.resolution.suppressed.map((record) => (
                <LedgerRecordCard
                  key={record.id}
                  record={record}
                  onOpen={openRecord}
                />
              ))
            )}
          </section>
          <section aria-label="sections generated">
            <h4>Sections generated</h4>
            {sectionEntries.length === 0 ? (
              <p>None</p>
            ) : (
              <details>
                <summary>Show section map</summary>
                <dl>
                  {sectionEntries.map(([section, ids]) => (
                    <div key={section}>
                      <dt>{section}</dt>
                      <dd>
                        {renderLedgerIdList(ids, "No records consumed")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </section>
          <section aria-label="blocked inputs">
            <h4>Blocked inputs</h4>
            {composeResult.resolution.blocked.length === 0 ? (
              <p>None</p>
            ) : (
              <ul>
                {composeResult.resolution.blocked.map((entry) => (
                  <li key={`${entry.ref}:${entry.reason}`}>
                    {entry.ref}: {entry.reason}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
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
