import type { IndexStatus } from "./index-status.js";

export interface StorySummary {
  worldSlug: string;
  storySlug: string;
  storyId: string;
  title: string | null;
  kernelPath: string;
  pageCount: number;
  choiceCount: number;
  branchCount: number;
  leafPageIds: string[];
  rootPageId: string | null;
  latestPageId: string | null;
  indexStatus: IndexStatus;
}
