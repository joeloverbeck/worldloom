import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import { build } from "@worldloom/world-index/commands/build";
import { PREDICATE_REFERENCED_CLASSES } from "@worldloom/world-index/public/predicate-dsl-projection";
import YAML from "yaml";

import { selectStoryletCandidates } from "../../src/tools/select-storylet-candidates.js";
import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";

const WORLD = "stselect003-production-shape-world";
const STORY = "production-shape-existential-pool";
const ALL_PREDICATE_NAMES = Object.keys(PREDICATE_REFERENCED_CLASSES);
const SORTED_PREDICATE_NAMES = [...ALL_PREDICATE_NAMES].sort((left, right) =>
  left.localeCompare(right, "en-US")
);
const EXISTENTIAL_PREDICATE_NAMES = ALL_PREDICATE_NAMES.filter((name) => name.startsWith("any_"));
const EXPECTED_REFERENCED_CLASSES = [
  ...new Set(Object.values(PREDICATE_REFERENCED_CLASSES).flat())
].sort((left, right) => left.localeCompare(right, "en-US"));

interface PredicateRecord {
  pred: string;
  predicate?: PredicateRecord;
  predicates?: PredicateRecord[];
}

interface StoryletFixture {
  id: string;
  predicates: PredicateRecord[];
  urgency: "high" | "medium" | "low";
  cooldownPages: number;
  moveFamily: string;
}

function writeYaml(root: string, filePath: string, value: Record<string, unknown>): void {
  const absolutePath = path.join(root, "worlds", WORLD, filePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, YAML.stringify(value), "utf8");
}

function writeWorldFile(root: string, filePath: string, content: string): void {
  const absolutePath = path.join(root, "worlds", WORLD, filePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function storyPath(subdir: string, id: string): string {
  return `stories/${STORY}/_source/${subdir}/${id}.yaml`;
}

function predicateForName(name: string): PredicateRecord {
  if (name === "not") {
    return {
      pred: "not",
      predicate: { pred: "any_belief" }
    };
  }
  if (name === "all") {
    return {
      pred: "all",
      predicates: [{ pred: "any_thread_active" }, { pred: "any_emotion_active" }]
    };
  }
  if (name === "any") {
    return {
      pred: "any",
      predicates: [{ pred: "any_story_question_open" }, { pred: "any_intention" }]
    };
  }
  return { pred: name };
}

function fixtureStorylets(): StoryletFixture[] {
  return Array.from({ length: 42 }, (_, index): StoryletFixture => {
    const ordinal = index + 1;
    const id = `SLT-${ordinal}`;
    const predicates: PredicateRecord[] = [predicateForName(ALL_PREDICATE_NAMES[index]!)];

    if (index < 33) {
      predicates.unshift(predicateForName(EXISTENTIAL_PREDICATE_NAMES[index % EXISTENTIAL_PREDICATE_NAMES.length]!));
    }

    if (id === "SLT-42") {
      predicates.unshift(
        { pred: "any_story_question_open" },
        { pred: "any_intention" },
        { pred: "any_emotion_active" }
      );
    }

    return {
      id,
      predicates,
      urgency: ordinal % 3 === 0 ? "low" : ordinal % 2 === 0 ? "medium" : "high",
      cooldownPages: [35, 36, 39, 40, 41].includes(ordinal) ? 2 : 0,
      moveFamily: ["communicate", "bond", "negotiate", "reveal"][ordinal % 4]!
    };
  });
}

function predicateNamesIn(predicate: PredicateRecord): string[] {
  return [
    predicate.pred,
    ...(predicate.predicate === undefined ? [] : predicateNamesIn(predicate.predicate)),
    ...(predicate.predicates ?? []).flatMap(predicateNamesIn)
  ];
}

function representedPredicateNames(storylets: StoryletFixture[]): string[] {
  return [
    ...new Set(storylets.flatMap((storylet) => storylet.predicates.flatMap(predicateNamesIn)))
  ].sort((left, right) => left.localeCompare(right, "en-US"));
}

function storyletRecord(storylet: StoryletFixture): Record<string, unknown> {
  return {
    record_kind: "storylet_record",
    id: storylet.id,
    title: `Production-shape candidate ${storylet.id}`,
    move_family: storylet.moveFamily,
    scope: {
      visibility: "global_author_pool"
    },
    preconditions: {
      hard: storylet.predicates
    },
    beats: [
      {
        beat_id: "setup",
        function: "setup",
        instruction: `Use ${storylet.id} as a generated STSELECT-003 predicate-pool candidate.`
      }
    ],
    exit_options: [
      {
        action_family: storylet.moveFamily,
        surface_hint: `${storylet.moveFamily} from the production-shape candidate pool.`
      }
    ],
    saliency: {
      urgency: storylet.urgency,
      cooldown_pages: storylet.cooldownPages
    },
    mystery_policy: {
      allowed_authority: "none"
    },
    provenance: {
      origin: "synthetic_fixture"
    },
    grounding: {
      compatible_turn_drivers: ["npc_action"],
      reason_to_exist: "STSELECT-003 production-shape existential predicate pool fixture."
    }
  };
}

function materializeProductionShapeWorld(root: string): StoryletFixture[] {
  const storylets = fixtureStorylets();

  writeWorldFile(
    root,
    "WORLD_KERNEL.md",
    [
      "# STSELECT-003 Fixture World",
      "",
      "## Genre Contract",
      "Synthetic package-test world for storylet selector integration coverage.",
      ""
    ].join("\n")
  );
  writeWorldFile(
    root,
    "ONTOLOGY.md",
    [
      "# Ontology",
      "",
      "## Categories in Use",
      "",
      "- story_test_fixture",
      "",
      "## Relation Types in Use",
      "",
      "- fixture_only",
      "",
      "## Notes on Use",
      "",
      "This root file exists only so world-index build sees a valid atomic-world fixture.",
      ""
    ].join("\n")
  );

  writeYaml(root, "_source/canon/CF-303.yaml", {
    record_kind: "canon_fact",
    id: "CF-303",
    title: "STSELECT-003 Fixture World",
    status: "hard_canon",
    type: "story_test_fixture",
    statement: "STSELECT-003 fixture worlds support production-shape storylet selection tests.",
    scope: { geographic: "local", temporal: "current", social: "public" },
    truth_scope: { world_level: true, diegetic_status: "objective" },
    domains_affected: ["story_bundles"],
    required_world_updates: ["STSELECT-003 fixture only"],
    source_basis: { direct_user_approval: true },
    contradiction_risk: { hard: false, soft: false },
    notes: "Minimal canon fact used only by the STSELECT-003 indexer-to-selector fixture."
  });

  for (const pageId of ["PG-1", "PG-5", "PG-6"]) {
    writeYaml(root, storyPath("pages", pageId), {
      record_kind: "page_record",
      id: pageId,
      story_id: "STORY-303",
      branch_id: "BR-1",
      parent_page_id: pageId === "PG-1" ? null : "PG-1",
      branch_path: pageId === "PG-6" ? ["PG-1", "PG-5", "PG-6"] : ["PG-1", pageId],
      turn_index: pageId === "PG-6" ? 2 : pageId === "PG-5" ? 1 : 0,
      input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
      state_hash_parent: null,
      state_hash: `${pageId}-fixture-state-hash`.padEnd(64, "0").slice(0, 64),
      state_snapshot: {
        active_records: {
          BEL: ["BEL-1"],
          CLK: ["CLK-1"],
          CNSQ: ["CNSQ-1"],
          OBL: ["OBL-1"],
          SREL: ["SREL-1"],
          STCHAR: ["STCHAR-1"],
          STENT: ["STENT-1"],
          STEMO: ["STEMO-1"],
          STINT: ["STINT-1"],
          STLOC: ["STLOC-1"],
          STOBJ: ["STOBJ-1"],
          STPLAN: ["STPLAN-1"],
          STQ: ["STQ-1"],
          STSEC: ["STSEC-1"],
          STSTAT: ["STSTAT-1"],
          THR: ["THR-1"]
        },
        unresolved_mystery_claims: []
      },
      plan: { plan_hash: `${pageId}-fixture-plan-hash`.padEnd(64, "1").slice(0, 64) },
      prose_plan_path: `pages-prose-plans/${pageId}.md`,
      emitted_choices: [],
      validation_trace: {
        fixture_scope: "PASS: STSELECT-003 fixture page carries production-shape active classes."
      }
    });
  }

  writeYaml(root, storyPath("events", "SE-1"), {
    record_kind: "story_event_record",
    id: "SE-1",
    story_id: "STORY-303",
    created_at_page: "PG-5",
    event_type: "turn_resolution",
    event_summary: "Cooldown fixture event selected SLT-35 on the prior page.",
    commitment: {
      selected_slt_id: "SLT-35"
    }
  });

  for (const storylet of storylets) {
    writeYaml(root, storyPath("storylets", storylet.id), storyletRecord(storylet));
  }

  return storylets;
}

async function withProductionShapeWorld<T>(
  run: (root: string, storylets: StoryletFixture[]) => Promise<T>
): Promise<T> {
  const root = createTempRepoRoot();

  try {
    const storylets = materializeProductionShapeWorld(root);
    assert.equal(build(root, WORLD, { quiet: true }), 0);
    return await run(root, storylets);
  } finally {
    destroyTempRepoRoot(root);
  }
}

function indexedPredicateClasses(root: string): string[] {
  const db = new Database(path.join(root, "worlds", WORLD, "_index", "world.db"), { readonly: true });
  try {
    const rows = db
      .prepare(
        `
          SELECT DISTINCT target_unresolved_ref AS predicate_class
          FROM edges
          WHERE story_slug = ?
            AND edge_type = 'storylet_predicate_class'
          ORDER BY predicate_class
        `
      )
      .all(STORY) as Array<{ predicate_class: string }>;
    return rows.map((row) => row.predicate_class);
  } finally {
    db.close();
  }
}

test("STSELECT-003 builds a production-shape existential pool before selector filtering", async () => {
  await withProductionShapeWorld(async (root, storylets) => {
    assert.equal(storylets.length, 42);
    assert.equal(
      storylets.filter((storylet) => storylet.predicates.some((predicate) => predicate.pred.startsWith("any_"))).length,
      34
    );
    assert.deepEqual(representedPredicateNames(storylets), SORTED_PREDICATE_NAMES);
    assert.deepEqual(indexedPredicateClasses(root), EXPECTED_REFERENCED_CLASSES);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-6",
        turn_driver: {
          kind: "npc_action",
          initiator: "STENT-1",
          driver_records: ["STQ-1", "STINT-1", "STEMO-1", "BEL-1", "THR-1"]
        },
        intent_signature: {
          action_families: ["communicate", "bond", "negotiate", "reveal"],
          grounding_record_classes: EXPECTED_REFERENCED_CLASSES
        },
        max_candidates: 42
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(
      {
        pool_total: result.filter_trace.pool_total,
        after_scope: result.filter_trace.after_scope,
        after_driver_kind: result.filter_trace.after_driver_kind,
        after_action_family: result.filter_trace.after_action_family,
        after_predicate_shape: result.filter_trace.after_predicate_shape,
        after_predicate_class: result.filter_trace.after_predicate_class,
        after_source_record_id: result.filter_trace.after_source_record_id,
        after_mystery_policy: result.filter_trace.after_mystery_policy,
        after_cooldown: result.filter_trace.after_cooldown
      },
      {
        pool_total: 42,
        after_scope: 42,
        after_driver_kind: 42,
        after_action_family: 42,
        after_predicate_shape: 42,
        after_predicate_class: 42,
        after_source_record_id: 42,
        after_mystery_policy: 42,
        after_cooldown: 41
      }
    );
    assert.deepEqual(result.filter_trace.predicate_class_rejected_samples, []);
    assert.deepEqual(result.filter_trace.cooldown_active_samples, [
      {
        slt_id: "SLT-35",
        last_selected_on_page: "PG-5",
        distance: 1,
        cooldown_pages: 2
      }
    ]);
    assert.ok(result.shortlisted_candidate_ids.includes("SLT-42"));

    const canonicalProjection = result.shortlisted_projection_records.find((record) => record.id === "SLT-42");
    assert.ok(canonicalProjection);
    assert.deepEqual(canonicalProjection.predicate_classes, [
      "intention_record",
      "story_emotion_record",
      "story_question_record"
    ]);
  });
});
