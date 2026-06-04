import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  listWorldSourceItems,
  readWorldSourceItem,
  type WorldSourceItem,
  type WorldSourceItemSummary,
} from "../api/world-source.js";
import { createRecord as apiCreate, type CreateResult } from "../api/records.js";
import { RecordForm } from "../components/RecordForm.js";
import type {
  ManualRecord,
  ManualRecordClass,
} from "../types/manual-story.js";
import { MANUAL_RECORD_CLASSES } from "../types/manual-story.js";

const ADVANCED_NOTE_RECORD_CLASSES = MANUAL_RECORD_CLASSES.filter(
  (recordClass) => recordClass !== "beliefs" && recordClass !== "beat-templates",
);

type SeedDefaults = Pick<
  Partial<ManualRecord>,
  "active" | "importance" | "tags" | "refs" | "prompt_visibility"
>;

type NoteOnlySeed = SeedDefaults & Pick<Partial<ManualRecord>, "notes">;

function displayTitle(item: WorldSourceItemSummary): string {
  return item.title ?? item.name ?? item.path;
}

function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function matchesSearch(
  item: WorldSourceItemSummary,
  rawText: string | undefined,
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const haystack = [
    item.path,
    item.kind,
    item.title ?? "",
    item.name ?? "",
    item.class ?? "",
    item.tags.join(" "),
    rawText ?? "",
  ].join("\n").toLowerCase();
  return haystack.includes(trimmed);
}

function baseRecordSeed(sourceItem: WorldSourceItemSummary | null): SeedDefaults {
  return {
    active: true,
    importance: "medium",
    tags: sourceItem?.tags ?? [],
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
  };
}

function sourceNote(
  sourceItem: WorldSourceItemSummary | null,
  text: string,
): string {
  const sourceLine = sourceItem ? `Source: ${sourceItem.path}` : "Source: selected text";
  const trimmed = text.trim();
  return trimmed ? `${sourceLine}\n\n${trimmed}` : sourceLine;
}

function buildNoteSeed(
  text: string,
  sourceItem: WorldSourceItemSummary | null,
): NoteOnlySeed {
  return {
    ...baseRecordSeed(sourceItem),
    notes: sourceNote(sourceItem, text),
  };
}

function buildCastSeed(sourceItem: WorldSourceItemSummary): Partial<ManualRecord> {
  return {
    ...baseRecordSeed(sourceItem),
    title: displayTitle(sourceItem),
  };
}

export function SourceBrowser() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();

  const [items, setItems] = useState<WorldSourceItemSummary[]>([]);
  const [rawByPath, setRawByPath] = useState<Record<string, WorldSourceItem>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeClass, setActiveClass] = useState<ManualRecordClass>("facts");
  const [advancedClass, setAdvancedClass] =
    useState<ManualRecordClass>("locations");
  const [formSeed, setFormSeed] = useState<Partial<ManualRecord>>({});
  const [formVersion, setFormVersion] = useState(0);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<
    Exclude<CreateResult, { ok: true }> | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!worldSlug) return;
    let cancelled = false;
    setLoadError(null);
    setRawByPath({});
    listWorldSourceItems(worldSlug)
      .then((nextItems) => {
        if (cancelled) return;
        setItems(nextItems);
        setSelectedPath((current) => current ?? nextItems[0]?.path ?? null);
        return Promise.all(
          nextItems.map((item) =>
            readWorldSourceItem(worldSlug, item.path).then((detail) => ({
              path: item.path,
              detail,
            })),
          ),
        );
      })
      .then((details) => {
        if (cancelled || !details) return;
        const next: Record<string, WorldSourceItem> = {};
        for (const entry of details) {
          if (entry.detail) next[entry.path] = entry.detail;
        }
        setRawByPath(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setItems([]);
          setLoadError(loadErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug]);

  useEffect(() => {
    if (!worldSlug || !selectedPath || rawByPath[selectedPath]) return;
    let cancelled = false;
    setDetailError(null);
    readWorldSourceItem(worldSlug, selectedPath)
      .then((item) => {
        if (!cancelled && item) {
          setRawByPath((current) => ({ ...current, [selectedPath]: item }));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setDetailError(loadErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, selectedPath, rawByPath]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        matchesSearch(item, rawByPath[item.path]?.raw_text, query),
      ),
    [items, rawByPath, query],
  );

  const selectedSummary =
    items.find((item) => item.path === selectedPath) ?? null;
  const selectedItem = selectedPath ? rawByPath[selectedPath] : undefined;

  function selectedSourceText(): string {
    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText) return selectedText;
    return selectedItem?.raw_text.trim() ?? "";
  }

  function seedForm(recordClass: ManualRecordClass, seed: Partial<ManualRecord>) {
    setActiveClass(recordClass);
    setFormSeed(seed);
    setFormVersion((version) => version + 1);
    setSaveError(null);
    setSavedId(null);
  }

  async function copyLiteral(text: string, label: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopyNotice(`Copied ${label}.`);
    } catch (error) {
      setCopyNotice(`Could not copy ${label}: ${loadErrorMessage(error)}`);
    }
  }

  function createStoryFact() {
    if (!selectedSummary) return;
    seedForm("facts", buildNoteSeed(selectedSourceText(), selectedSummary));
  }

  function createStoryCast() {
    if (!selectedSummary || selectedSummary.kind !== "characters") return;
    seedForm("cast", buildCastSeed(selectedSummary));
  }

  function createAdvancedNoteRecord() {
    if (!selectedSummary) return;
    seedForm(advancedClass, buildNoteSeed(selectedSourceText(), selectedSummary));
  }

  async function handleSave(
    record: ManualRecord,
    opts?: { overrideBrokenRefs?: boolean },
  ): Promise<boolean> {
    if (!worldSlug || !msSlug) return false;
    setSaveError(null);
    const result = await apiCreate(worldSlug, msSlug, activeClass, record, opts);
    if (result.ok) {
      setSavedId(result.id);
      return true;
    }
    setSaveError(result);
    return false;
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <div className="source-browser">
      <section className="source-browser__list" aria-label="world-source-list">
        <header className="source-browser__toolbar">
          <input
            aria-label="source-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="search"
          />
        </header>
        {loadError ? (
          <p role="alert">Failed to load world source: {loadError}</p>
        ) : filteredItems.length === 0 ? (
          <p>No source items.</p>
        ) : (
          <ul className="source-browser__items">
            {filteredItems.map((item) => (
              <li key={item.path}>
                <button
                  type="button"
                  className={
                    item.path === selectedPath
                      ? "source-browser__item source-browser__item--active"
                      : "source-browser__item"
                  }
                  onClick={() => {
                    setSelectedPath(item.path);
                    setDetailError(null);
                  }}
                >
                  <span>{displayTitle(item)}</span>
                  <small>{item.kind}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="source-browser__detail" aria-label="world-source-detail">
        {selectedSummary ? (
          <>
            <header className="source-browser__detail-header">
              <div>
                <h2>{displayTitle(selectedSummary)}</h2>
                <p>{selectedSummary.path}</p>
              </div>
              <div className="source-browser__copy-controls">
                <button
                  type="button"
                  onClick={() => copyLiteral(selectedSourceText(), "selected source text")}
                >
                  Copy selected source text
                </button>
                <button
                  type="button"
                  onClick={() => copyLiteral(selectedSummary.path, "source path")}
                >
                  Copy source path
                </button>
              </div>
            </header>
            {copyNotice ? <p>{copyNotice}</p> : null}
            {selectedSummary.tags.length > 0 || selectedSummary.class ? (
              <div className="source-browser__metadata">
                {selectedSummary.class ? <span>{selectedSummary.class}</span> : null}
                {selectedSummary.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}
            {selectedSummary.error ? (
              <p role="alert">{selectedSummary.error.repair_hint}</p>
            ) : null}
            {detailError ? <p role="alert">{detailError}</p> : null}
            <pre className="source-browser__raw">
              {selectedItem?.raw_text ?? "Loading..."}
            </pre>
          </>
        ) : (
          <p>No source item selected.</p>
        )}
      </section>
      <section className="source-browser__workbench" aria-label="record-workbench">
        <header className="source-browser__workbench-header">
          <h2>Record Workbench</h2>
        </header>
        <div className="source-browser__workbench-actions">
          <button
            type="button"
            onClick={createStoryCast}
            disabled={selectedSummary?.kind !== "characters"}
          >
            Create story cast from world character
          </button>
          <button
            type="button"
            onClick={createStoryFact}
            disabled={!selectedSummary}
          >
            Create story fact from selected text
          </button>
          <label>
            <span>Advanced note record</span>
            <select
              aria-label="advanced-note-record-class"
              value={advancedClass}
              onChange={(event) => {
                setAdvancedClass(event.target.value as ManualRecordClass);
                setSaveError(null);
                setSavedId(null);
              }}
            >
              {ADVANCED_NOTE_RECORD_CLASSES.map((recordClass) => (
                <option key={recordClass} value={recordClass}>
                  {recordClass}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={createAdvancedNoteRecord}
            disabled={!selectedSummary}
          >
            Create manual record using selected text as note
          </button>
        </div>
        {savedId ? <p>Saved {savedId}.</p> : null}
        <RecordForm
          key={`${activeClass}-${formVersion}`}
          recordClass={activeClass}
          initial={formSeed}
          onSave={handleSave}
          onCancel={() => {
            setFormSeed({});
            setFormVersion((version) => version + 1);
            setSaveError(null);
          }}
          saveError={saveError}
        />
      </section>
    </div>
  );
}
