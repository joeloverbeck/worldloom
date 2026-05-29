/*
SPEC-92 manual dry-run runbook

Purpose:
Exercise the LLM-owned scene-plan -> scene-prose-attach path that cannot be
fully invoked from node:test, while the automated tests below cover the
deterministic coexistence and no-state-mutation invariants.

1. Create a disposable fixture root outside the repository, then copy a story
   bundle with committed PG records into:
   <tmp>/worlds/<world_slug>/stories/<story_slug>/
2. In that temp root, invoke branching-story-scene-plan for one contiguous
   single-branch PG range. For the red-bunny sample used in SPEC-92 prose, the
   intended range is PG-5..PG-8 when that local private fixture is available.
3. Approve only after the skill reports: SCN id, pg_ids, branch id,
   previous_scene_id, factual scene_descriptor, factual boundary_rationale,
   end-page choice surface, zero FAIL validation, and exact write paths.
4. Render prose to scene-prose/SCN-<n>.md using the generated scene plan.
5. Invoke branching-story-scene-prose-attach against the temp copy. The expected
   writes are scene-prose/SCN-<n>.md, scene-prose-receipts/SCN-<n>.yaml, and any
   allowed direct-write INDEX update. PG and other _source state files must not
   change during scene attach.
6. Verify from the temp root:
   - diff -qr before-source-snapshot worlds/<world_slug>/stories/<story_slug>/_source
   - world-validate <world_slug> or package-local validators over the scene
     receipt/prose surfaces report no scene receipt FAIL verdicts.

Do not run this runbook against the real worlds/<slug>/ tree. It is deliberately
temp-root only.
*/

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import type { IndexedRecord } from "../../src/framework/types.js";
import { structuralValidators } from "../../src/public/registry.js";
import { sceneProseReceiptContent } from "../../src/structural/scene-prose-receipt-content.js";
import { sceneRangeIntegrity } from "../../src/structural/scene-range-integrity.js";
import { context, record } from "../structural/helpers.js";

const STORY = "red-bunny";
const WORLD = "capstone";
const SCENE_ID = "SCN-1";
const ROOT_MARKER = "__ROOT__";

test("SPEC-92 capstone keeps scene validators registered after SPEC-93 page-plan validator retirement", () => {
  const names = new Set(structuralValidators.map((validator) => validator.name));

  for (const validatorName of [
    "pg_se_turn_driver_consistency",
    "scene_prose_receipt_schema_compliance",
    "scene_prose_receipt_content",
    "scene_range_integrity",
    "scene_plan_structural",
    "scene_plan_verbatim_section_integrity",
    "scene_plan_body_engine_vocabulary_cleanliness",
    "scn_no_narrative_shape_language"
  ]) {
    assert.equal(names.has(validatorName), true, `${validatorName} should remain registered`);
  }
});

test("SPEC-92 capstone affected packages expose build and test scripts", () => {
  const repoRoot = path.resolve(process.cwd(), "../..");

  for (const packageDir of ["tools/patch-engine", "tools/world-index", "tools/world-mcp", "tools/validators"]) {
    const manifestPath = path.join(repoRoot, packageDir, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    assert.ok(manifest.scripts?.build, `${packageDir} should expose npm run build`);
    assert.ok(manifest.scripts?.test, `${packageDir} should expose npm test`);
  }
});

test("SPEC-92 capstone validates scene attach outputs without mutating PG or _source state", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "worldloom-spec92-capstone-"));

  try {
    seedStory(root);
    const before = snapshotTree(path.join(root, "worlds", WORLD, "stories", STORY, "_source"));
    const records = indexedRecords();

    const rangeVerdicts = await sceneRangeIntegrity.run(undefined, context(records, { world_slug: WORLD }));
    assert.deepEqual(rangeVerdicts, []);

    writeSceneAttachArtifacts(root);
    const receiptVerdicts = await sceneProseReceiptContent.run(
      {
        files: [
          {
            path: `stories/${STORY}/scene-prose-receipts/${SCENE_ID}.yaml`,
            content: readFileSync(
              path.join(root, "worlds", WORLD, "stories", STORY, "scene-prose-receipts", `${SCENE_ID}.yaml`),
              "utf8"
            )
          },
          {
            path: `stories/${STORY}/scene-prose/${SCENE_ID}.md`,
            content: readFileSync(
              path.join(root, "worlds", WORLD, "stories", STORY, "scene-prose", `${SCENE_ID}.md`),
              "utf8"
            )
          }
        ]
      },
      context(records, {
        run_mode: "incremental",
        world_slug: WORLD,
        touched_files: [
          `stories/${STORY}/scene-prose-receipts/${SCENE_ID}.yaml`,
          `stories/${STORY}/scene-prose/${SCENE_ID}.md`
        ]
      })
    );

    assert.deepEqual(receiptVerdicts, []);
    assert.deepEqual(snapshotTree(path.join(root, "worlds", WORLD, "stories", STORY, "_source")), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function seedStory(root: string): void {
  const storyRoot = path.join(root, "worlds", WORLD, "stories", STORY);
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  mkdirSync(path.join(storyRoot, "_source", "scenes"), { recursive: true });
  mkdirSync(path.join(storyRoot, "_source", "choices"), { recursive: true });

  for (const pageRecord of pages()) {
    writeYaml(path.join(storyRoot, pageRecord.file_path.replace(`stories/${STORY}/`, "")), pageRecord.parsed);
  }

  for (const sourceRecord of [scene(), choice()]) {
    writeYaml(path.join(storyRoot, sourceRecord.file_path.replace(`stories/${STORY}/`, "")), sourceRecord.parsed);
  }
}

function writeSceneAttachArtifacts(root: string): void {
  const storyRoot = path.join(root, "worlds", WORLD, "stories", STORY);
  mkdirSync(path.join(storyRoot, "scene-prose"), { recursive: true });
  mkdirSync(path.join(storyRoot, "scene-prose-receipts"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "scene-prose", `${SCENE_ID}.md`),
    "Mina settles on the bench and keeps the exchange quiet. The talk ends with a clear invitation to stay with Mina.\n",
    "utf8"
  );
  writeYaml(path.join(storyRoot, "scene-prose-receipts", `${SCENE_ID}.yaml`), receipt());
}

function indexedRecords(): IndexedRecord[] {
  return [scene(), ...pages(), choice()];
}

function scene(): IndexedRecord {
  return storyRecord("scene_record", SCENE_ID, `stories/${STORY}/_source/scenes/${SCENE_ID}.yaml`, {
    id: SCENE_ID,
    story_id: "STORY-1",
    branch_id: "BR-1",
    supersedes: null,
    pg_ids: ["PG-1", "PG-2"],
    start_page_id: "PG-1",
    end_page_id: "PG-2",
    previous_scene_id: null,
    choice_surface_page_id: "PG-2",
    emitted_choice_ids: ["CHC-1"],
    title: "Bench Talk",
    slug: "bench-talk",
    scene_descriptor: "Mina and the viewpoint character settle terms at the bench.",
    boundary_rationale: "The exchange remains continuous in location, cast, and immediate purpose.",
    prose_plan_path: `scene-prose-plans/${SCENE_ID}.md`,
    prose_path: `scene-prose/${SCENE_ID}.md`,
    receipt_path: `scene-prose-receipts/${SCENE_ID}.yaml`
  });
}

function pages(): IndexedRecord[] {
  return [
    page("PG-1", ["PG-1"], hash("1")),
    page("PG-2", ["PG-1", "PG-2"], hash("2"), { emitted_choices: ["CHC-1"] })
  ];
}

function page(
  id: string,
  branchPath: string[],
  stateHash: string,
  overrides: Record<string, unknown> = {}
): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: branchPath.length > 1 ? branchPath[branchPath.length - 2] : null,
    branch_path: branchPath,
    turn_index: branchPath.length - 1,
    state_hash: stateHash,
    emitted_choices: [],
    ...overrides
  });
}

function choice(): IndexedRecord {
  return storyRecord("choice_record", "CHC-1", `stories/${STORY}/_source/choices/CHC-1.yaml`, {
    id: "CHC-1",
    story_id: "STORY-1",
    created_at_page: "PG-2",
    surface_label: "Stay with Mina",
    player_visible_intent: "Keep talking on the bench"
  });
}

function receipt(): Record<string, unknown> {
  return {
    scene_id: SCENE_ID,
    story_id: "STORY-1",
    branch_id: "BR-1",
    plan_path: `scene-prose-plans/${SCENE_ID}.md`,
    prose_path: `scene-prose/${SCENE_ID}.md`,
    checked_at: "2026-05-28T12:00:00Z",
    strict: true,
    verdict: "PASS",
    included_pages: [
      { page_id: "PG-1", state_hash_at_attach: hash("1") },
      { page_id: "PG-2", state_hash_at_attach: hash("2") }
    ],
    checks: {
      included_pg_events_rendered: "PASS",
      final_scene_choice_surface_visibility: "PASS",
      scene_range_entity_status_consistency: "PASS",
      scene_range_invented_structural_fact: "PASS",
      scene_range_forbidden_mystery_resolution: "PASS",
      scene_prose_stchar_fidelity: "PASS",
      engine_jargon_leak: "PASS",
      canon_claim_without_authority: "PASS"
    }
  };
}

function storyRecord(
  nodeType: string,
  id: string,
  filePath: string,
  parsed: Record<string, unknown>
): IndexedRecord {
  return {
    ...record(nodeType, id, filePath, parsed),
    world_slug: WORLD,
    story_slug: STORY
  };
}

function writeYaml(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, yaml.dump(value), "utf8");
}

function snapshotTree(root: string): Record<string, string> {
  const snapshot: Record<string, string> = {};
  walk(root, snapshot, root);
  return snapshot;
}

function walk(currentPath: string, snapshot: Record<string, string>, root: string): void {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, snapshot, root);
    } else if (entry.isFile()) {
      snapshot[path.relative(root, entryPath) || ROOT_MARKER] = readFileSync(entryPath, "utf8");
    }
  }
}

function hash(suffix: string): string {
  return suffix.padStart(64, "0");
}
