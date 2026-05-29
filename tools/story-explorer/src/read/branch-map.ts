import { resolveRepoRoot } from "../config/repo-root.js";
import { listPageRecords } from "./record-io.js";
import { readSceneCoverage, type SceneCoverageBranch, type SceneCoverageScene } from "./scene-coverage.js";
import type {
  BranchMapEdge,
  BranchMapFocus,
  BranchMapGraph,
  BranchMapNode,
} from "../view-models/branch-map-graph.js";

export interface BranchMapReadOptions {
  focus: string;
  depth?: number;
}

const DEFAULT_DEPTH = 3;

type PageRecord = Record<string, unknown>;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function pageId(page: PageRecord): string {
  return stringValue(page.id) ?? "";
}

function branchIdOf(page: PageRecord): string {
  return stringValue(page.branch_id) ?? "";
}

function parentPageId(page: PageRecord): string | null {
  return stringValue(page.parent_page_id);
}

function turnIndex(page: PageRecord): number {
  return numberValue(page.turn_index);
}

function emittedChoices(page: PageRecord): string[] {
  return stringArray(page.emitted_choices);
}

function comparePage(left: PageRecord, right: PageRecord): number {
  return turnIndex(left) - turnIndex(right) || pageId(left).localeCompare(pageId(right), undefined, { numeric: true });
}

function compareId(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

// Branch-local pages only — ancestor pages from a parent branch are rendered
// in that parent branch's node list and connected here by a `fork` edge, so a
// branch_split is emitted exactly once (on the branch that owns the fork page).
function branchLocalPages(pages: PageRecord[], branchId: string): PageRecord[] {
  return pages.filter((page) => branchIdOf(page) === branchId).sort(comparePage);
}

function childrenByParent(pages: PageRecord[]): Map<string, PageRecord[]> {
  const children = new Map<string, PageRecord[]>();
  for (const page of pages) {
    const parent = parentPageId(page);
    if (parent === null) {
      continue;
    }
    const list = children.get(parent) ?? [];
    list.push(page);
    children.set(parent, list);
  }
  for (const list of children.values()) {
    list.sort(comparePage);
  }
  return children;
}

function terminalReason(page: PageRecord, isLeaf: boolean): "no_children" | "paused" | "terminal" | null {
  const status = stringValue(record(record(page.state_snapshot).continuation).terminal_status);
  if (status === "branch_pause") {
    return "paused";
  }
  if (status === "terminal_closed") {
    return "terminal";
  }
  return isLeaf ? "no_children" : null;
}

function activeSceneByPage(coverage: SceneCoverageBranch | undefined): Map<string, SceneCoverageScene> {
  const active = new Set(coverage?.active_scene_ids ?? []);
  const byPage = new Map<string, SceneCoverageScene>();
  for (const scene of coverage?.scenes ?? []) {
    if (!active.has(scene.scene_id)) {
      continue;
    }
    for (const id of scene.pg_ids) {
      byPage.set(id, scene);
    }
  }
  return byPage;
}

function unscenedRunByPage(coverage: SceneCoverageBranch | undefined): Map<string, string> {
  const byPage = new Map<string, string>();
  for (const run of coverage?.unscened_runs ?? []) {
    const key = `${run.start_pg}:${run.end_pg}`;
    for (const id of run.pg_ids) {
      byPage.set(id, key);
    }
  }
  return byPage;
}

interface BranchNodes {
  branchId: string;
  nodes: BranchMapNode[];
  edges: BranchMapEdge[];
  firstNodeId: string | null;
  splitNodeByPage: Map<string, string>;
}

// Build the ordered scene-layer node list for one branch (the same segment
// algorithm the timeline read module uses, projected into graph nodes).
function nodesForBranch(
  branchId: string,
  pages: PageRecord[],
  coverageBranch: SceneCoverageBranch | undefined,
  degraded: boolean,
): BranchNodes {
  const pathPages = branchLocalPages(pages, branchId);
  const sceneByPage = degraded ? new Map<string, SceneCoverageScene>() : activeSceneByPage(coverageBranch);
  const unscenedByPage = degraded ? new Map<string, string>() : unscenedRunByPage(coverageBranch);
  const children = childrenByParent(pages);
  const nodes: BranchMapNode[] = [];
  const edges: BranchMapEdge[] = [];
  const splitNodeByPage = new Map<string, string>();
  let previousNodeId: string | null = null;

  const pushNode = (node: BranchMapNode): void => {
    if (previousNodeId !== null) {
      edges.push({ from: previousNodeId, to: node.id, branchId, kind: "sequence" });
    }
    nodes.push(node);
    previousNodeId = node.id;
  };

  let index = 0;
  while (index < pathPages.length) {
    const page = pathPages[index];
    if (page === undefined) {
      index += 1;
      continue;
    }
    const id = pageId(page);
    const scene = sceneByPage.get(id);
    const unscenedKey = unscenedByPage.get(id);
    const runPages: PageRecord[] = [page];
    index += 1;

    while (index < pathPages.length) {
      const candidate = pathPages[index];
      if (candidate === undefined) {
        break;
      }
      const candidateId = pageId(candidate);
      const sameScene = scene !== undefined && sceneByPage.get(candidateId)?.scene_id === scene.scene_id;
      const sameUnscened = scene === undefined && unscenedKey !== undefined && unscenedByPage.get(candidateId) === unscenedKey;
      if (!sameScene && !sameUnscened) {
        break;
      }
      runPages.push(candidate);
      index += 1;
    }

    const runIds = runPages.map(pageId);
    const endPage = runPages[runPages.length - 1] ?? page;
    const endPageId = pageId(endPage);

    if (scene !== undefined) {
      pushNode({
        kind: "scene",
        id: scene.scene_id,
        branchId,
        pageIds: runIds,
        startPg: runIds[0] ?? null,
        endPg: endPageId,
        publicationState: scene.publication_indicator,
        focused: false,
      });
    } else if (unscenedKey !== undefined) {
      const finalChoiceCount = emittedChoices(endPage).length;
      const start = runIds[0] ?? id;
      pushNode({
        kind: "unscened_run",
        id: `ur:${branchId}:${start}:${endPageId}`,
        branchId,
        pageIds: runIds,
        startPg: start,
        endPg: endPageId,
        tickCount: runIds.length,
        finalChoiceCount,
        label: `${start}..${endPageId} · ${runIds.length} ticks · no SCN · final choices: ${finalChoiceCount}`,
        focused: false,
      });
    }

    if (emittedChoices(endPage).length > 0) {
      pushNode({
        kind: "choice_surface",
        id: `chs:${branchId}:${endPageId}`,
        branchId,
        pageId: endPageId,
        choiceCount: emittedChoices(endPage).length,
        focused: false,
      });
    }

    const childPages = children.get(endPageId) ?? [];
    const childBranchIds = [...new Set(childPages.map(branchIdOf).filter(Boolean))].sort(compareId);
    if (childBranchIds.length > 1) {
      const splitId = `split:${branchId}:${endPageId}`;
      splitNodeByPage.set(endPageId, splitId);
      pushNode({
        kind: "branch_split",
        id: splitId,
        branchId,
        pageId: endPageId,
        childBranchIds,
        focused: false,
      });
    }

    const terminal = terminalReason(endPage, childPages.length === 0);
    if (terminal !== null) {
      pushNode({
        kind: "terminal_marker",
        id: `term:${branchId}:${endPageId}`,
        branchId,
        pageId: endPageId,
        reason: terminal,
        focused: false,
      });
    }
  }

  return { branchId, nodes, edges, firstNodeId: nodes[0]?.id ?? null, splitNodeByPage };
}

// Map each non-root branch to the branch it forks from + the fork-point page.
function buildForkTree(pages: PageRecord[]): {
  parentBranchOf: Map<string, string>;
  forkPageOf: Map<string, string>;
  adjacency: Map<string, Set<string>>;
} {
  const byId = new Map(pages.map((page) => [pageId(page), page]));
  const parentBranchOf = new Map<string, string>();
  const forkPageOf = new Map<string, string>();
  const adjacency = new Map<string, Set<string>>();

  const link = (a: string, b: string): void => {
    if (!adjacency.has(a)) {
      adjacency.set(a, new Set());
    }
    if (!adjacency.has(b)) {
      adjacency.set(b, new Set());
    }
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  };

  for (const page of pages) {
    const branchId = branchIdOf(page);
    if (branchId !== "" && !adjacency.has(branchId)) {
      adjacency.set(branchId, new Set());
    }
    const parentId = parentPageId(page);
    if (parentId === null) {
      continue;
    }
    const parent = byId.get(parentId);
    if (parent === undefined) {
      continue;
    }
    const parentBranch = branchIdOf(parent);
    if (parentBranch !== "" && parentBranch !== branchId && !parentBranchOf.has(branchId)) {
      parentBranchOf.set(branchId, parentBranch);
      forkPageOf.set(branchId, parentId);
      link(branchId, parentBranch);
    }
  }

  return { parentBranchOf, forkPageOf, adjacency };
}

function branchesWithinDepth(focusBranch: string, adjacency: Map<string, Set<string>>, depth: number): Set<string> {
  const included = new Set<string>([focusBranch]);
  let frontier = [focusBranch];
  for (let hop = 0; hop < depth; hop += 1) {
    const next: string[] = [];
    for (const branch of frontier) {
      for (const neighbor of adjacency.get(branch) ?? []) {
        if (!included.has(neighbor)) {
          included.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    if (next.length === 0) {
      break;
    }
    frontier = next;
  }
  return included;
}

function resolveFocusBranch(
  focus: string,
  pages: PageRecord[],
  branches: SceneCoverageBranch[],
): string | null {
  if (/^BR-/.test(focus)) {
    return focus;
  }
  if (/^SCN-/.test(focus)) {
    for (const branch of branches) {
      if (branch.scenes.some((scene) => scene.scene_id === focus)) {
        return branch.branch_id;
      }
    }
    return null;
  }
  if (/^PG-/.test(focus)) {
    const page = pages.find((candidate) => pageId(candidate) === focus);
    return page === undefined ? null : branchIdOf(page);
  }
  if (/^CHC-/.test(focus)) {
    const page = pages.find((candidate) => emittedChoices(candidate).includes(focus));
    return page === undefined ? null : branchIdOf(page);
  }
  return null;
}

function focusedNodeId(focus: string, choicePageId: string | null, nodes: BranchMapNode[]): string | null {
  for (const node of nodes) {
    if (node.kind === "scene" && node.id === focus) {
      return node.id;
    }
    if ("pageIds" in node && node.pageIds.includes(focus)) {
      return node.id;
    }
    if ("pageId" in node && node.pageId === focus) {
      return node.id;
    }
    // A CHC focus resolves to the choice_surface node on its emitting page.
    if (node.kind === "choice_surface" && choicePageId !== null && node.pageId === choicePageId) {
      return node.id;
    }
  }
  return null;
}

export async function readBranchMap(
  worldSlug: string,
  storySlug: string,
  options: BranchMapReadOptions,
  repoRoot = resolveRepoRoot(),
): Promise<BranchMapGraph> {
  const depth = options.depth ?? DEFAULT_DEPTH;
  const coverage = readSceneCoverage({ worldSlug, storySlug }, repoRoot);
  const baseFocus: BranchMapFocus = { requested: options.focus, resolvedBranchId: null, nodeId: null };

  if (coverage.degradedDirectRead) {
    // Degrade rather than fabricate: still resolve the focus branch from page
    // records on disk so PG/CHC/BR focus is honest, but emit no scene-layer
    // graph derived from a non-fresh coverage table.
    const pages = (await listPageRecords(worldSlug, storySlug, repoRoot)).map((entry) => entry.parsed);
    return {
      focus: { ...baseFocus, resolvedBranchId: resolveFocusBranch(options.focus, pages, []) },
      depth,
      branchIds: [],
      nodes: [],
      edges: [],
      indexStatus: coverage.worldIndexStatus,
      degradedDirectRead: true,
    };
  }

  const pages = (await listPageRecords(worldSlug, storySlug, repoRoot)).map((entry) => entry.parsed);
  const allBranchIds = [
    ...new Set([...pages.map(branchIdOf), ...coverage.branches.map((branch) => branch.branch_id)].filter(Boolean)),
  ].sort(compareId);

  const focusBranch = resolveFocusBranch(options.focus, pages, coverage.branches);
  if (focusBranch === null || !allBranchIds.includes(focusBranch)) {
    return {
      focus: baseFocus,
      depth,
      branchIds: [],
      nodes: [],
      edges: [],
      indexStatus: coverage.worldIndexStatus,
      degradedDirectRead: false,
    };
  }

  const { adjacency, forkPageOf } = buildForkTree(pages);
  const included = branchesWithinDepth(focusBranch, adjacency, depth);
  const includedBranchIds = allBranchIds.filter((branchId) => included.has(branchId));

  const perBranch = includedBranchIds.map((branchId) =>
    nodesForBranch(
      branchId,
      pages,
      coverage.branches.find((branch) => branch.branch_id === branchId),
      false,
    ),
  );

  const nodes: BranchMapNode[] = perBranch.flatMap((branch) => branch.nodes);
  const edges: BranchMapEdge[] = perBranch.flatMap((branch) => branch.edges);

  // Fork edges: a branch_split → the first node of each included child branch.
  const firstNodeByBranch = new Map(perBranch.map((branch) => [branch.branchId, branch.firstNodeId]));
  for (const branch of perBranch) {
    for (const [forkPage, splitId] of branch.splitNodeByPage) {
      for (const childBranchId of includedBranchIds) {
        if (forkPageOf.get(childBranchId) === forkPage && childBranchId !== branch.branchId) {
          const childFirst = firstNodeByBranch.get(childBranchId);
          if (childFirst != null) {
            edges.push({ from: splitId, to: childFirst, branchId: childBranchId, kind: "fork" });
          }
        }
      }
    }
  }

  const choiceFocusPageId = /^CHC-/.test(options.focus)
    ? pageId(pages.find((candidate) => emittedChoices(candidate).includes(options.focus)) ?? {})
    : null;
  const nodeId = focusedNodeId(options.focus, choiceFocusPageId === "" ? null : choiceFocusPageId, nodes);
  for (const node of nodes) {
    node.focused = node.id === nodeId;
  }

  return {
    focus: { requested: options.focus, resolvedBranchId: focusBranch, nodeId },
    depth,
    branchIds: includedBranchIds,
    nodes,
    edges,
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: false,
  };
}
