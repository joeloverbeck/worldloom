import type { IndexStatus } from "./index-status.js";
import type { ScenePublicationState } from "./scene-publication-state.js";

export interface LatestSceneSummary {
  sceneId: string;
  publicationState: ScenePublicationState;
}

export interface BranchOverviewSummary {
  branchId: string;
  rootPageId: string | null;
  latestPageId: string | null;
  latestScene: LatestSceneSummary | null;
}

export interface SceneCoverageCounts {
  status: "available" | "degraded";
  activeSceneCount: number | null;
  supersededSceneCount: number | null;
  totalSceneCount: number | null;
}

export interface UnscenedRunCounts {
  status: "available" | "degraded";
  runCount: number | null;
  pageCount: number | null;
}

export interface StoryOverview {
  worldSlug: string;
  storySlug: string;
  storyId: string;
  title: string | null;
  rootPageId: string | null;
  latestPageId: string | null;
  branchCount: number;
  pageCount: number;
  choiceCount: number;
  branches: BranchOverviewSummary[];
  sceneCoverageCounts: SceneCoverageCounts;
  unscenedRunCounts: UnscenedRunCounts;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}
