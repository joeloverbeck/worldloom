import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  createBeatTemplate,
  deleteBeatTemplate,
  getBeatTemplate,
  listBeatTemplates,
  updateBeatTemplate,
  type BeatTemplateDeleteResult,
} from "../api/beat-templates.js";
import { BeatTemplateForm } from "../components/BeatTemplateForm.js";
import {
  BEAT_TEMPLATE_MOVE_FAMILIES,
  type BeatTemplate,
  type BeatTemplateMoveFamily,
  type ValidationError,
} from "../types/manual-story.js";

type DeleteOutcome =
  | (BeatTemplateDeleteResult & { templateId: string })
  | { ok: false; error: "not_found"; templateId: string }
  | null;

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function BeatTemplates() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const [templates, setTemplates] = useState<BeatTemplate[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [moveFamilyFilter, setMoveFamilyFilter] = useState<
    "all" | BeatTemplateMoveFamily
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BeatTemplate | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [saveErrors, setSaveErrors] = useState<ValidationError[]>([]);
  const [deleteOutcome, setDeleteOutcome] = useState<DeleteOutcome>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setListError(null);
    listBeatTemplates(worldSlug, msSlug, { includeArchived })
      .then((all) => {
        if (!cancelled) {
          setTemplates(all);
          setListError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setTemplates([]);
          setListError(loadErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, includeArchived, deleteOutcome, saveErrors]);

  useEffect(() => {
    if (!worldSlug || !msSlug || !selectedId) {
      setSelectedTemplate(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailError(null);
    getBeatTemplate(worldSlug, msSlug, selectedId)
      .then((tpl) => {
        if (!cancelled) {
          setSelectedTemplate(tpl);
          setDetailError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSelectedTemplate(null);
          setDetailError(loadErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, selectedId]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (moveFamilyFilter !== "all" && t.classification.move_family !== moveFamilyFilter) {
        return false;
      }
      return true;
    });
  }, [templates, moveFamilyFilter]);

  async function handleSave(
    template: Omit<BeatTemplate, "id"> | BeatTemplate,
  ): Promise<boolean> {
    if (!worldSlug || !msSlug) return false;
    setSaveErrors([]);
    if (creating) {
      const result = await createBeatTemplate(
        worldSlug,
        msSlug,
        template as Omit<BeatTemplate, "id">,
      );
      if (result.ok) {
        setCreating(false);
        setSelectedId(result.id);
        return true;
      } else if (result.error === "validation_failed") {
        setSaveErrors(result.violations);
      }
      return false;
    }
    if (selectedId && "id" in template) {
      const result = await updateBeatTemplate(
        worldSlug,
        msSlug,
        selectedId,
        template,
      );
      if (result.ok) {
        setSelectedTemplate(result.template);
        return true;
      } else if (result.error === "validation_failed") {
        setSaveErrors(result.violations);
      }
      return false;
    }
    return false;
  }

  async function handleDelete(force = false): Promise<void> {
    if (!worldSlug || !msSlug || !selectedId) return;
    const result = await deleteBeatTemplate(worldSlug, msSlug, selectedId, {
      force,
    });
    setDeleteOutcome({ ...result, templateId: selectedId });
    if (
      "outcome" in result &&
      (result.outcome === "hard_deleted" || result.outcome === "force_deleted")
    ) {
      setSelectedId(null);
    }
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <div
      className="beat-templates-page"
      style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}
    >
      <section aria-label="beat-templates-list">
        <header style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
              setSelectedTemplate(null);
              setSaveErrors([]);
            }}
          >
            New Template
          </button>
          <label>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />{" "}
            Include archived
          </label>
          <label>
            Filter by move:{" "}
            <select
              value={moveFamilyFilter}
              onChange={(e) =>
                setMoveFamilyFilter(
                  e.target.value as "all" | BeatTemplateMoveFamily,
                )
              }
            >
              <option value="all">all</option>
              {BEAT_TEMPLATE_MOVE_FAMILIES.map((mf) => (
                <option key={mf} value={mf}>
                  {mf}
                </option>
              ))}
            </select>
          </label>
        </header>
        {filtered.length === 0 ? (
          listError ? (
            <p role="alert">Failed to load beat templates: {listError}</p>
          ) : (
            <p>No beat templates.</p>
          )
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {listError ? (
              <li role="alert">Failed to refresh beat templates: {listError}</li>
            ) : null}
            {filtered.map((tpl) => (
              <li
                key={tpl.id}
                style={{
                  border: "1px solid #ccc",
                  padding: 8,
                  marginBottom: 4,
                  background: tpl.id === selectedId ? "#eef" : "transparent",
                }}
              >
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    width: "100%",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedId(tpl.id);
                    setCreating(false);
                    setSaveErrors([]);
                    setDeleteOutcome(null);
                  }}
                >
                  <div>
                    <strong>{tpl.title || "Untitled template"}</strong>{" "}
                    <span className="id-subscript">{tpl.id}</span>{" "}
                    <span
                      style={{
                        background: "#dde",
                        padding: "2px 4px",
                        fontSize: 11,
                        borderRadius: 3,
                      }}
                    >
                      {tpl.classification.move_family}
                    </span>{" "}
                    <span style={{ color: "#666", fontSize: 12 }}>
                      {tpl.beat_guidance.length} beat
                      {tpl.beat_guidance.length === 1 ? "" : "s"}
                    </span>
                    {!tpl.active ? (
                      <span style={{ color: "#a00", marginLeft: 4 }}>
                        (archived)
                      </span>
                    ) : null}
                  </div>
                  {tpl.classification.tags.length > 0 ? (
                    <div style={{ color: "#666", fontSize: 12 }}>
                      tags: {tpl.classification.tags.join(", ")}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="beat-template-detail">
        {creating ? (
          <>
            <h3>New Template</h3>
            <BeatTemplateForm
              onSave={handleSave}
              onCancel={() => {
                setCreating(false);
                setSaveErrors([]);
              }}
              saveErrors={saveErrors}
            />
          </>
        ) : selectedId ? (
          selectedTemplate ? (
            <>
              <h3>{selectedTemplate.title}</h3>
              <BeatTemplateForm
                initial={selectedTemplate}
                onSave={handleSave}
                onCancel={() => setSelectedId(null)}
                saveErrors={saveErrors}
              />
              <button type="button" onClick={() => handleDelete(false)}>
                Delete
              </button>
              {deleteOutcome &&
              "outcome" in deleteOutcome &&
              deleteOutcome.outcome === "inactive_default" ? (
                <section role="alert" style={{ background: "#ffe", padding: 8 }}>
                  <p>
                    Template archived because it has referrers. Force delete
                    will destroy audit trail.
                  </p>
                  <button type="button" onClick={() => handleDelete(true)}>
                    Force delete anyway
                  </button>
                </section>
              ) : null}
              {deleteOutcome &&
              "outcome" in deleteOutcome &&
              deleteOutcome.outcome === "force_deleted" ? (
                <p>Force-deleted.</p>
              ) : null}
            </>
          ) : detailError ? (
            <p role="alert">Failed to load beat template: {detailError}</p>
          ) : (
            <p>Loading template…</p>
          )
        ) : (
          <p>Select a template or click New Template.</p>
        )}
      </section>
    </div>
  );
}
