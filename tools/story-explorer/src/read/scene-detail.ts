import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolveRepoRoot } from "../config/repo-root.js";
import { parseRecordBody, readRecord, storyDirectory, type RawRecord } from "./record-io.js";
import { readSceneCoverage, type SceneCoverageBranch, type SceneCoverageScene } from "./scene-coverage.js";
import type { ChoiceSurface, ChoiceSurfaceChoice } from "../view-models/choice-surface.js";
import type { EventDeltaSummary } from "../view-models/event-delta-summary.js";
import type {
  SceneArtifactRead,
  SceneDetail,
  SceneList,
  ScenePageSummary,
} from "../view-models/scene-detail.js";
import type { SceneCoverageStatus, SceneSummary } from "../view-models/scene-summary.js";

export interface SceneListOptions {
  branchId?: string;
  hasProse?: boolean;
  receiptVerdict?: "PASS" | "WARN" | "FAIL";
  coverage?: SceneCoverageStatus;
}

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

function activeRecordCounts(page: PageRecord): Record<string, number> {
  const activeRecords = record(record(page.state_snapshot).active_records);
  return Object.fromEntries(
    Object.entries(activeRecords).map(([key, value]) => [key, recordIdArray(value).length]),
  );
}

function stateDeltaCounts(event: Record<string, unknown> | null): { create: number; supersede: number; close: number } {
  const stateDelta = record(event?.state_delta);
  return {
    create: recordIdArray(stateDelta.create).length,
    supersede: recordIdArray(stateDelta.supersede).length,
    close: recordIdArray(stateDelta.close).length,
  };
}

function eventDeltaSummary(eventId: string | null, event: Record<string, unknown> | null): EventDeltaSummary {
  const counts = stateDeltaCounts(event);
  return {
    eventId,
    createCount: counts.create,
    supersedeCount: counts.supersede,
    closeCount: counts.close,
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
): Promise<ChoiceSurface | null> {
  const choiceIds = stringArray(page.emitted_choices);
  if (choiceIds.length === 0) {
    return null;
  }

  const emittedChoices = await Promise.all(
    choiceIds.map(async (choiceId): Promise<ChoiceSurfaceChoice> => {
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

function sceneStatus(branch: SceneCoverageBranch, scene: SceneCoverageScene): SceneCoverageStatus {
  return branch.superseded_scene_ids.includes(scene.scene_id) || scene.superseded ? "superseded" : "active";
}

function sceneSummary(branch: SceneCoverageBranch, scene: SceneCoverageScene): SceneSummary {
  return {
    sceneId: scene.scene_id,
    branchId: scene.branch_id,
    pageIds: scene.pg_ids,
    startPageId: scene.pg_ids[0] ?? null,
    endPageId: scene.pg_ids.at(-1) ?? null,
    publicationState: scene.publication_indicator,
    coverageStatus: sceneStatus(branch, scene),
    artifactAvailability: scene.artifact_availability,
  };
}

function allSceneEntries(branches: SceneCoverageBranch[]): Array<{ branch: SceneCoverageBranch; scene: SceneCoverageScene }> {
  return branches.flatMap((branch) => branch.scenes.map((scene) => ({ branch, scene })));
}

function matchesFilters(
  branch: SceneCoverageBranch,
  scene: SceneCoverageScene,
  options: SceneListOptions,
): boolean {
  if (options.branchId !== undefined && branch.branch_id !== options.branchId) {
    return false;
  }
  if (options.hasProse !== undefined && scene.artifact_availability.prose_present !== options.hasProse) {
    return false;
  }
  if (
    options.receiptVerdict !== undefined &&
    scene.artifact_availability.receipt_verdict !== options.receiptVerdict
  ) {
    return false;
  }
  if (options.coverage !== undefined && sceneStatus(branch, scene) !== options.coverage) {
    return false;
  }
  return true;
}

function sceneArtifactHref(worldSlug: string, storySlug: string, sceneId: string, kind: SceneArtifactRead["kind"]): string {
  return `/api/worlds/${worldSlug}/stories/${storySlug}/scenes/${sceneId}/${kind}`;
}

function sceneXrayHref(worldSlug: string, storySlug: string, pageIdValue: string): string {
  return `/api/worlds/${worldSlug}/stories/${storySlug}/state-ticks/${pageIdValue}/xray`;
}

function artifactPath(
  repoRoot: string,
  worldSlug: string,
  storySlug: string,
  sceneId: string,
  kind: SceneArtifactRead["kind"],
): string {
  const base = storyDirectory(repoRoot, worldSlug, storySlug);
  const candidate =
    kind === "plan"
      ? path.join(base, "scene-prose-plans", `${sceneId}.md`)
      : kind === "prose"
        ? path.join(base, "scene-prose", `${sceneId}.md`)
        : path.join(base, "scene-prose-receipts", `${sceneId}.yaml`);

  // Defense in depth: the route layer already constrains worldSlug / storySlug /
  // sceneId, but artifactPath is a reusable building block. Confine the resolved
  // path to the repo's worlds/ tree (a root with no user-controlled segments) so
  // no caller can traverse outside it via "..", absolute paths, or separators.
  const worldsRoot = path.resolve(repoRoot, "worlds");
  const resolved = path.resolve(candidate);
  if (resolved !== worldsRoot && !resolved.startsWith(`${worldsRoot}${path.sep}`)) {
    throw new Error(`Refusing to read scene artifact outside worlds/: ${sceneId}`);
  }
  return resolved;
}

function comparePage(left: PageRecord, right: PageRecord): number {
  return numberValue(left.turn_index) - numberValue(right.turn_index) ||
    pageId(left).localeCompare(pageId(right), undefined, { numeric: true });
}

function includedPageSummary(
  worldSlug: string,
  storySlug: string,
  pageRecord: RawRecord,
): ScenePageSummary {
  const page = pageRecord.parsed;
  return {
    pageId: pageId(page),
    branchId: stringValue(page.branch_id) ?? "",
    parentPageId: stringValue(page.parent_page_id),
    turnIndex: numberValue(page.turn_index),
    resolvedEventId: stringValue(pageInput(page).resolved_event_id),
    activeRecordCounts: activeRecordCounts(page),
    xrayHref: sceneXrayHref(worldSlug, storySlug, pageId(page)),
  };
}

export function readSceneList(
  worldSlug: string,
  storySlug: string,
  options: SceneListOptions = {},
  repoRoot = resolveRepoRoot(),
): SceneList {
  const coverage = readSceneCoverage(
    {
      worldSlug,
      storySlug,
      ...(options.branchId === undefined ? {} : { branchId: options.branchId }),
    },
    repoRoot,
  );

  const scenes = coverage.degradedDirectRead
    ? []
    : allSceneEntries(coverage.branches)
        .filter(({ branch, scene }) => matchesFilters(branch, scene, options))
        .map(({ branch, scene }) => sceneSummary(branch, scene))
        .sort((left, right) => left.branchId.localeCompare(right.branchId, undefined, { numeric: true }) ||
          left.sceneId.localeCompare(right.sceneId, undefined, { numeric: true }));

  return {
    scenes,
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: coverage.degradedDirectRead,
  };
}

export async function readSceneDetail(
  worldSlug: string,
  storySlug: string,
  sceneId: string,
  repoRoot = resolveRepoRoot(),
): Promise<SceneDetail | null> {
  const coverage = readSceneCoverage({ worldSlug, storySlug }, repoRoot);
  if (coverage.degradedDirectRead) {
    return null;
  }

  const entry = allSceneEntries(coverage.branches).find(({ scene }) => scene.scene_id === sceneId);
  if (entry === undefined) {
    return null;
  }

  const pageRecords = await Promise.all(
    entry.scene.pg_ids.map((id) => readOptionalRecord(worldSlug, storySlug, id, repoRoot)),
  );
  const pages = pageRecords
    .filter((page): page is RawRecord => page !== null)
    .sort((left, right) => comparePage(left.parsed, right.parsed));
  const endPage = pages.at(-1)?.parsed ?? null;
  const eventDeltas = await Promise.all(
    pages.map(async (page) => {
      const eventId = stringValue(pageInput(page.parsed).resolved_event_id);
      const event = (await readOptionalRecord(worldSlug, storySlug, eventId, repoRoot))?.parsed ?? null;
      return eventDeltaSummary(eventId, event);
    }),
  );
  const sceneRecord = (await readOptionalRecord(worldSlug, storySlug, sceneId, repoRoot))?.parsed ?? null;

  return {
    sceneId,
    branchId: entry.scene.branch_id,
    sceneRecord,
    pageIds: entry.scene.pg_ids,
    publicationState: entry.scene.publication_indicator,
    coverageStatus: sceneStatus(entry.branch, entry.scene),
    includedPages: pages.map((page) => includedPageSummary(worldSlug, storySlug, page)),
    endChoiceSurface:
      endPage === null ? null : await choiceSurfaceFor(worldSlug, storySlug, endPage, repoRoot),
    eventDeltas,
    artifactAvailability: entry.scene.artifact_availability,
    artifactLinks: {
      plan: sceneArtifactHref(worldSlug, storySlug, sceneId, "plan"),
      prose: sceneArtifactHref(worldSlug, storySlug, sceneId, "prose"),
      receipt: sceneArtifactHref(worldSlug, storySlug, sceneId, "receipt"),
    },
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: coverage.degradedDirectRead,
  };
}

export async function readSceneArtifact(
  worldSlug: string,
  storySlug: string,
  sceneId: string,
  kind: SceneArtifactRead["kind"],
  repoRoot = resolveRepoRoot(),
): Promise<SceneArtifactRead | null> {
  const sourcePath = artifactPath(repoRoot, worldSlug, storySlug, sceneId, kind);
  try {
    const raw = await readFile(sourcePath, "utf8");
    return {
      sceneId,
      kind,
      sourcePath,
      body: kind === "receipt" ? parseRecordBody(raw) : raw,
    };
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
