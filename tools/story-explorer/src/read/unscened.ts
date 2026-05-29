import { resolveRepoRoot } from "../config/repo-root.js";
import { readRecord, type RawRecord } from "./record-io.js";
import { readSceneCoverage, type SceneCoverageBranch } from "./scene-coverage.js";
import type { ChoiceSurface, ChoiceSurfaceChoice } from "../view-models/choice-surface.js";
import type { EventDeltaSummary } from "../view-models/event-delta-summary.js";
import type {
  ActiveRecordDeltaSummary,
  UnscenedRange,
  UnscenedRangeList,
  UnscenedRangeValidationStatus,
} from "../view-models/unscened-range.js";

type PageRecord = Record<string, unknown>;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function stringList(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return stringArray(value);
}

function recordIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }
      return stringValue(record(entry).record_id) ?? stringValue(record(entry).id);
    })
    .filter((entry): entry is string => entry !== null);
}

function pageId(page: PageRecord): string {
  return stringValue(page.id) ?? "";
}

function pageInput(page: PageRecord): Record<string, unknown> {
  return record(page.input);
}

function turnIndex(page: PageRecord): number {
  return numberValue(page.turn_index);
}

function activeRecordCounts(page: PageRecord): Record<string, number> {
  const activeRecords = record(record(page.state_snapshot).active_records);
  return Object.fromEntries(
    Object.entries(activeRecords).map(([key, value]) => [key, recordIdArray(value).length]),
  );
}

function stateDelta(event: Record<string, unknown> | null): {
  create: string[];
  supersede: string[];
  close: string[];
} {
  const delta = record(event?.state_delta);
  return {
    create: recordIdArray(delta.create),
    supersede: recordIdArray(delta.supersede),
    close: recordIdArray(delta.close),
  };
}

function eventDeltaSummary(eventId: string | null, event: Record<string, unknown> | null): EventDeltaSummary {
  const delta = stateDelta(event);
  return {
    eventId,
    createCount: delta.create.length,
    supersedeCount: delta.supersede.length,
    closeCount: delta.close.length,
    introducedRecordIds: recordIdArray(event?.record_introductions),
    relationCount: Array.isArray(event?.state_relations) ? event.state_relations.length : 0,
  };
}

async function readOptionalRecord(
  worldSlug: string,
  storySlug: string,
  recordId: string | null,
  repoRoot: string,
): Promise<RawRecord | null> {
  if (recordId === null) {
    return null;
  }
  try {
    return await readRecord(worldSlug, storySlug, recordId, repoRoot);
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function choiceSurfaceFor(
  worldSlug: string,
  storySlug: string,
  page: PageRecord,
  repoRoot: string,
): Promise<ChoiceSurface> {
  const emittedChoices = await Promise.all(
    stringArray(page.emitted_choices).map(async (choiceId): Promise<ChoiceSurfaceChoice> => {
      const choice = (await readOptionalRecord(worldSlug, storySlug, choiceId, repoRoot))?.parsed ?? null;
      return {
        choiceId,
        surfaceLabel: stringValue(choice?.surface_label) ?? choiceId,
        playerVisibleIntent: stringValue(choice?.player_visible_intent) ?? "",
        pressure: stringList(choice?.likely_state_pressure),
        groundedInCount: recordIdArray(choice?.grounded_in).length,
      };
    }),
  );

  return {
    pageId: pageId(page),
    emittedChoices,
  };
}

function comparePage(left: PageRecord, right: PageRecord): number {
  return turnIndex(left) - turnIndex(right) || pageId(left).localeCompare(pageId(right), undefined, { numeric: true });
}

function activeRecordDelta(pages: PageRecord[], events: Array<Record<string, unknown> | null>): ActiveRecordDeltaSummary {
  const deltas = events.map(stateDelta);
  return {
    startActiveRecordCounts: pages[0] === undefined ? {} : activeRecordCounts(pages[0]),
    endActiveRecordCounts: pages.at(-1) === undefined ? {} : activeRecordCounts(pages.at(-1) as PageRecord),
    createdRecordIds: [...new Set(deltas.flatMap((delta) => delta.create))].sort(),
    supersededRecordIds: [...new Set(deltas.flatMap((delta) => delta.supersede))].sort(),
    closedRecordIds: [...new Set(deltas.flatMap((delta) => delta.close))].sort(),
  };
}

function validationStatus(pages: PageRecord[]): UnscenedRangeValidationStatus {
  const pagesWithValidationTrace = pages.filter((page) => Object.keys(record(page.validation_trace)).length > 0).length;
  return {
    pageCount: pages.length,
    pagesWithValidationTrace,
    verdict: pagesWithValidationTrace === pages.length ? "present" : "missing",
  };
}

function suggestedRangeLabel(run: { start_pg: string; end_pg: string; pg_ids: string[] }): string {
  if (run.start_pg === run.end_pg) {
    return `Unscened tick ${run.start_pg}`;
  }
  return `Unscened run ${run.start_pg} to ${run.end_pg}`;
}

function selectedBranch(coverage: SceneCoverageBranch[], branchId: string): SceneCoverageBranch | null {
  return coverage.find((branch) => branch.branch_id === branchId) ?? null;
}

export async function readUnscenedRanges(
  worldSlug: string,
  storySlug: string,
  branchId: string,
  repoRoot = resolveRepoRoot(),
): Promise<UnscenedRangeList | null> {
  const coverage = readSceneCoverage({ worldSlug, storySlug, branchId }, repoRoot);
  if (coverage.degradedDirectRead) {
    return {
      branchId,
      ranges: [],
      indexStatus: coverage.worldIndexStatus,
      degradedDirectRead: true,
    };
  }

  const branch = selectedBranch(coverage.branches, branchId);
  if (branch === null) {
    return null;
  }

  const ranges = await Promise.all(
    branch.unscened_runs.map(async (run): Promise<UnscenedRange> => {
      const pageRecords = await Promise.all(
        run.pg_ids.map((id) => readOptionalRecord(worldSlug, storySlug, id, repoRoot)),
      );
      const pages = pageRecords
        .filter((page): page is RawRecord => page !== null)
        .map((page) => page.parsed)
        .sort(comparePage);
      const endPage = pages.at(-1) ?? {};
      const events = await Promise.all(
        pages.map(async (page) => {
          const eventId = stringValue(pageInput(page).resolved_event_id);
          return (await readOptionalRecord(worldSlug, storySlug, eventId, repoRoot))?.parsed ?? null;
        }),
      );
      const lastEventId = stringValue(pageInput(endPage).resolved_event_id);
      const lastEvent = events.at(-1) ?? null;

      return {
        startPg: run.start_pg,
        endPg: run.end_pg,
        pageIds: run.pg_ids,
        count: run.pg_ids.length,
        finalChoiceSurface: await choiceSurfaceFor(worldSlug, storySlug, endPage, repoRoot),
        eventDelta: eventDeltaSummary(lastEventId, lastEvent),
        activeRecordDelta: activeRecordDelta(pages, events),
        validationStatus: validationStatus(pages),
        suggestedRangeLabel: suggestedRangeLabel(run),
      };
    }),
  );

  return {
    branchId,
    ranges,
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: false,
  };
}
