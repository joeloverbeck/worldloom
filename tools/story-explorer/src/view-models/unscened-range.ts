import type { ChoiceSurface } from "./choice-surface.js";
import type { EventDeltaSummary } from "./event-delta-summary.js";
import type { IndexStatus } from "./index-status.js";

export interface ActiveRecordDeltaSummary {
  startActiveRecordCounts: Record<string, number>;
  endActiveRecordCounts: Record<string, number>;
  createdRecordIds: string[];
  supersededRecordIds: string[];
  closedRecordIds: string[];
}

export interface UnscenedRangeValidationStatus {
  pageCount: number;
  pagesWithValidationTrace: number;
  verdict: "present" | "missing";
}

export interface UnscenedRange {
  startPg: string;
  endPg: string;
  pageIds: string[];
  count: number;
  finalChoiceSurface: ChoiceSurface;
  eventDelta: EventDeltaSummary;
  activeRecordDelta: ActiveRecordDeltaSummary;
  validationStatus: UnscenedRangeValidationStatus;
  /** Non-authoritative orientation hint for authors; not a scene-boundary verdict. */
  suggestedRangeLabel: string;
}

export interface UnscenedRangeList {
  branchId: string;
  ranges: UnscenedRange[];
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}
