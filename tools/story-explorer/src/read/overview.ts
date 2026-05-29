import { resolveRepoRoot } from "../config/repo-root.js";
import { readSceneCoverage, type SceneCoverageBranch, type SceneCoverageScene } from "./scene-coverage.js";
import { enumerateStories, getPageSummaries } from "./story-list.js";
import type { PageSummary } from "../view-models/page-summary.js";
import type {
  BranchOverviewSummary,
  LatestSceneSummary,
  StoryOverview,
} from "../view-models/story-overview.js";

function comparePageOrder(left: PageSummary, right: PageSummary): number {
  return left.turnIndex - right.turnIndex || left.pageId.localeCompare(right.pageId);
}

function pagesForBranch(pages: PageSummary[], branchId: string): PageSummary[] {
  return pages.filter((page) => page.branchId === branchId).sort(comparePageOrder);
}

function latestSceneForBranch(
  branch: SceneCoverageBranch,
  turnIndexByPageId: Map<string, number>,
): LatestSceneSummary | null {
  const activeSceneIds = new Set(branch.active_scene_ids);
  const activeScenes = branch.scenes.filter((scene) => activeSceneIds.has(scene.scene_id));
  const latest = activeScenes.reduce<SceneCoverageScene | null>((candidate, scene) => {
    if (candidate === null) {
      return scene;
    }

    const candidateTurnIndex = maxTurnIndex(candidate.pg_ids, turnIndexByPageId);
    const sceneTurnIndex = maxTurnIndex(scene.pg_ids, turnIndexByPageId);
    if (sceneTurnIndex !== candidateTurnIndex) {
      return sceneTurnIndex > candidateTurnIndex ? scene : candidate;
    }

    return scene.scene_id.localeCompare(candidate.scene_id) > 0 ? scene : candidate;
  }, null);

  if (latest === null) {
    return null;
  }

  return {
    sceneId: latest.scene_id,
    publicationState: latest.publication_indicator,
  };
}

function maxTurnIndex(pageIds: string[], turnIndexByPageId: Map<string, number>): number {
  return pageIds.reduce((latest, pageId) => Math.max(latest, turnIndexByPageId.get(pageId) ?? -1), -1);
}

function branchIdsFrom(pages: PageSummary[], coverageBranches: SceneCoverageBranch[]): string[] {
  return [...new Set([...pages.map((page) => page.branchId), ...coverageBranches.map((branch) => branch.branch_id)])]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function buildBranchSummary(
  branchId: string,
  pages: PageSummary[],
  coverageBranch: SceneCoverageBranch | undefined,
  turnIndexByPageId: Map<string, number>,
): BranchOverviewSummary {
  const branchPages = pagesForBranch(pages, branchId);
  const rootPage = branchPages[0] ?? null;
  const latestPage = branchPages[branchPages.length - 1] ?? null;

  return {
    branchId,
    rootPageId: rootPage?.pageId ?? null,
    latestPageId: latestPage?.pageId ?? null,
    latestScene:
      coverageBranch === undefined ? null : latestSceneForBranch(coverageBranch, turnIndexByPageId),
  };
}

export async function readStoryOverview(
  worldSlug: string,
  storySlug: string,
  repoRoot = resolveRepoRoot(),
): Promise<StoryOverview | null> {
  const stories = await enumerateStories(worldSlug, repoRoot);
  const story = stories.find((candidate) => candidate.storySlug === storySlug);
  if (story === undefined) {
    return null;
  }

  const pages = await getPageSummaries(worldSlug, storySlug, repoRoot);
  const coverage = readSceneCoverage({ worldSlug, storySlug }, repoRoot);
  const turnIndexByPageId = new Map(pages.map((page) => [page.pageId, page.turnIndex]));
  const coverageByBranch = new Map(coverage.branches.map((branch) => [branch.branch_id, branch]));
  const branches = branchIdsFrom(pages, coverage.branches).map((branchId) =>
    buildBranchSummary(branchId, pages, coverageByBranch.get(branchId), turnIndexByPageId)
  );

  const activeSceneCount = coverage.branches.reduce(
    (count, branch) => count + branch.active_scene_ids.length,
    0,
  );
  const supersededSceneCount = coverage.branches.reduce(
    (count, branch) => count + branch.superseded_scene_ids.length,
    0,
  );
  const unscenedRuns = coverage.branches.flatMap((branch) => branch.unscened_runs);
  const coverageAvailable = !coverage.degradedDirectRead;

  return {
    worldSlug: story.worldSlug,
    storySlug: story.storySlug,
    storyId: story.storyId,
    title: story.title,
    rootPageId: story.rootPageId,
    latestPageId: story.latestPageId,
    branchCount: story.branchCount,
    pageCount: story.pageCount,
    choiceCount: story.choiceCount,
    branches,
    sceneCoverageCounts: {
      status: coverageAvailable ? "available" : "degraded",
      activeSceneCount: coverageAvailable ? activeSceneCount : null,
      supersededSceneCount: coverageAvailable ? supersededSceneCount : null,
      totalSceneCount: coverageAvailable ? activeSceneCount + supersededSceneCount : null,
    },
    unscenedRunCounts: {
      status: coverageAvailable ? "available" : "degraded",
      runCount: coverageAvailable ? unscenedRuns.length : null,
      pageCount: coverageAvailable
        ? unscenedRuns.reduce((count, run) => count + run.pg_ids.length, 0)
        : null,
    },
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: coverage.degradedDirectRead,
  };
}
