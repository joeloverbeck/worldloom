import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import {
  listRecordsForClasses,
  type ManualRecordSummaryWithClass,
} from "../api/records.js";
import type {
  ManualRecordClass,
  ManualRecordSummary,
} from "../types/manual-story.js";
import { RecordCard } from "./RecordCard.js";

export type RecordPickerMode = "single" | "multi";
type ActiveFilter = "active" | "inactive" | "all";

export interface RecordPickerProps {
  worldSlug: string;
  msSlug: string;
  classes: readonly ManualRecordClass[];
  mode: RecordPickerMode;
  value: string[];
  onChange: (nextIds: string[]) => void;
  seed?: string[];
  pinnedIds?: string[];
  recentlyUsedIds?: string[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface PickerEntry extends ManualRecordSummaryWithClass {
  rankGroup: "seed" | "pinned" | "recent" | "match";
}

function entryMatchesSearch(entry: ManualRecordSummaryWithClass, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  const searchable = [
    entry.summary.title,
    entry.summary.summary,
    ...entry.summary.tags,
  ]
    .join(" ")
    .toLowerCase();
  return searchable.includes(trimmed);
}

function entryMatchesActiveFilter(
  summary: ManualRecordSummary,
  activeFilter: ActiveFilter,
): boolean {
  if (activeFilter === "all") return true;
  if (activeFilter === "active") return summary.active;
  return !summary.active;
}

function uniqueIds(ids: readonly string[] = []): string[] {
  return Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
}

function classLabel(recordClass: ManualRecordClass): string {
  return recordClass.replaceAll("-", " ");
}

export function RecordPicker(props: RecordPickerProps) {
  const {
    worldSlug,
    msSlug,
    classes,
    mode,
    value,
    onChange,
    seed = [],
    pinnedIds = [],
    recentlyUsedIds = [],
    label = "Records",
    placeholder = "Search records...",
    disabled = false,
  } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupId = useId();
  const [records, setRecords] = useState<ManualRecordSummaryWithClass[]>([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<ManualRecordClass | "all">("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classKey = classes.join("|");

  useEffect(() => {
    if (classes.length === 0) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRecordsForClasses(worldSlug, msSlug, classes, { includeInactive: true })
      .then((nextRecords) => {
        if (cancelled) return;
        setRecords(nextRecords);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "records load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug, classKey]);

  const selectedIds = useMemo(() => uniqueIds(value), [value]);
  const seedSet = useMemo(() => new Set(uniqueIds(seed)), [seed]);
  const pinnedSet = useMemo(() => new Set(uniqueIds(pinnedIds)), [pinnedIds]);
  const recentSet = useMemo(
    () => new Set(uniqueIds(recentlyUsedIds)),
    [recentlyUsedIds],
  );

  const selectedEntries = useMemo(
    () => records.filter((entry) => selectedIds.includes(entry.summary.id)),
    [records, selectedIds],
  );

  const filteredEntries = useMemo(() => {
    const out: PickerEntry[] = [];
    const seen = new Set<string>();
    const pushMatching = (
      candidates: ManualRecordSummaryWithClass[],
      rankGroup: PickerEntry["rankGroup"],
    ) => {
      for (const entry of candidates) {
        if (seen.has(entry.summary.id)) continue;
        if (classFilter !== "all" && entry.recordClass !== classFilter) continue;
        if (!entryMatchesActiveFilter(entry.summary, activeFilter)) continue;
        if (!entryMatchesSearch(entry, query)) continue;
        seen.add(entry.summary.id);
        out.push({ ...entry, rankGroup });
      }
    };

    pushMatching(
      records.filter((entry) => seedSet.has(entry.summary.id)),
      "seed",
    );
    pushMatching(
      records.filter((entry) => pinnedSet.has(entry.summary.id)),
      "pinned",
    );
    pushMatching(
      records.filter((entry) => recentSet.has(entry.summary.id)),
      "recent",
    );
    pushMatching(records, "match");
    return out;
  }, [activeFilter, classFilter, pinnedSet, query, recentSet, records, seedSet]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, classFilter, activeFilter, classKey]);

  function commitSelection(id: string): void {
    if (mode === "single") {
      onChange([id]);
      setOpen(false);
      return;
    }
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    onChange([...selectedIds, id]);
  }

  function removeSelection(id: string): void {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) =>
        Math.min(current + 1, Math.max(filteredEntries.length - 1, 0)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const highlighted = filteredEntries[highlightedIndex];
      if (highlighted) commitSelection(highlighted.summary.id);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="record-picker">
      <label className="record-picker__label">
        <span>{label}</span>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={popupId}
          aria-autocomplete="list"
          type="search"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
        />
      </label>

      <div className="record-picker__filters" aria-label={`${label} filters`}>
        {classes.length > 1 ? (
          <label>
            <span>Class</span>
            <select
              value={classFilter}
              disabled={disabled}
              onChange={(event) =>
                setClassFilter(event.target.value as ManualRecordClass | "all")
              }
            >
              <option value="all">All classes</option>
              {classes.map((recordClass) => (
                <option key={recordClass} value={recordClass}>
                  {classLabel(recordClass)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>Status</span>
          <select
            value={activeFilter}
            disabled={disabled}
            onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {selectedEntries.length > 0 ? (
        <ul className="record-picker__selected" aria-label={`${label} selected`}>
          {selectedEntries.map((entry) => (
            <li key={entry.summary.id}>
              <span>{entry.summary.title}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeSelection(entry.summary.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div id={popupId} className="record-picker__popup" role="listbox">
          {loading ? <p>Loading records...</p> : null}
          {error ? <p role="alert">Failed to load records: {error}</p> : null}
          {!loading && !error && filteredEntries.length === 0 ? (
            <p>No matching records.</p>
          ) : null}
          {filteredEntries.map((entry, index) => (
            <div
              key={`${entry.recordClass}:${entry.summary.id}`}
              className="record-picker__option"
              data-rank-group={entry.rankGroup}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {index === 0 || filteredEntries[index - 1]?.rankGroup !== entry.rankGroup ? (
                <p className="record-picker__section-label">
                  {entry.rankGroup === "seed"
                    ? "Suggested"
                    : entry.rankGroup === "pinned"
                      ? "Pinned"
                      : entry.rankGroup === "recent"
                        ? "Recently used"
                        : "Matches"}
                </p>
              ) : null}
              <RecordCard
                summary={entry.summary}
                recordClass={entry.recordClass}
                compact
                selected={
                  selectedIds.includes(entry.summary.id) ||
                  highlightedIndex === index
                }
                interactionRole="option"
                onOpen={() => undefined}
                onSelect={commitSelection}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
