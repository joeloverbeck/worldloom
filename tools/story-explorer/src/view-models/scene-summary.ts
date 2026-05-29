import type { SceneArtifactAvailability } from "@worldloom/world-index/public/types";

import type { ScenePublicationState } from "./scene-publication-state.js";

export type SceneCoverageStatus = "active" | "superseded";

export interface SceneSummary {
  sceneId: string;
  branchId: string;
  pageIds: string[];
  startPageId: string | null;
  endPageId: string | null;
  publicationState: ScenePublicationState;
  coverageStatus: SceneCoverageStatus;
  artifactAvailability: SceneArtifactAvailability;
}
