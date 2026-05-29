import { readFile } from "node:fs/promises";
import path from "node:path";

import { openExistingIndex } from "@worldloom/world-index/index/open";

import { resolveRepoRoot } from "../config/repo-root.js";
import { listPageRecords, parseRecordBody, recordClass, storyDirectory } from "./record-io.js";
import { readSceneCoverage, type SceneCoverageBranch, type SceneCoverageScene } from "./scene-coverage.js";
import type {
  SearchContainer,
  SearchDomain,
  SearchGroup,
  SearchHit,
  SearchResultKind,
  SearchResults,
} from "../view-models/search-hit.js";

export interface SearchReadOptions {
  kinds?: SearchResultKind[];
  domains?: SearchDomain[];
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 50;
const EXCERPT_RADIUS = 48;

type ParsedRecord = Record<string, unknown>;

interface NodeHit {
  nodeId: string;
  recordId: string;
  nodeType: string;
  headingPath: string | null;
  body: string;
  parsed: ParsedRecord;
}

interface PageInfo {
  pageId: string;
  branchId: string;
  activeRecordIds: string[];
  emittedChoices: string[];
  resolvedEventId: string | null;
  validationTrace: ParsedRecord;
}

function record(value: unknown): ParsedRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as ParsedRecord) : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function recordIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry : stringValue(record(entry).record_id) ?? stringValue(record(entry).id)))
    .filter((entry): entry is string => entry !== null);
}

function localRecordId(nodeId: string): string {
  const parts = nodeId.split(":");
  return parts[parts.length - 1] ?? nodeId;
}

// FTS5 phrase form — wrapping the user term in double quotes (escaping any
// embedded quotes) neutralizes FTS query operators so arbitrary user input is
// always a safe phrase match rather than a syntax error.
function ftsPhrase(q: string): string {
  return `"${q.replace(/"/g, '""')}"`;
}

function excerpt(body: string, q: string): string {
  const haystack = body.toLowerCase();
  const needle = q.toLowerCase();
  const at = haystack.indexOf(needle);
  if (at < 0) {
    return body.trim().slice(0, EXCERPT_RADIUS * 2).replace(/\s+/g, " ").trim();
  }
  const start = Math.max(0, at - EXCERPT_RADIUS);
  const end = Math.min(body.length, at + needle.length + EXCERPT_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < body.length ? "…" : "";
  return `${prefix}${body.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

const METADATA_FIELDS = ["id", "display_name", "surface_label", "title", "name", "label"];

function matchesMetadata(parsed: ParsedRecord, headingPath: string | null, q: string): boolean {
  const needle = q.toLowerCase();
  if (headingPath !== null && headingPath.toLowerCase().includes(needle)) {
    return true;
  }
  return METADATA_FIELDS.some((field) => stringValue(parsed[field])?.toLowerCase().includes(needle) ?? false);
}

function recordsHref(worldSlug: string, storySlug: string, recordId: string): string {
  return `/api/worlds/${worldSlug}/stories/${storySlug}/records/${recordId}/raw`;
}

function sceneArtifactHref(
  worldSlug: string,
  storySlug: string,
  sceneId: string,
  kind: "plan" | "prose" | "receipt",
): string {
  return `/api/worlds/${worldSlug}/stories/${storySlug}/scenes/${sceneId}/${kind}`;
}

class ContainerResolver {
  private readonly sceneByPage = new Map<string, { scene: SceneCoverageScene; branch: SceneCoverageBranch }>();
  private readonly runByPage = new Map<string, { branch: SceneCoverageBranch; index: number }>();
  private readonly sceneById = new Map<string, { scene: SceneCoverageScene; branch: SceneCoverageBranch }>();
  private readonly branchByPage = new Map<string, string>();

  constructor(branches: SceneCoverageBranch[]) {
    for (const branch of branches) {
      const active = new Set(branch.active_scene_ids);
      for (const scene of branch.scenes) {
        this.sceneById.set(scene.scene_id, { scene, branch });
        if (!active.has(scene.scene_id)) {
          continue;
        }
        for (const pgId of scene.pg_ids) {
          this.sceneByPage.set(pgId, { scene, branch });
          this.branchByPage.set(pgId, branch.branch_id);
        }
      }
      branch.unscened_runs.forEach((run, index) => {
        for (const pgId of run.pg_ids) {
          this.runByPage.set(pgId, { branch, index });
          this.branchByPage.set(pgId, branch.branch_id);
        }
      });
    }
  }

  branchOfPage(pageId: string): string | null {
    return this.branchByPage.get(pageId) ?? null;
  }

  sceneContainer(sceneId: string): SearchContainer | null {
    const entry = this.sceneById.get(sceneId);
    if (entry === undefined) {
      return null;
    }
    const { scene } = entry;
    return {
      kind: "scene",
      sceneId: scene.scene_id,
      branchId: scene.branch_id,
      startPg: scene.pg_ids[0] ?? null,
      endPg: scene.pg_ids.at(-1) ?? null,
      pageIds: scene.pg_ids,
      label: `${scene.scene_id} (${scene.pg_ids[0] ?? "?"}..${scene.pg_ids.at(-1) ?? "?"})`,
    };
  }

  // Resolve the scene / unscened-range / branch-level container for a page.
  pageContainer(pageId: string, branchHint?: string | null): SearchContainer {
    const scene = this.sceneByPage.get(pageId);
    if (scene !== undefined) {
      return this.sceneContainer(scene.scene.scene_id) as SearchContainer;
    }
    const run = this.runByPage.get(pageId);
    if (run !== undefined) {
      const range = run.branch.unscened_runs[run.index];
      if (range !== undefined) {
        return {
          kind: "unscened_range",
          branchId: run.branch.branch_id,
          startPg: range.start_pg,
          endPg: range.end_pg,
          pageIds: range.pg_ids,
          label: `unscened range ${range.start_pg}..${range.end_pg}`,
        };
      }
    }
    const branchId = this.branchByPage.get(pageId) ?? branchHint ?? null;
    return {
      kind: "branch_level",
      branchId,
      label: branchId === null ? "branch-level (orphan/technical)" : `branch ${branchId}`,
    };
  }
}

function branchLevelContainer(branchId: string | null): SearchContainer {
  return {
    kind: "branch_level",
    branchId,
    label: branchId === null ? "branch-level (orphan/technical)" : `branch ${branchId}`,
  };
}

function pageInfo(parsed: ParsedRecord): PageInfo {
  const activeRecords = record(record(parsed.state_snapshot).active_records);
  const activeRecordIds = Object.values(activeRecords).flatMap((value) => recordIdArray(value));
  return {
    pageId: stringValue(parsed.id) ?? "",
    branchId: stringValue(parsed.branch_id) ?? "",
    activeRecordIds,
    emittedChoices: stringArray(parsed.emitted_choices),
    resolvedEventId: stringValue(record(parsed.input).resolved_event_id),
    validationTrace: record(parsed.validation_trace),
  };
}

function validationTraceMatches(trace: ParsedRecord, q: string): boolean {
  const needle = q.toLowerCase();
  const checks = Array.isArray(trace.checks) ? trace.checks : [];
  return checks.some((check) => {
    const entry = record(check);
    return (
      (stringValue(entry.name)?.toLowerCase().includes(needle) ?? false) ||
      (stringValue(entry.verdict)?.toLowerCase().includes(needle) ?? false) ||
      (stringValue(entry.rationale)?.toLowerCase().includes(needle) ?? false)
    );
  });
}

function validationTraceExcerpt(trace: ParsedRecord, q: string): string {
  return excerpt(JSON.stringify(trace.checks ?? trace), q);
}

function kindAllowed(kind: SearchResultKind, kinds: SearchResultKind[] | undefined): boolean {
  return kinds === undefined || kinds.length === 0 || kinds.includes(kind);
}

function domainRequested(domain: SearchDomain, domains: SearchDomain[] | undefined): boolean {
  return domains === undefined || domains.length === 0 || domains.includes(domain);
}

function compareHits(left: SearchHit, right: SearchHit): number {
  const order = containerSortKey(left.container).localeCompare(containerSortKey(right.container), "en-US");
  if (order !== 0) {
    return order;
  }
  return (left.recordId ?? "").localeCompare(right.recordId ?? "", undefined, { numeric: true }) ||
    left.kind.localeCompare(right.kind, "en-US") ||
    left.domain.localeCompare(right.domain, "en-US");
}

function containerSortKey(container: SearchContainer): string {
  if (container.kind === "scene") {
    return `0:${container.branchId}:${container.sceneId}`;
  }
  if (container.kind === "unscened_range") {
    return `1:${container.branchId}:${container.startPg}`;
  }
  return `2:${container.branchId ?? ""}`;
}

function groupHits(hits: SearchHit[]): SearchGroup[] {
  const groups: SearchGroup[] = [];
  const byKey = new Map<string, SearchGroup>();
  for (const hit of hits) {
    const key = containerSortKey(hit.container);
    let group = byKey.get(key);
    if (group === undefined) {
      group = { container: hit.container, hits: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.hits.push(hit);
  }
  return groups;
}

function nodeHitToSearchHit(
  hit: NodeHit,
  q: string,
  resolver: ContainerResolver,
  pages: PageInfo[],
  worldSlug: string,
  storySlug: string,
): SearchHit | null {
  const domain: SearchDomain = matchesMetadata(hit.parsed, hit.headingPath, q) ? "metadata" : "state";
  const klass = recordClass(hit.recordId);
  const snippet = excerpt(hit.body, q);
  const recordsExpand = {
    recordId: hit.recordId,
    sceneId: null,
    artifactKind: null,
    href: recordsHref(worldSlug, storySlug, hit.recordId),
  };

  if (hit.nodeType === "scene_record" || klass === "SCN") {
    const container = resolver.sceneContainer(hit.recordId) ?? branchLevelContainer(stringValue(hit.parsed.branch_id));
    return {
      kind: "scene",
      domain,
      recordId: hit.recordId,
      title: hit.recordId,
      excerpt: snippet,
      container,
      expandable: { recordId: hit.recordId, sceneId: hit.recordId, artifactKind: null, href: recordsExpand.href },
    };
  }

  if (hit.nodeType === "story_event_record" || klass === "SE") {
    const page = pages.find((candidate) => candidate.resolvedEventId === hit.recordId);
    const container = page === undefined
      ? branchLevelContainer(null)
      : resolver.pageContainer(page.pageId, page.branchId);
    return { kind: "event", domain, recordId: hit.recordId, title: hit.recordId, excerpt: snippet, container, expandable: recordsExpand };
  }

  if (hit.nodeType === "choice_record" || klass === "CHC") {
    const page = pages.find((candidate) => candidate.emittedChoices.includes(hit.recordId));
    const container = page === undefined
      ? branchLevelContainer(null)
      : resolver.pageContainer(page.pageId, page.branchId);
    return { kind: "choice", domain, recordId: hit.recordId, title: hit.recordId, excerpt: snippet, container, expandable: recordsExpand };
  }

  if (hit.nodeType === "page_record" || klass === "PG") {
    const container = resolver.pageContainer(hit.recordId, stringValue(hit.parsed.branch_id));
    // PG hits inside an unscened run surface as the run; inside a scene (or
    // branch-level) they surface as the causal state tick (SPEC-92: PG = tick).
    const kind: SearchResultKind = container.kind === "unscened_range" ? "unscened_range" : "state_tick";
    return { kind, domain, recordId: hit.recordId, title: hit.recordId, excerpt: snippet, container, expandable: recordsExpand };
  }

  // Generic story-bundle record. Anchored to a live tick → raw_source (reports
  // its containing scene/tick, body expandable). Otherwise an orphan/technical
  // record hit grouped at branch-level.
  const activePages = pages.filter((page) => page.activeRecordIds.includes(hit.recordId));
  if (activePages.length > 0) {
    const scened = activePages.find((page) => resolver.pageContainer(page.pageId, page.branchId).kind === "scene");
    const anchor = scened ?? activePages[0];
    const container = anchor === undefined
      ? branchLevelContainer(null)
      : resolver.pageContainer(anchor.pageId, anchor.branchId);
    return { kind: "raw_source", domain, recordId: hit.recordId, title: hit.recordId, excerpt: snippet, container, expandable: recordsExpand };
  }

  return {
    kind: "record",
    domain,
    recordId: hit.recordId,
    title: hit.recordId,
    excerpt: snippet,
    container: branchLevelContainer(stringValue(hit.parsed.branch_id)),
    expandable: recordsExpand,
  };
}

async function artifactHits(
  branches: SceneCoverageBranch[],
  q: string,
  resolver: ContainerResolver,
  domains: SearchDomain[] | undefined,
  worldSlug: string,
  storySlug: string,
  repoRoot: string,
): Promise<SearchHit[]> {
  const needle = q.toLowerCase();
  const artifactKinds: Array<{ kind: "plan" | "prose" | "receipt"; domain: SearchDomain; result: SearchResultKind; dir: string; ext: string }> = [
    { kind: "plan", domain: "plan", result: "scene_plan", dir: "scene-prose-plans", ext: ".md" },
    { kind: "prose", domain: "prose", result: "scene_prose", dir: "scene-prose", ext: ".md" },
    { kind: "receipt", domain: "receipt", result: "scene_receipt", dir: "scene-prose-receipts", ext: ".yaml" },
  ];
  const base = storyDirectory(repoRoot, worldSlug, storySlug);
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const branch of branches) {
    const active = new Set(branch.active_scene_ids);
    for (const scene of branch.scenes) {
      const container = resolver.sceneContainer(scene.scene_id);
      if (container === null || !active.has(scene.scene_id)) {
        continue;
      }
      for (const artifact of artifactKinds) {
        if (!domainRequested(artifact.domain, domains)) {
          continue;
        }
        const present =
          (artifact.kind === "plan" && scene.artifact_availability.plan_present) ||
          (artifact.kind === "prose" && scene.artifact_availability.prose_present) ||
          (artifact.kind === "receipt" && scene.artifact_availability.receipt_present);
        if (!present) {
          continue;
        }
        const key = `${scene.scene_id}:${artifact.kind}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        let body: string;
        try {
          body = await readFile(path.join(base, artifact.dir, `${scene.scene_id}${artifact.ext}`), "utf8");
        } catch {
          continue;
        }
        if (!body.toLowerCase().includes(needle)) {
          continue;
        }
        hits.push({
          kind: artifact.result,
          domain: artifact.domain,
          recordId: scene.scene_id,
          title: `${scene.scene_id} ${artifact.kind}`,
          excerpt: excerpt(body, q),
          container,
          expandable: {
            recordId: null,
            sceneId: scene.scene_id,
            artifactKind: artifact.kind,
            href: sceneArtifactHref(worldSlug, storySlug, scene.scene_id, artifact.kind),
          },
        });
      }
    }
  }
  return hits;
}

export async function readSearch(
  worldSlug: string,
  storySlug: string,
  q: string,
  options: SearchReadOptions = {},
  repoRoot = resolveRepoRoot(),
): Promise<SearchResults> {
  const limit = options.limit !== undefined && options.limit > 0 ? options.limit : DEFAULT_LIMIT;
  const offset = options.offset ?? 0;
  const queryEcho = {
    q,
    kinds: options.kinds ?? [],
    domains: options.domains ?? [],
    groupBy: "scene_or_unscened_range" as const,
    limit,
    offset,
  };

  const coverage = readSceneCoverage({ worldSlug, storySlug }, repoRoot);
  if (coverage.degradedDirectRead) {
    return {
      query: queryEcho,
      groups: [],
      hits: [],
      total: 0,
      indexStatus: coverage.worldIndexStatus,
      degradedDirectRead: true,
    };
  }

  const resolver = new ContainerResolver(coverage.branches);
  const pages = (await listPageRecords(worldSlug, storySlug, repoRoot)).map((entry) => pageInfo(entry.parsed));
  const allHits: SearchHit[] = [];

  // FTS-backed hits over indexed nodes (state YAML + metadata/id domains).
  const wantFts = domainRequested("state", options.domains) || domainRequested("metadata", options.domains);
  if (wantFts) {
    const db = openExistingIndex(repoRoot, worldSlug);
    try {
      const rows = db
        .prepare(
          `
            SELECT n.node_id AS node_id, n.node_type AS node_type, n.heading_path AS heading_path, n.body AS body
            FROM fts_nodes f
            JOIN nodes n ON n.node_id = f.node_id
            WHERE f.fts_nodes MATCH ?
              AND n.world_slug = ?
              AND n.story_slug = ?
            ORDER BY n.node_id
          `,
        )
        .all(ftsPhrase(q), worldSlug, storySlug) as Array<{
        node_id: string;
        node_type: string;
        heading_path: string | null;
        body: string;
      }>;

      for (const row of rows) {
        const recordId = localRecordId(row.node_id);
        let parsed: ParsedRecord;
        try {
          parsed = parseRecordBody(row.body);
        } catch {
          parsed = {};
        }
        const hit = nodeHitToSearchHit(
          { nodeId: row.node_id, recordId, nodeType: row.node_type, headingPath: row.heading_path, body: row.body, parsed },
          q,
          resolver,
          pages,
          worldSlug,
          storySlug,
        );
        if (hit !== null && domainRequested(hit.domain, options.domains)) {
          allHits.push(hit);
        }
      }
    } finally {
      db.close();
    }
  }

  // Direct artifact text scan for prose / plan / receipt body-text domains
  // (these publication artifacts are NOT indexed into fts_nodes — SPEC-98 §8).
  allHits.push(
    ...(await artifactHits(coverage.branches, q, resolver, options.domains, worldSlug, storySlug, repoRoot)),
  );

  // Validation / freshness domain — page validation-trace matches.
  if (domainRequested("validation", options.domains)) {
    for (const page of pages) {
      if (validationTraceMatches(page.validationTrace, q)) {
        allHits.push({
          kind: "validation",
          domain: "validation",
          recordId: page.pageId,
          title: `${page.pageId} validation`,
          excerpt: validationTraceExcerpt(page.validationTrace, q),
          container: resolver.pageContainer(page.pageId, page.branchId),
          expandable: { recordId: page.pageId, sceneId: null, artifactKind: null, href: recordsHref(worldSlug, storySlug, page.pageId) },
        });
      }
    }
  }

  const filtered = allHits.filter((hit) => kindAllowed(hit.kind, options.kinds));
  filtered.sort(compareHits);
  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);

  return {
    query: queryEcho,
    groups: groupHits(sliced),
    hits: sliced,
    total,
    indexStatus: coverage.worldIndexStatus,
    degradedDirectRead: false,
  };
}
