import type { ChoiceSurface } from "./choice-surface.js";
import type { IndexStatus } from "./index-status.js";
import type { ScenePublicationState } from "./scene-publication-state.js";

export interface TimelineFocus {
  requested: string;
  segmentIndex: number | null;
  pageId: string | null;
  sceneId: string | null;
}

export interface SceneTimelineSegment {
  kind: "scene_segment";
  sceneId: string;
  pageIds: string[];
  startPageId: string;
  endPageId: string;
  publicationState: ScenePublicationState;
  focused: boolean;
}

export interface UnscenedRunTimelineSegment {
  kind: "unscened_run";
  pageIds: string[];
  startPageId: string;
  endPageId: string;
  focused: boolean;
}

export interface ChoiceSurfaceTimelineSegment {
  kind: "choice_surface";
  pageId: string;
  choiceSurface: ChoiceSurface;
  focused: boolean;
}

export interface BranchSplitTimelineSegment {
  kind: "branch_split";
  pageId: string;
  childBranchIds: string[];
  focused: boolean;
}

export interface TerminalMarkerTimelineSegment {
  kind: "terminal_marker";
  pageId: string;
  reason: "no_children" | "paused" | "terminal";
  focused: boolean;
}

export type TimelineSegment =
  | SceneTimelineSegment
  | UnscenedRunTimelineSegment
  | ChoiceSurfaceTimelineSegment
  | BranchSplitTimelineSegment
  | TerminalMarkerTimelineSegment;

export interface BranchTimeline {
  branchId: string;
  segments: TimelineSegment[];
  focus: TimelineFocus | null;
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}
