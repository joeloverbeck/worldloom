import { resolveRepoRoot } from "../config/repo-root.js";
import { readRecord, type RawRecord } from "./record-io.js";
import { readSceneCoverage, type SceneCoverageBranch, type SceneCoverageScene } from "./scene-coverage.js";
import type { ChoiceSurface, ChoiceSurfaceChoice } from "../view-models/choice-surface.js";
import type { EventDeltaSummary } from "../view-models/event-delta-summary.js";
import type { StateTickContainerLink, StateTickXray } from "../view-models/state-tick-xray.js";

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

function stateSnapshot(page: PageRecord): Record<string, unknown> {
  return record(page.state_snapshot);
}

function activeRecordsByClass(page: PageRecord): Record<string, string[]> {
  const activeRecords = record(stateSnapshot(page).active_records);
  return Object.fromEntries(
    Object.entries(activeRecords).map(([key, value]) => [key, recordIdArray(value)]),
  );
}

function activeRecordCounts(page: PageRecord): Record<string, number> {
  return Object.fromEntries(
    Object.entries(activeRecordsByClass(page)).map(([key, value]) => [key, value.length]),
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

function activeSceneForPage(branch: SceneCoverageBranch, targetPageId: string): SceneCoverageScene | null {
  const active = new Set(branch.active_scene_ids);
  return branch.scenes.find((scene) => active.has(scene.scene_id) && scene.pg_ids.includes(targetPageId)) ?? null;
}

function containerForPage(branches: SceneCoverageBranch[], targetPageId: string): StateTickContainerLink {
  for (const branch of branches) {
    const scene = activeSceneForPage(branch, targetPageId);
    if (scene !== null) {
      return {
        kind: "scene",
        sceneId: scene.scene_id,
        startPg: scene.pg_ids[0] ?? null,
        endPg: scene.pg_ids.at(-1) ?? null,
        pageIds: scene.pg_ids,
      };
    }
    const run = branch.unscened_runs.find((candidate) => candidate.pg_ids.includes(targetPageId));
    if (run !== undefined) {
      return {
        kind: "unscened_range",
        sceneId: null,
        startPg: run.start_pg,
        endPg: run.end_pg,
        pageIds: run.pg_ids,
      };
    }
  }

  return {
    kind: "unknown",
    sceneId: null,
    startPg: null,
    endPg: null,
    pageIds: [],
  };
}

function inputMode(input: Record<string, unknown>): string | null {
  return stringValue(input.input_mode) ??
    (stringValue(input.choice_id) !== null
      ? "choice"
      : stringValue(input.manual_action_text) !== null
        ? "manual_action"
        : null);
}

function continuationStatus(page: PageRecord): string | null {
  return stringValue(record(stateSnapshot(page).continuation).terminal_status);
}

function unresolvedMysteryClaims(page: PageRecord): string[] {
  return stringArray(stateSnapshot(page).unresolved_mystery_claims);
}

function visibleAffordances(page: PageRecord): string[] {
  const snapshot = stateSnapshot(page);
  return stringArray(snapshot.visible_affordances).concat(stringArray(snapshot.affordances));
}

function branchPath(page: PageRecord): string[] {
  const explicit = stringArray(page.branch_path);
  const id = pageId(page);
  if (explicit.length === 0) {
    return id === "" ? [] : [id];
  }
  return explicit.includes(id) ? explicit : [...explicit, id];
}

export async function readStateTickXray(
  worldSlug: string,
  storySlug: string,
  targetPageId: string,
  repoRoot = resolveRepoRoot(),
): Promise<StateTickXray | null> {
  const pageRecord = await readOptionalRecord(worldSlug, storySlug, targetPageId, repoRoot);
  if (pageRecord === null) {
    return null;
  }

  const page = pageRecord.parsed;
  const input = pageInput(page);
  const eventId = stringValue(input.resolved_event_id);
  const event = (await readOptionalRecord(worldSlug, storySlug, eventId, repoRoot))?.parsed ?? null;
  const delta = stateDelta(event);
  const snapshot = stateSnapshot(page);
  const claims = unresolvedMysteryClaims(page);
  const pageBranchId = stringValue(page.branch_id);
  const coverage = readSceneCoverage(
    {
      worldSlug,
      storySlug,
      ...(pageBranchId === null ? {} : { branchId: pageBranchId }),
    },
    repoRoot,
  );

  return {
    pageId: pageId(page),
    parentPageId: stringValue(page.parent_page_id),
    branchId: stringValue(page.branch_id) ?? "",
    branchPath: branchPath(page),
    turnIndex: numberValue(page.turn_index),
    inputMode: inputMode(input),
    resolvedEventId: eventId,
    stateHash: stringValue(snapshot.state_hash),
    parentStateHash: stringValue(snapshot.parent_state_hash),
    stateSnapshotSummary: {
      activeRecordCounts: activeRecordCounts(page),
      continuationStatus: continuationStatus(page),
      unresolvedMysteryClaims: claims,
    },
    activeRecordsByClass: activeRecordsByClass(page),
    visibleAffordances: visibleAffordances(page),
    unresolvedMysteryClaims: claims,
    continuationStatus: continuationStatus(page),
    emittedChoices: await choiceSurfaceFor(worldSlug, storySlug, page, repoRoot),
    validationTrace: record(page.validation_trace),
    rawPageYaml: {
      sourcePath: pageRecord.sourcePath,
      contentHash: pageRecord.contentHash,
      body: pageRecord.body,
    },
    resolvedEvent: event,
    eventDelta: eventDeltaSummary(eventId, event),
    createdRecordIds: delta.create,
    supersededRecordIds: delta.supersede,
    closedRecordIds: delta.close,
    container: coverage.degradedDirectRead ? containerForPage([], targetPageId) : containerForPage(coverage.branches, targetPageId),
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: coverage.degradedDirectRead,
  };
}
