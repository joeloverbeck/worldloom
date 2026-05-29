import { resolveRepoRoot } from "../config/repo-root.js";
import { listPageRecords, readRecord } from "./record-io.js";
import { readSceneCoverage, type SceneCoverageBranch, type SceneCoverageScene } from "./scene-coverage.js";
import type { BranchTimeline, TimelineSegment } from "../view-models/branch-timeline.js";
import type { ChoiceSurface, ChoiceSurfaceChoice } from "../view-models/choice-surface.js";

interface TimelineOptions {
  branchId?: string;
  focus?: string;
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

function turnIndex(page: PageRecord): number {
  return numberValue(page.turn_index);
}

function branchIdOf(page: PageRecord): string {
  return stringValue(page.branch_id) ?? "";
}

function parentPageId(page: PageRecord): string | null {
  return stringValue(page.parent_page_id);
}

function emittedChoices(page: PageRecord): string[] {
  return stringArray(page.emitted_choices);
}

function branchPath(page: PageRecord): string[] {
  const explicit = stringArray(page.branch_path);
  const id = pageId(page);
  if (explicit.length === 0) {
    return [];
  }
  return explicit.includes(id) ? explicit : [...explicit, id];
}

function comparePage(left: PageRecord, right: PageRecord): number {
  return turnIndex(left) - turnIndex(right) || pageId(left).localeCompare(pageId(right), undefined, { numeric: true });
}

function chooseBranchId(pages: PageRecord[], coverage: SceneCoverageBranch[], requested?: string): string | null {
  if (requested !== undefined && requested.length > 0) {
    return requested;
  }
  const ids = new Set([...pages.map(branchIdOf), ...coverage.map((branch) => branch.branch_id)]);
  return [...ids].filter(Boolean).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))[0] ?? null;
}

function pathPagesForBranch(pages: PageRecord[], branchId: string): PageRecord[] {
  const byId = new Map(pages.map((page) => [pageId(page), page]));
  const branchPages = pages.filter((page) => branchIdOf(page) === branchId).sort(comparePage);
  const latest = branchPages[branchPages.length - 1];
  if (latest === undefined) {
    return [];
  }

  const explicitPath = branchPath(latest);
  if (explicitPath.length > 0) {
    return explicitPath.map((id) => byId.get(id)).filter((page): page is PageRecord => page !== undefined);
  }

  const reversed: PageRecord[] = [];
  let current: PageRecord | undefined = latest;
  while (current !== undefined) {
    reversed.push(current);
    const parent = parentPageId(current);
    current = parent === null ? undefined : byId.get(parent);
  }
  return reversed.reverse();
}

function childrenByParent(pages: PageRecord[]): Map<string, PageRecord[]> {
  const children = new Map<string, PageRecord[]>();
  for (const page of pages) {
    const parent = parentPageId(page);
    if (parent === null) {
      continue;
    }
    const list = children.get(parent) ?? [];
    list.push(page);
    children.set(parent, list);
  }
  for (const list of children.values()) {
    list.sort(comparePage);
  }
  return children;
}

function terminalReason(page: PageRecord, isLeaf: boolean): "no_children" | "paused" | "terminal" | null {
  const status = stringValue(record(record(page.state_snapshot).continuation).terminal_status);
  if (status === "branch_pause") {
    return "paused";
  }
  if (status === "terminal_closed") {
    return "terminal";
  }
  return isLeaf ? "no_children" : null;
}

function activeSceneByPage(coverage: SceneCoverageBranch | undefined): Map<string, SceneCoverageScene> {
  const active = new Set(coverage?.active_scene_ids ?? []);
  const byPage = new Map<string, SceneCoverageScene>();
  for (const scene of coverage?.scenes ?? []) {
    if (!active.has(scene.scene_id)) {
      continue;
    }
    for (const id of scene.pg_ids) {
      byPage.set(id, scene);
    }
  }
  return byPage;
}

function unscenedRunByPage(coverage: SceneCoverageBranch | undefined): Map<string, string> {
  const byPage = new Map<string, string>();
  for (const run of coverage?.unscened_runs ?? []) {
    const key = `${run.start_pg}:${run.end_pg}`;
    for (const id of run.pg_ids) {
      byPage.set(id, key);
    }
  }
  return byPage;
}

async function choiceSurfaceFor(
  worldSlug: string,
  storySlug: string,
  page: PageRecord,
  repoRoot: string,
): Promise<ChoiceSurface> {
  const choices = await Promise.all(
    emittedChoices(page).map(async (choiceId): Promise<ChoiceSurfaceChoice> => {
      let choice: Record<string, unknown> | null = null;
      try {
        choice = (await readRecord(worldSlug, storySlug, choiceId, repoRoot)).parsed;
      } catch (error) {
        const candidate = error as NodeJS.ErrnoException;
        if (candidate.code !== "ENOENT") {
          throw error;
        }
      }

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
    emittedChoices: choices,
  };
}

function focusMatchesSegment(focus: string | undefined, segment: TimelineSegment): boolean {
  if (focus === undefined) {
    return false;
  }
  if ("pageIds" in segment && segment.pageIds.includes(focus)) {
    return true;
  }
  if ("pageId" in segment && segment.pageId === focus) {
    return true;
  }
  return segment.kind === "scene_segment" && segment.sceneId === focus;
}

function focusFor(focus: string | undefined, segments: TimelineSegment[]): BranchTimeline["focus"] {
  if (focus === undefined) {
    return null;
  }
  const segmentIndex = segments.findIndex((segment) => focusMatchesSegment(focus, segment));
  const segment = segmentIndex < 0 ? null : segments[segmentIndex] ?? null;
  return {
    requested: focus,
    segmentIndex: segmentIndex < 0 ? null : segmentIndex,
    pageId:
      segment !== null && "pageId" in segment
        ? segment.pageId
        : segment !== null && "pageIds" in segment && focus.startsWith("PG-")
          ? focus
          : null,
    sceneId: segment?.kind === "scene_segment" ? segment.sceneId : null,
  };
}

export async function readBranchTimeline(
  worldSlug: string,
  storySlug: string,
  options: TimelineOptions = {},
  repoRoot = resolveRepoRoot(),
): Promise<BranchTimeline | null> {
  const pages = (await listPageRecords(worldSlug, storySlug, repoRoot)).map((entry) => entry.parsed);
  const coverage = readSceneCoverage(
    {
      worldSlug,
      storySlug,
      ...(options.branchId === undefined ? {} : { branchId: options.branchId }),
    },
    repoRoot,
  );
  const selectedBranchId = chooseBranchId(pages, coverage.branches, options.branchId);
  if (selectedBranchId === null) {
    return null;
  }

  const coverageBranch = coverage.branches.find((branch) => branch.branch_id === selectedBranchId);
  const pathPages = pathPagesForBranch(pages, selectedBranchId);
  if (pathPages.length === 0 && coverageBranch === undefined) {
    return null;
  }

  const sceneByPage = coverage.degradedDirectRead ? new Map<string, SceneCoverageScene>() : activeSceneByPage(coverageBranch);
  const unscenedByPage = coverage.degradedDirectRead ? new Map<string, string>() : unscenedRunByPage(coverageBranch);
  const children = childrenByParent(pages);
  const segments: TimelineSegment[] = [];
  let index = 0;

  while (index < pathPages.length) {
    const page = pathPages[index];
    if (page === undefined) {
      index += 1;
      continue;
    }

    const id = pageId(page);
    const scene = sceneByPage.get(id);
    const unscenedKey = unscenedByPage.get(id);
    const runPages: PageRecord[] = [page];
    index += 1;

    while (index < pathPages.length) {
      const candidate = pathPages[index];
      if (candidate === undefined) {
        break;
      }
      const candidateId = pageId(candidate);
      const sameScene = scene !== undefined && sceneByPage.get(candidateId)?.scene_id === scene.scene_id;
      const sameUnscened = scene === undefined && unscenedKey !== undefined && unscenedByPage.get(candidateId) === unscenedKey;
      if (!sameScene && !sameUnscened) {
        break;
      }
      runPages.push(candidate);
      index += 1;
    }

    const runIds = runPages.map(pageId);
    const startPageId = runIds[0] ?? id;
    const endPage = runPages[runPages.length - 1] ?? page;
    const endPageId = pageId(endPage);

    if (scene !== undefined) {
      segments.push({
        kind: "scene_segment",
        sceneId: scene.scene_id,
        pageIds: runIds,
        startPageId,
        endPageId,
        publicationState: scene.publication_indicator,
        focused: false,
      });
    } else if (unscenedKey !== undefined) {
      segments.push({
        kind: "unscened_run",
        pageIds: runIds,
        startPageId,
        endPageId,
        focused: false,
      });
    }

    if (emittedChoices(endPage).length > 0) {
      segments.push({
        kind: "choice_surface",
        pageId: endPageId,
        choiceSurface: await choiceSurfaceFor(worldSlug, storySlug, endPage, repoRoot),
        focused: false,
      });
    }

    const childPages = children.get(endPageId) ?? [];
    const childBranchIds = [...new Set(childPages.map(branchIdOf).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    if (childBranchIds.length > 1) {
      segments.push({
        kind: "branch_split",
        pageId: endPageId,
        childBranchIds,
        focused: false,
      });
    }

    const terminal = terminalReason(endPage, childPages.length === 0);
    if (terminal !== null) {
      segments.push({
        kind: "terminal_marker",
        pageId: endPageId,
        reason: terminal,
        focused: false,
      });
    }
  }

  for (const segment of segments) {
    segment.focused = focusMatchesSegment(options.focus, segment);
  }

  return {
    branchId: selectedBranchId,
    segments,
    focus: focusFor(options.focus, segments),
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: coverage.degradedDirectRead,
  };
}
