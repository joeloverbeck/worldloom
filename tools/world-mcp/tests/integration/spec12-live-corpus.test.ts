import assert from "node:assert/strict";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import Database from "better-sqlite3";

import { findNamedEntities } from "../../src/tools/find-named-entities";
import { getContextPacket } from "../../src/tools/get-context-packet";
import { getNeighbors } from "../../src/tools/get-neighbors";
import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const WORLD_SLUG = "animalia";
const SOURCE_WORLD_ROOT = path.join(REPO_ROOT, "tests", "fixtures", WORLD_SLUG);
const WORLD_INDEX_BUILD_MODULE = path.join(
  process.cwd(),
  "node_modules",
  "@worldloom",
  "world-index",
  "dist",
  "src",
  "commands",
  "build.js"
);

function createLiveCorpusFixtureRoot(): string {
  const root = createTempRepoRoot();
  const targetWorldRoot = path.join(root, "worlds", WORLD_SLUG);
  cpSync(SOURCE_WORLD_ROOT, targetWorldRoot, { recursive: true });

  const copiedIndexPath = path.join(targetWorldRoot, "_index");
  if (existsSync(copiedIndexPath)) {
    rmSync(copiedIndexPath, { recursive: true, force: true });
  }

  return root;
}

async function rebuildAnimaliaFixture(root: string): Promise<void> {
  const { build } = await import(pathToFileURL(WORLD_INDEX_BUILD_MODULE).href);
  assert.equal(build(root, WORLD_SLUG), 0);
}

function openFixtureDb(root: string): Database.Database {
  return new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), {
    readonly: true
  });
}

test("SPEC-12 live corpus capstone proves the repaired animalia retrieval seam", async (t) => {
  const root = createLiveCorpusFixtureRoot();

  try {
    await rebuildAnimaliaFixture(root);

    await t.test("rebuilt fixture emits scoped-reference tables, nodes, and no Melissa frontmatter warning", () => {
      const db = openFixtureDb(root);

      try {
        const scopedCount = (
          db
            .prepare(
              `
                SELECT COUNT(*) AS count
                FROM scoped_references
                WHERE world_slug = ?
              `
            )
            .get(WORLD_SLUG) as { count: number }
        ).count;
        const scopedNodeCount = (
          db
            .prepare(
              `
                SELECT COUNT(*) AS count
                FROM nodes
                WHERE world_slug = ?
                  AND node_type = 'scoped_reference'
              `
            )
            .get(WORLD_SLUG) as { count: number }
        ).count;
        const malformedMelissaWarnings = (
          db
            .prepare(
              `
                SELECT COUNT(*) AS count
                FROM validation_results
                WHERE world_slug = ?
                  AND code = 'malformed_authority_source'
                  AND file_path = 'characters/melissa-threadscar.md'
              `
            )
            .get(WORLD_SLUG) as { count: number }
        ).count;

        assert.equal(scopedCount, 37);
        assert.equal(scopedNodeCount, 37);
        assert.equal(malformedMelissaWarnings, 0);
      } finally {
        db.close();
      }
    });

    await t.test("findNamedEntities resolves Melissa canonically and local anchors through scoped tiers", async () => {
      const result = await withRepoRoot(root, () =>
        findNamedEntities({
          world_slug: WORLD_SLUG,
          names: [
            "Melissa Threadscar",
            "Mudbrook",
            "Rill",
            "Aldous",
            "Bertram",
            "Copperplate",
            "Harrowgate",
            "Charter Hall of Harrowgate"
          ]
        })
      );

      assert.ok(!("code" in result));
      assert.equal(
        result.canonical_matches.some(
          (row) =>
            row.query === "Melissa Threadscar" &&
            row.match_kind === "alias" &&
            row.canonical_name === '"Threadscar" Melissa'
        ),
        true
      );

      const coveredQueries = new Set([
        ...result.canonical_matches.map((row) => row.query),
        ...result.scoped_matches.map((row) => row.query)
      ]);
      for (const query of [
        "Melissa Threadscar",
        "Mudbrook",
        "Rill",
        "Aldous",
        "Bertram",
        "Copperplate",
        "Harrowgate",
        "Charter Hall of Harrowgate"
      ]) {
        assert.equal(coveredQueries.has(query), true, `${query} should resolve through canonical or scoped tiers`);
      }
      assert.deepEqual(result.surface_matches, []);
    });

    await t.test("neighbors expose repaired scoped references and the resolved DA-0002 record link", async () => {
      const melissa = await withRepoRoot(root, () =>
        getNeighbors({ world_slug: WORLD_SLUG, node_id: "CHAR-0002", depth: 2 })
      );
      const artifact = await withRepoRoot(root, () =>
        getNeighbors({ world_slug: WORLD_SLUG, node_id: "DA-0002", depth: 2 })
      );

      assert.ok(!("code" in melissa));
      assert.ok(!("code" in artifact));
      assert.equal(
        melissa.hop1.some((row) => row.edge_types.includes("references_scoped_name")),
        true
      );
      assert.equal(
        artifact.hop1.some(
          (row) => row.node_id === "CHAR-0002" && row.edge_types.includes("references_record")
        ),
        true
      );
    });

    await t.test("context packets respect 8000 budget by dropping layers in priority order with truncation_summary", async () => {
      const melissa = await withRepoRoot(root, () =>
        getContextPacket({
          task_type: "character_generation",
          world_slug: WORLD_SLUG,
          seed_nodes: ["CHAR-0002"],
          token_budget: 8000
        })
      );

      assert.ok(!("code" in melissa));
      assert.equal(melissa.task_header.token_budget.requested, 8000);
      assert.ok(melissa.task_header.token_budget.allocated <= 8000);
      assert.ok(melissa.local_authority.nodes.some((node) => node.id === "CHAR-0002"));
      assert.ok(
        melissa.truncation_summary.dropped_layers.length > 0,
        "mature animalia world at budget=8000 should require at least one layer drop"
      );
      const PRIORITY_ORDER = [
        "impact_surfaces",
        "scoped_local_context",
        "exact_record_links",
        "governing_world_context"
      ];
      let priorityIndex = 0;
      for (const layer of melissa.truncation_summary.dropped_layers) {
        while (priorityIndex < PRIORITY_ORDER.length && PRIORITY_ORDER[priorityIndex] !== layer) {
          priorityIndex += 1;
        }
        assert.ok(
          priorityIndex < PRIORITY_ORDER.length,
          `dropped_layers must follow priority order; got ${JSON.stringify(melissa.truncation_summary.dropped_layers)}`
        );
        priorityIndex += 1;
      }
      for (const droppedLayer of melissa.truncation_summary.dropped_layers) {
        assert.ok(
          Array.isArray(melissa.truncation_summary.dropped_node_ids_by_layer[droppedLayer]),
          `dropped_node_ids_by_layer.${droppedLayer} must be present`
        );
      }

      const melissaWide = await withRepoRoot(root, () =>
        getContextPacket({
          task_type: "character_generation",
          world_slug: WORLD_SLUG,
          seed_nodes: ["CHAR-0002"],
          token_budget: 200000
        })
      );

      assert.ok(!("code" in melissaWide));
      assert.deepEqual(melissaWide.truncation_summary.dropped_layers, []);
      assert.ok(melissaWide.scoped_local_context.nodes.length > 0);
      assert.ok(
        melissaWide.governing_world_context.nodes.some(
          (node) => node.node_type === "mystery_reserve_entry" && node.record !== undefined
        )
      );

      const artifact = await withRepoRoot(root, () =>
        getContextPacket({
          task_type: "character_generation",
          world_slug: WORLD_SLUG,
          seed_nodes: ["DA-0002"],
          token_budget: 8000
        })
      );

      assert.ok(!("code" in artifact));
      assert.equal(artifact.task_header.token_budget.requested, 8000);
      assert.ok(artifact.task_header.token_budget.allocated <= 8000);
      assert.ok(artifact.local_authority.nodes.some((node) => node.id === "DA-0002"));

      const artifactWide = await withRepoRoot(root, () =>
        getContextPacket({
          task_type: "character_generation",
          world_slug: WORLD_SLUG,
          seed_nodes: ["DA-0002"],
          token_budget: 200000
        })
      );

      assert.ok(!("code" in artifactWide));
      assert.deepEqual(artifactWide.truncation_summary.dropped_layers, []);
      assert.ok(artifactWide.exact_record_links.nodes.some((node) => node.id === "CHAR-0002"));
      assert.ok(artifactWide.scoped_local_context.nodes.length > 0);
      assert.ok(
        artifactWide.governing_world_context.nodes.some(
          (node) => node.node_type === "invariant" && node.record !== undefined
        )
      );
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});
