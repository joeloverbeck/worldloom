import type Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

type PublicationIndicator = "planned" | "prose-present" | "attached:PASS" | "attached:WARN" | "attached:FAIL" | "superseded";

export interface SceneCoverageRefreshOptions {
  worldRoot: string;
  worldSlug: string;
}

export interface SceneCoverageQueryOptions {
  worldSlug: string;
  storySlug?: string;
  branchId?: string;
}

export interface SceneArtifactAvailability {
  plan_present: boolean;
  prose_present: boolean;
  receipt_present: boolean;
  receipt_verdict: "PASS" | "WARN" | "FAIL" | null;
}

export interface SceneCoverageScene {
  scene_id: string;
  branch_id: string;
  supersedes: string | null;
  superseded: boolean;
  pg_ids: string[];
  artifact_availability: SceneArtifactAvailability;
  publication_indicator: PublicationIndicator;
}

export interface UnscenedPgRun {
  start_pg: string;
  end_pg: string;
  pg_ids: string[];
}

export interface SceneCoverageBranch {
  world_slug: string;
  story_slug: string;
  branch_id: string;
  active_scene_ids: string[];
  superseded_scene_ids: string[];
  unscened_runs: UnscenedPgRun[];
  pg_scene_lookup: Record<string, string[]>;
  scenes: SceneCoverageScene[];
  refreshed_at: string;
}

interface NodeRecord {
  node_id: string;
  story_slug: string;
  body: string;
}

interface EdgeRecord {
  source_node_id: string;
  target_node_id: string | null;
  target_unresolved_ref: string | null;
}

interface FileVersionRecord {
  file_path: string;
}

interface BranchRecord {
  branchId: string;
  currentLeafPageId: string | null;
}

interface PageRecord {
  pageId: string;
  branchId: string | null;
  branchPath: string[];
}

interface SceneRecord {
  sceneId: string;
  storySlug: string;
  branchId: string;
  supersedes: string | null;
  pgIds: string[];
}

export function refreshSceneCoverage(
  db: Database.Database,
  options: SceneCoverageRefreshOptions
): void {
  const coverage = computeSceneCoverage(db, options);
  const refreshedAt = new Date().toISOString();

  db.transaction(() => {
    db.prepare("DELETE FROM scene_coverage WHERE world_slug = ?").run(options.worldSlug);

    const statement = db.prepare(`
      INSERT INTO scene_coverage (
        world_slug,
        story_slug,
        branch_id,
        active_scene_ids_json,
        superseded_scene_ids_json,
        unscened_ranges_json,
        pg_scene_lookup_json,
        scenes_json,
        refreshed_at
      ) VALUES (
        @world_slug,
        @story_slug,
        @branch_id,
        @active_scene_ids_json,
        @superseded_scene_ids_json,
        @unscened_ranges_json,
        @pg_scene_lookup_json,
        @scenes_json,
        @refreshed_at
      )
    `);

    for (const row of coverage) {
      statement.run({
        world_slug: row.world_slug,
        story_slug: row.story_slug,
        branch_id: row.branch_id,
        active_scene_ids_json: JSON.stringify(row.active_scene_ids),
        superseded_scene_ids_json: JSON.stringify(row.superseded_scene_ids),
        unscened_ranges_json: JSON.stringify(row.unscened_runs),
        pg_scene_lookup_json: JSON.stringify(row.pg_scene_lookup),
        scenes_json: JSON.stringify(row.scenes),
        refreshed_at: refreshedAt
      });
    }
  })();
}

export function querySceneCoverage(
  db: Database.Database,
  options: SceneCoverageQueryOptions
): SceneCoverageBranch[] {
  const clauses = ["world_slug = ?"];
  const params: string[] = [options.worldSlug];

  if (options.storySlug !== undefined) {
    clauses.push("story_slug = ?");
    params.push(options.storySlug);
  }

  if (options.branchId !== undefined) {
    clauses.push("branch_id = ?");
    params.push(options.branchId);
  }

  const rows = db
    .prepare(
      `
        SELECT
          world_slug,
          story_slug,
          branch_id,
          active_scene_ids_json,
          superseded_scene_ids_json,
          unscened_ranges_json,
          pg_scene_lookup_json,
          scenes_json,
          refreshed_at
        FROM scene_coverage
        WHERE ${clauses.join(" AND ")}
        ORDER BY story_slug, branch_id
      `
    )
    .all(...params) as Array<{
    world_slug: string;
    story_slug: string;
    branch_id: string;
    active_scene_ids_json: string;
    superseded_scene_ids_json: string;
    unscened_ranges_json: string;
    pg_scene_lookup_json: string;
    scenes_json: string;
    refreshed_at: string;
  }>;

  return rows.map((row) => ({
    world_slug: row.world_slug,
    story_slug: row.story_slug,
    branch_id: row.branch_id,
    active_scene_ids: parseJson<string[]>(row.active_scene_ids_json, []),
    superseded_scene_ids: parseJson<string[]>(row.superseded_scene_ids_json, []),
    unscened_runs: parseJson<UnscenedPgRun[]>(row.unscened_ranges_json, []),
    pg_scene_lookup: parseJson<Record<string, string[]>>(row.pg_scene_lookup_json, {}),
    scenes: parseJson<SceneCoverageScene[]>(row.scenes_json, []),
    refreshed_at: row.refreshed_at
  }));
}

function computeSceneCoverage(
  db: Database.Database,
  options: SceneCoverageRefreshOptions
): SceneCoverageBranch[] {
  const sceneNodes = loadNodes(db, options.worldSlug, "scene_record");
  const pageNodes = loadNodes(db, options.worldSlug, "page_record");
  const branchNodes = loadNodes(db, options.worldSlug, "branch_record");
  const scenePageEdges = loadSceneIncludesPageEdges(db, sceneNodes.map((node) => node.node_id));
  const fileVersions = new Set(loadFileVersions(db, options.worldSlug).map((row) => row.file_path));

  const pagesByStory = groupBy(pageNodes.map(parsePageNode), (page) => page.storySlug);
  const branchesByStory = groupBy(branchNodes.map(parseBranchNode), (branch) => branch.storySlug);
  const scenesByStory = groupBy(
    sceneNodes.map((node) => parseSceneNode(node, scenePageEdges)),
    (scene) => scene.storySlug
  );
  const storySlugs = new Set([
    ...pagesByStory.keys(),
    ...branchesByStory.keys(),
    ...scenesByStory.keys()
  ]);
  const rows: SceneCoverageBranch[] = [];

  for (const storySlug of [...storySlugs].sort((left, right) => left.localeCompare(right, "en-US"))) {
    const pages = pagesByStory.get(storySlug) ?? [];
    const branches = branchesByStory.get(storySlug) ?? [];
    const scenes = scenesByStory.get(storySlug) ?? [];
    const pagesById = new Map(pages.map((page) => [page.pageId, page]));
    const branchIds = new Set([
      ...branches.map((branch) => branch.branchId),
      ...pages.map((page) => page.branchId).filter((branchId): branchId is string => branchId !== null),
      ...scenes.map((scene) => scene.branchId)
    ]);
    const supersededSceneIds = findSupersededSceneIds(scenes);

    for (const branchId of [...branchIds].sort(compareRecordIds)) {
      const branch = branches.find((candidate) => candidate.branchId === branchId) ?? null;
      const branchPath = branchPathForBranch(branch, pagesById, pages, branchId);
      const branchScenes = scenes.filter((scene) => scene.branchId === branchId);
      const rowScenes = branchScenes
        .map((scene) =>
          buildSceneCoverageScene(options.worldRoot, options.worldSlug, storySlug, fileVersions, scene, supersededSceneIds)
        )
        .sort((left, right) => compareRecordIds(left.scene_id, right.scene_id));
      const activeScenes = rowScenes.filter((scene) => !scene.superseded);
      const supersededScenes = rowScenes.filter((scene) => scene.superseded);
      const pgSceneLookup = buildPgSceneLookup(activeScenes, branchPath);
      const unscenedRuns = buildUnscenedRuns(branchPath, pgSceneLookup);

      rows.push({
        world_slug: options.worldSlug,
        story_slug: storySlug,
        branch_id: branchId,
        active_scene_ids: activeScenes.map((scene) => scene.scene_id),
        superseded_scene_ids: supersededScenes.map((scene) => scene.scene_id),
        unscened_runs: unscenedRuns,
        pg_scene_lookup: pgSceneLookup,
        scenes: rowScenes,
        refreshed_at: ""
      });
    }
  }

  return rows;
}

function loadNodes(db: Database.Database, worldSlug: string, nodeType: string): NodeRecord[] {
  return db
    .prepare(
      `
        SELECT node_id, story_slug, body
        FROM nodes
        WHERE world_slug = ?
          AND node_type = ?
          AND story_slug IS NOT NULL
        ORDER BY story_slug, node_id
      `
    )
    .all(worldSlug, nodeType) as NodeRecord[];
}

function loadSceneIncludesPageEdges(
  db: Database.Database,
  sceneNodeIds: string[]
): Map<string, string[]> {
  if (sceneNodeIds.length === 0) {
    return new Map();
  }

  const placeholders = sceneNodeIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT source_node_id, target_node_id, target_unresolved_ref
        FROM edges
        WHERE edge_type = 'scene_includes_page'
          AND source_node_id IN (${placeholders})
        ORDER BY source_node_id, edge_id
      `
    )
    .all(...sceneNodeIds) as EdgeRecord[];
  const result = new Map<string, string[]>();

  for (const row of rows) {
    const target = row.target_node_id ?? row.target_unresolved_ref;
    if (target === null) {
      continue;
    }

    const pageId = localRecordId(target);
    const existing = result.get(row.source_node_id) ?? [];
    existing.push(pageId);
    result.set(row.source_node_id, existing);
  }

  return result;
}

function loadFileVersions(db: Database.Database, worldSlug: string): FileVersionRecord[] {
  return db
    .prepare(
      `
        SELECT file_path
        FROM file_versions
        WHERE world_slug = ?
      `
    )
    .all(worldSlug) as FileVersionRecord[];
}

function parseBranchNode(node: NodeRecord): BranchRecord & { storySlug: string } {
  const record = parseRecord(node.body);
  return {
    storySlug: node.story_slug,
    branchId: stringField(record, "id") ?? localRecordId(node.node_id),
    currentLeafPageId: stringField(record, "current_leaf_page_id")
  };
}

function parsePageNode(node: NodeRecord): PageRecord & { storySlug: string } {
  const record = parseRecord(node.body);
  return {
    storySlug: node.story_slug,
    pageId: stringField(record, "id") ?? localRecordId(node.node_id),
    branchId: stringField(record, "branch_id"),
    branchPath: stringArrayField(record, "branch_path")
  };
}

function parseSceneNode(
  node: NodeRecord,
  scenePageEdges: Map<string, string[]>
): SceneRecord {
  const record = parseRecord(node.body);
  return {
    sceneId: stringField(record, "id") ?? localRecordId(node.node_id),
    storySlug: node.story_slug,
    branchId: stringField(record, "branch_id") ?? "",
    supersedes: stringField(record, "supersedes"),
    pgIds: scenePageEdges.get(node.node_id) ?? stringArrayField(record, "pg_ids")
  };
}

function branchPathForBranch(
  branch: BranchRecord | null,
  pagesById: Map<string, PageRecord>,
  pages: PageRecord[],
  branchId: string
): string[] {
  if (branch?.currentLeafPageId) {
    const leaf = pagesById.get(branch.currentLeafPageId);
    if (leaf && leaf.branchPath.length > 0) {
      return leaf.branchPath;
    }
  }

  return pages
    .filter((page) => page.branchId === branchId)
    .map((page) => page.pageId)
    .sort(compareRecordIds);
}

function findSupersededSceneIds(scenes: SceneRecord[]): Set<string> {
  const sceneIds = new Set(scenes.map((scene) => scene.sceneId));
  const superseded = new Set<string>();

  for (const scene of scenes) {
    if (scene.supersedes !== null && sceneIds.has(scene.supersedes)) {
      superseded.add(scene.supersedes);
    }
  }

  return superseded;
}

function buildSceneCoverageScene(
  worldRoot: string,
  worldSlug: string,
  storySlug: string,
  fileVersions: Set<string>,
  scene: SceneRecord,
  supersededSceneIds: Set<string>
): SceneCoverageScene {
  const superseded = supersededSceneIds.has(scene.sceneId);
  const artifactAvailability = artifactAvailabilityForScene(
    worldRoot,
    worldSlug,
    storySlug,
    scene.sceneId,
    fileVersions
  );

  return {
    scene_id: scene.sceneId,
    branch_id: scene.branchId,
    supersedes: scene.supersedes,
    superseded,
    pg_ids: scene.pgIds,
    artifact_availability: artifactAvailability,
    publication_indicator: publicationIndicator(artifactAvailability, superseded)
  };
}

function artifactAvailabilityForScene(
  worldRoot: string,
  worldSlug: string,
  storySlug: string,
  sceneId: string,
  fileVersions: Set<string>
): SceneArtifactAvailability {
  const planPath = `stories/${storySlug}/scene-prose-plans/${sceneId}.md`;
  const prosePath = `stories/${storySlug}/scene-prose/${sceneId}.md`;
  const receiptPath = `stories/${storySlug}/scene-prose-receipts/${sceneId}.yaml`;
  const receiptPresent = fileVersions.has(receiptPath);

  return {
    plan_present: fileVersions.has(planPath),
    prose_present: fileVersions.has(prosePath),
    receipt_present: receiptPresent,
    receipt_verdict: receiptPresent ? receiptVerdict(worldRoot, worldSlug, receiptPath) : null
  };
}

function receiptVerdict(
  worldRoot: string,
  worldSlug: string,
  receiptPath: string
): "PASS" | "WARN" | "FAIL" | null {
  const absolutePath = path.join(worldRoot, "worlds", worldSlug, receiptPath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const parsed = parseRecord(readFileSync(absolutePath, "utf8"));
  const verdict = stringField(parsed, "verdict");
  if (verdict === "PASS" || verdict === "WARN" || verdict === "FAIL") {
    return verdict;
  }

  return null;
}

function publicationIndicator(
  artifacts: SceneArtifactAvailability,
  superseded: boolean
): PublicationIndicator {
  if (superseded) {
    return "superseded";
  }

  if (artifacts.receipt_verdict !== null) {
    return `attached:${artifacts.receipt_verdict}`;
  }

  if (artifacts.prose_present) {
    return "prose-present";
  }

  return "planned";
}

function buildPgSceneLookup(
  activeScenes: SceneCoverageScene[],
  branchPath: string[]
): Record<string, string[]> {
  const branchPageIds = new Set(branchPath);
  const lookup: Record<string, string[]> = {};

  for (const scene of activeScenes) {
    for (const pgId of scene.pg_ids) {
      if (!branchPageIds.has(pgId)) {
        continue;
      }

      lookup[pgId] = [...(lookup[pgId] ?? []), scene.scene_id].sort(compareRecordIds);
    }
  }

  return Object.fromEntries(Object.entries(lookup).sort(([left], [right]) => compareRecordIds(left, right)));
}

function buildUnscenedRuns(
  branchPath: string[],
  pgSceneLookup: Record<string, string[]>
): UnscenedPgRun[] {
  const runs: UnscenedPgRun[] = [];
  let currentRun: string[] = [];

  for (const pgId of branchPath) {
    if ((pgSceneLookup[pgId] ?? []).length > 0) {
      if (currentRun.length > 0) {
        runs.push(runFromPages(currentRun));
        currentRun = [];
      }
      continue;
    }

    currentRun.push(pgId);
  }

  if (currentRun.length > 0) {
    runs.push(runFromPages(currentRun));
  }

  return runs;
}

function runFromPages(pgIds: string[]): UnscenedPgRun {
  const start = pgIds[0];
  const end = pgIds[pgIds.length - 1];
  if (start === undefined || end === undefined) {
    throw new Error("Cannot create unscened run from an empty page list.");
  }

  return {
    start_pg: start,
    end_pg: end,
    pg_ids: pgIds
  };
}

function localRecordId(nodeId: string): string {
  const parts = nodeId.split(":");
  return parts[parts.length - 1] ?? nodeId;
}

function parseRecord(source: string): Record<string, unknown> {
  try {
    const parsed = parseYaml(source);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function groupBy<T>(values: T[], keyForValue: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const value of values) {
    const key = keyForValue(value);
    const existing = grouped.get(key) ?? [];
    existing.push(value);
    grouped.set(key, existing);
  }

  return grouped;
}

function parseJson<T>(source: string, fallback: T): T {
  try {
    return JSON.parse(source) as T;
  } catch {
    return fallback;
  }
}

function compareRecordIds(left: string, right: string): number {
  const leftMatch = /^(.*?)(\d+)$/.exec(left);
  const rightMatch = /^(.*?)(\d+)$/.exec(right);
  if (leftMatch && rightMatch && leftMatch[1] === rightMatch[1]) {
    return Number(leftMatch[2]) - Number(rightMatch[2]);
  }

  return left.localeCompare(right, "en-US");
}
