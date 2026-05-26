import type { IndexStatus } from "./index-status.js";

export interface WorldSummary {
  worldSlug: string;
  displayName: string;
  path: string;
  indexStatus: IndexStatus;
  storyCount: number;
  hasWorldDb: boolean;
  indexVersion: number | null;
  driftedFiles: string[];
  errors: string[];
}
