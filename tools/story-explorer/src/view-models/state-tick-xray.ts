import type { ChoiceSurface } from "./choice-surface.js";
import type { EventDeltaSummary } from "./event-delta-summary.js";
import type { IndexStatus } from "./index-status.js";

export interface StateTickContainerLink {
  kind: "scene" | "unscened_range" | "unknown";
  sceneId: string | null;
  startPg: string | null;
  endPg: string | null;
  pageIds: string[];
}

export interface StateTickXray {
  pageId: string;
  parentPageId: string | null;
  branchId: string;
  branchPath: string[];
  turnIndex: number;
  inputMode: string | null;
  resolvedEventId: string | null;
  stateHash: string | null;
  parentStateHash: string | null;
  stateSnapshotSummary: {
    activeRecordCounts: Record<string, number>;
    continuationStatus: string | null;
    unresolvedMysteryClaims: string[];
  };
  activeRecordsByClass: Record<string, string[]>;
  visibleAffordances: string[];
  unresolvedMysteryClaims: string[];
  continuationStatus: string | null;
  emittedChoices: ChoiceSurface;
  validationTrace: Record<string, unknown>;
  rawPageYaml: {
    sourcePath: string;
    contentHash: string;
    body: string;
  };
  resolvedEvent: Record<string, unknown> | null;
  eventDelta: EventDeltaSummary;
  createdRecordIds: string[];
  supersededRecordIds: string[];
  closedRecordIds: string[];
  container: StateTickContainerLink;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}
