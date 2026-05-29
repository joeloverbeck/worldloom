import type { SceneArtifactAvailability } from "@worldloom/world-index/public/types";

import type { ChoiceSurface } from "./choice-surface.js";
import type { EventDeltaSummary } from "./event-delta-summary.js";
import type { IndexStatus } from "./index-status.js";
import type { ScenePublicationState } from "./scene-publication-state.js";
import type { SceneSummary } from "./scene-summary.js";

export interface ScenePageSummary {
  pageId: string;
  branchId: string;
  parentPageId: string | null;
  turnIndex: number;
  resolvedEventId: string | null;
  activeRecordCounts: Record<string, number>;
  xrayHref: string;
}

export interface SceneArtifactLinks {
  plan: string;
  prose: string;
  receipt: string;
}

export interface SceneDetail {
  sceneId: string;
  branchId: string;
  sceneRecord: Record<string, unknown> | null;
  pageIds: string[];
  publicationState: ScenePublicationState;
  coverageStatus: "active" | "superseded";
  includedPages: ScenePageSummary[];
  endChoiceSurface: ChoiceSurface | null;
  eventDeltas: EventDeltaSummary[];
  artifactAvailability: SceneArtifactAvailability;
  artifactLinks: SceneArtifactLinks;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

export interface SceneList {
  scenes: SceneSummary[];
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}

export interface SceneArtifactRead {
  sceneId: string;
  kind: "plan" | "prose" | "receipt";
  sourcePath: string;
  body: string | Record<string, unknown>;
}
