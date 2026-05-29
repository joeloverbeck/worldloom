import type { IndexStatus } from "./index-status.js";
import type { ScenePublicationState } from "./scene-publication-state.js";

// SPEC-98 §2 item 3 — MVP single-layer scene branch-map. Nodes are scene-layer
// only (the expandable PG/tick layer, full focus-mode set, and reader/causal
// toggle are deferred per SPEC-98 §Out of scope). Scenes are branch-local; the
// graph never forces cross-branch scene segmentation (SPEC-92 SCN contract).

export interface BranchMapSceneNode {
  kind: "scene";
  id: string;
  branchId: string;
  pageIds: string[];
  startPg: string | null;
  endPg: string | null;
  publicationState: ScenePublicationState;
  focused: boolean;
}

export interface BranchMapUnscenedRunNode {
  kind: "unscened_run";
  id: string;
  branchId: string;
  pageIds: string[];
  startPg: string;
  endPg: string;
  tickCount: number;
  finalChoiceCount: number;
  // Compressed-bar label, e.g. "PG-14..PG-18 · 5 ticks · no SCN · final choices: 4".
  label: string;
  focused: boolean;
}

export interface BranchMapBranchSplitNode {
  kind: "branch_split";
  id: string;
  branchId: string;
  pageId: string;
  childBranchIds: string[];
  focused: boolean;
}

export interface BranchMapChoiceSurfaceNode {
  kind: "choice_surface";
  id: string;
  branchId: string;
  pageId: string;
  choiceCount: number;
  focused: boolean;
}

export interface BranchMapTerminalNode {
  kind: "terminal_marker";
  id: string;
  branchId: string;
  pageId: string;
  reason: "no_children" | "paused" | "terminal";
  focused: boolean;
}

export type BranchMapNode =
  | BranchMapSceneNode
  | BranchMapUnscenedRunNode
  | BranchMapBranchSplitNode
  | BranchMapChoiceSurfaceNode
  | BranchMapTerminalNode;

export interface BranchMapEdge {
  from: string;
  to: string;
  branchId: string;
  // `sequence` connects consecutive nodes inside one branch; `fork` connects a
  // branch_split to the first node of each child branch.
  kind: "sequence" | "fork";
}

export interface BranchMapFocus {
  requested: string;
  resolvedBranchId: string | null;
  nodeId: string | null;
}

export interface BranchMapGraph {
  focus: BranchMapFocus;
  depth: number;
  branchIds: string[];
  nodes: BranchMapNode[];
  edges: BranchMapEdge[];
  indexStatus: IndexStatus;
  degradedDirectRead: boolean;
}
