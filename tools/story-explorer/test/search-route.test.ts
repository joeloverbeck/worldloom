import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";
import type { SearchHit, SearchResults } from "../src/view-models/search-hit.js";

const WORLD = "fixture-world";
const STORY = "red-bunny";

interface SearchFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createFixture(): SearchFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-search-"));
  const storyRoot = path.join(repoRoot, "worlds", WORLD, "stories", STORY);
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "choices", "events", "entities", "beliefs", "scenes"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  for (const subdir of ["scene-prose-plans", "scene-prose", "scene-prose-receipts"]) {
    mkdirSync(path.join(storyRoot, subdir), { recursive: true });
  }
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  return { repoRoot, storyRoot, db: openIndex(repoRoot, WORLD) };
}

function insertNode(fixture: SearchFixture, recordId: string, sourceDir: string, nodeType: string, body: Record<string, unknown>): void {
  const serialized = YAML.stringify(body);
  const filePath = `stories/${STORY}/_source/${sourceDir}/${recordId}.yaml`;
  writeFileSync(path.join(fixture.storyRoot, "_source", sourceDir, `${recordId}.yaml`), serialized, "utf8");
  fixture.db
    .prepare(
      `
        INSERT INTO nodes (
          node_id, world_slug, file_path, heading_path, byte_start, byte_end,
          line_start, line_end, node_type, body, content_hash, anchor_checksum,
          summary, created_at_index_version, story_slug
        ) VALUES (?, '${WORLD}', ?, NULL, 0, 0, 1, 1, ?, ?, 'hash', 'anchor', NULL, 1, '${STORY}')
      `,
    )
    .run(`${STORY}:${recordId}`, filePath, nodeType, serialized);
  fixture.db
    .prepare(
      `INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at) VALUES ('${WORLD}', ?, 'hash', '2026-05-29T00:00:00.000Z')`,
    )
    .run(filePath);
}

function insertCoverage(db: Database.Database, branchId: string, row: Record<string, unknown>): void {
  db.prepare(
    `
      INSERT INTO scene_coverage (
        world_slug, story_slug, branch_id, active_scene_ids_json, superseded_scene_ids_json,
        unscened_ranges_json, pg_scene_lookup_json, scenes_json, refreshed_at
      ) VALUES ('${WORLD}', '${STORY}', ?, ?, ?, ?, ?, ?, '2026-05-29T00:00:00.000Z')
    `,
  ).run(
    branchId,
    JSON.stringify(row.active_scene_ids ?? []),
    JSON.stringify(row.superseded_scene_ids ?? []),
    JSON.stringify(row.unscened_ranges ?? []),
    JSON.stringify(row.pg_scene_lookup ?? {}),
    JSON.stringify(row.scenes ?? []),
  );
}

function pageBody(id: string, extra: Record<string, unknown>): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: null,
    branch_path: [id],
    turn_index: 0,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
    state_snapshot: { active_records: {}, continuation: { terminal_status: "open" } },
    emitted_choices: [],
    validation_trace: {},
    ...extra,
  };
}

// A fully-stocked story bundle that lets a targeted query exercise each of the
// eleven SPEC-98 result kinds and every search domain.
function seedRichFixture(): string {
  const fixture = createFixture();

  insertNode(fixture, "PG-1", "pages", "page_record", pageBody("PG-1", {}));
  insertNode(
    fixture,
    "PG-2",
    "pages",
    "page_record",
    pageBody("PG-2", {
      branch_path: ["PG-1", "PG-2"],
      turn_index: 1,
      input: { choice_id: null, manual_action_text: null, resolved_event_id: "SE-2" },
      state_snapshot: { active_records: { BEL: ["BEL-1"] }, continuation: { terminal_status: "open" }, marker: "ticktoken here" },
      validation_trace: { checks: [{ name: "boundary", verdict: "PASS", rationale: "validtoken rationale" }] },
    }),
  );
  insertNode(
    fixture,
    "PG-3",
    "pages",
    "page_record",
    pageBody("PG-3", {
      branch_path: ["PG-1", "PG-2", "PG-3"],
      turn_index: 2,
      emitted_choices: ["CHC-1"],
      state_snapshot: { active_records: {}, continuation: { terminal_status: "open" }, marker: "rangetoken here" },
    }),
  );
  insertNode(fixture, "SCN-1", "scenes", "scene_record", {
    id: "SCN-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    pg_ids: ["PG-1", "PG-2"],
    summary: "scenetoken summary line",
  });
  insertNode(fixture, "SE-2", "events", "story_event_record", {
    id: "SE-2",
    state_delta: { create: ["BEL-1"], supersede: [], close: [] },
    resolution: { player_visible_feedback: "eventtoken happens" },
  });
  insertNode(fixture, "CHC-1", "choices", "choice_record", {
    id: "CHC-1",
    surface_label: "choicetoken option",
    player_visible_intent: "Investigate",
    likely_state_pressure: [],
    grounded_in: [],
  });
  insertNode(fixture, "BEL-1", "beliefs", "belief_record", {
    id: "BEL-1",
    statement: "the sourcetoken belief held quietly",
  });
  insertNode(fixture, "STENT-9", "entities", "story_entity_record", {
    id: "STENT-9",
    display_name: "recordtoken entity",
  });

  insertCoverage(fixture.db, "BR-1", {
    active_scene_ids: ["SCN-1"],
    unscened_ranges: [{ start_pg: "PG-3", end_pg: "PG-3", pg_ids: ["PG-3"] }],
    pg_scene_lookup: { "PG-1": ["SCN-1"], "PG-2": ["SCN-1"], "PG-3": [] },
    scenes: [
      {
        scene_id: "SCN-1",
        branch_id: "BR-1",
        supersedes: null,
        superseded: false,
        pg_ids: ["PG-1", "PG-2"],
        artifact_availability: { plan_present: true, prose_present: true, receipt_present: true, receipt_verdict: "PASS" },
        publication_indicator: "attached:PASS",
      },
    ],
  });
  fixture.db.close();

  writeFileSync(path.join(fixture.storyRoot, "scene-prose-plans", "SCN-1.md"), "Plan body with plantoken inside.\n", "utf8");
  writeFileSync(path.join(fixture.storyRoot, "scene-prose", "SCN-1.md"), "Rendered prose with prosetoken inside.\n", "utf8");
  writeFileSync(
    path.join(fixture.storyRoot, "scene-prose-receipts", "SCN-1.yaml"),
    YAML.stringify({ verdict: "PASS", note: "receipttoken note" }),
    "utf8",
  );

  return fixture.repoRoot;
}

// Pages with coverage but NO active scenes — only unscened runs.
function seedNoSceneFixture(): string {
  const fixture = createFixture();
  insertNode(fixture, "PG-1", "pages", "page_record", pageBody("PG-1", { state_snapshot: { active_records: {}, continuation: { terminal_status: "open" }, marker: "lonelytoken here" } }));
  insertNode(fixture, "PG-2", "pages", "page_record", pageBody("PG-2", { branch_path: ["PG-1", "PG-2"], turn_index: 1, state_snapshot: { active_records: {}, continuation: { terminal_status: "open" }, marker: "lonelytoken too" } }));
  insertCoverage(fixture.db, "BR-1", {
    active_scene_ids: [],
    unscened_ranges: [{ start_pg: "PG-1", end_pg: "PG-2", pg_ids: ["PG-1", "PG-2"] }],
    pg_scene_lookup: { "PG-1": [], "PG-2": [] },
    scenes: [],
  });
  fixture.db.close();
  return fixture.repoRoot;
}

function seedMissingIndexFixture(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-search-missing-"));
  const storyRoot = path.join(repoRoot, "worlds", WORLD, "stories", STORY);
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(path.join(storyRoot, "STORY_KERNEL.md"), ["---", "story_id: STORY-1", "---", ""].join("\n"), "utf8");
  return repoRoot;
}

async function runSearch(repoRoot: string, querySuffix: string): Promise<{ status: number; envelopeKind: string | null; data: SearchResults }> {
  const server = await createServer({ repoRoot });
  try {
    const response = await server.inject({ method: "GET", url: `/api/worlds/${WORLD}/stories/${STORY}/search?${querySuffix}` });
    const parsed = JSON.parse(response.body) as { _envelope?: { worldIndexStatus?: { kind?: string } }; data: SearchResults };
    return { status: response.statusCode, envelopeKind: parsed._envelope?.worldIndexStatus?.kind ?? null, data: parsed.data };
  } finally {
    await server.close();
  }
}

test("search returns each result kind, container-grouped, for its targeted query", async () => {
  const repoRoot = seedRichFixture();
  const cases: Array<{ q: string; kind: string }> = [
    { q: "scenetoken", kind: "scene" },
    { q: "prosetoken", kind: "scene_prose" },
    { q: "plantoken", kind: "scene_plan" },
    { q: "receipttoken", kind: "scene_receipt" },
    { q: "rangetoken", kind: "unscened_range" },
    { q: "ticktoken", kind: "state_tick" },
    { q: "eventtoken", kind: "event" },
    { q: "choicetoken", kind: "choice" },
    { q: "recordtoken", kind: "record" },
    { q: "validtoken", kind: "validation" },
    { q: "sourcetoken", kind: "raw_source" },
  ];

  for (const { q, kind } of cases) {
    const { status, data } = await runSearch(repoRoot, `q=${q}&kinds=${kind}`);
    assert.equal(status, 200, `query ${q}`);
    assert.equal(data.degradedDirectRead, false, `query ${q}`);
    assert.ok(data.hits.length >= 1, `query ${q} should return at least one ${kind} hit`);
    assert.ok(data.hits.every((hit) => hit.kind === kind), `query ${q} should only return ${kind} hits`);
    // Every hit is rolled up into a container group (the top-level shape).
    assert.equal(data.groups.reduce((sum, group) => sum + group.hits.length, 0), data.hits.length, `query ${q} grouping`);
    for (const group of data.groups) {
      assert.ok(["scene", "unscened_range", "branch_level"].includes(group.container.kind), `query ${q} container kind`);
    }
  }
});

test("search exposes every domain via its targeted query", async () => {
  const repoRoot = seedRichFixture();
  const cases: Array<{ q: string; domain: string }> = [
    { q: "prosetoken", domain: "prose" },
    { q: "plantoken", domain: "plan" },
    { q: "receipttoken", domain: "receipt" },
    { q: "ticktoken", domain: "state" },
    { q: "recordtoken", domain: "metadata" },
    { q: "validtoken", domain: "validation" },
  ];
  for (const { q, domain } of cases) {
    const { data } = await runSearch(repoRoot, `q=${q}&domains=${domain}`);
    assert.ok(data.hits.length >= 1, `domain ${domain} via ${q}`);
    assert.ok(data.hits.every((hit) => hit.domain === domain), `query ${q} should only return ${domain} domain hits`);
  }
});

test("search rolls a state-tick hit up to its containing scene", async () => {
  const { data } = await runSearch(seedRichFixture(), "q=ticktoken");
  const tick = data.hits.find((hit) => hit.kind === "state_tick");
  assert.ok(tick, "expected a state_tick hit");
  assert.equal(tick.container.kind, "scene");
  assert.equal(tick.container.kind === "scene" ? tick.container.sceneId : null, "SCN-1");
});

test("search reports a raw_source hit's container and keeps the body expandable, not dumped", async () => {
  const { data } = await runSearch(seedRichFixture(), "q=sourcetoken&kinds=raw_source");
  const hit = data.hits.find((entry) => entry.kind === "raw_source") as SearchHit | undefined;
  assert.ok(hit, "expected a raw_source hit");
  // Container reported (record active at PG-2, inside SCN-1).
  assert.equal(hit.container.kind, "scene");
  assert.match(hit.container.label, /SCN-1/);
  // Raw body is NOT dumped at the top level; only a short excerpt + an expand ref.
  assert.equal("body" in hit, false);
  assert.ok(hit.excerpt.length <= 200);
  assert.equal(hit.expandable.recordId, "BEL-1");
  assert.match(hit.expandable.href, /\/records\/BEL-1\/raw$/);
});

test("search degrades to unscened/branch grouping when no scene exists", async () => {
  const { status, data } = await runSearch(seedNoSceneFixture(), "q=lonelytoken");
  assert.equal(status, 200);
  assert.equal(data.degradedDirectRead, false);
  assert.ok(data.hits.length >= 1, "expected unscened hits");
  assert.ok(data.groups.every((group) => group.container.kind !== "scene"), "no scene container when no scene exists");
  assert.ok(data.groups.some((group) => group.container.kind === "unscened_range"));
});

test("search does not fabricate hits under a missing index", async () => {
  const { status, envelopeKind, data } = await runSearch(seedMissingIndexFixture(), "q=anything");
  assert.equal(status, 200);
  assert.equal(envelopeKind, "missing");
  assert.equal(data.indexStatus.kind, "missing");
  assert.equal(data.degradedDirectRead, true);
  assert.deepEqual(data.hits, []);
  assert.deepEqual(data.groups, []);
  assert.equal(data.total, 0);
});

test("search validates query parameters", async () => {
  const repoRoot = seedRichFixture();

  const missingQ = await runSearch(repoRoot, "kinds=scene");
  assert.equal(missingQ.status, 400);

  const badLimit = await runSearch(repoRoot, "q=x&limit=bad");
  assert.equal(badLimit.status, 400);

  const badKind = await runSearch(repoRoot, "q=x&kinds=not_a_kind");
  assert.equal(badKind.status, 400);

  const badDomain = await runSearch(repoRoot, "q=x&domains=not_a_domain");
  assert.equal(badDomain.status, 400);

  const badGroupBy = await runSearch(repoRoot, "q=x&groupBy=page");
  assert.equal(badGroupBy.status, 400);
});

test("search rejects path params that are not plain slugs (no path traversal)", async () => {
  const server = await createServer({ repoRoot: seedRichFixture() });
  try {
    // `..`-style traversal is collapsed by the router (404) before the handler;
    // other non-slug params are rejected by the handler (400). Neither ever
    // returns 200 or reaches a file read outside worlds/.
    for (const url of [
      "/api/worlds/%2e%2e/stories/red-bunny/search?q=x",
      "/api/worlds/fixture-world/stories/%2e%2e%2f%2e%2e/search?q=x",
    ]) {
      const response = await server.inject({ method: "GET", url });
      assert.ok(response.statusCode === 400 || response.statusCode === 404, `${url} → ${response.statusCode}`);
    }

    // An invalid (non-slug) world reaches the handler and is rejected 400.
    const response = await server.inject({ method: "GET", url: "/api/worlds/Fixture_World/stories/red-bunny/search?q=x" });
    const body = JSON.parse(response.body) as { data?: { error?: string; field?: string } };
    assert.equal(response.statusCode, 400);
    assert.equal(body.data?.error, "invalid_input");
    assert.equal(body.data?.field, "slug");
  } finally {
    await server.close();
  }
});
