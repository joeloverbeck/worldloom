import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { storyDaDuplicateHeuristic } from "../../src/structural/story-da-duplicate-heuristic.js";
import { context, record } from "./helpers.js";

test("distinct_da_pair_passes", async () => {
  const verdicts = await runDuplicateHeuristic({
    artifacts: [
      artifact("DA-1", { title: "Lower Gate Letter", author: "Rell" }),
      artifact("DA-2", { title: "Ferry Charter", author: "Mira" })
    ],
    activeArtifacts: ["DA-1", "DA-2"]
  });

  assert.deepEqual(verdicts, []);
});

test("title_author_cluster_without_chain_warns", async () => {
  const verdicts = await runDuplicateHeuristic({
    artifacts: [
      artifact("DA-1", { title: "Lower Gate Letter", author: "Rell" }),
      artifact("DA-2", { title: "Lower Gate Letter", author: "Rell" })
    ],
    activeArtifacts: ["DA-1", "DA-2"]
  });

  const verdict = verdicts.find((item) => item.code === "story_da_duplicate_heuristic");
  assert.equal(verdict?.severity, "warn");
  assert.deepEqual((verdict?.detail as { artifact_ids: string[] }).artifact_ids, ["DA-1", "DA-2"]);
});

test("title_author_cluster_with_supersession_passes", async () => {
  const verdicts = await runDuplicateHeuristic({
    artifacts: [
      artifact("DA-1", { title: "Lower Gate Letter", author: "Rell" }),
      artifact("DA-2", { title: "Lower Gate Letter", author: "Rell", supersedes: "DA-1" })
    ],
    activeArtifacts: ["DA-1", "DA-2"]
  });

  assert.deepEqual(verdicts, []);
});

test("title_author_cluster_with_derivation_passes", async () => {
  const verdicts = await runDuplicateHeuristic({
    artifacts: [
      artifact("DA-1", { title: "Lower Gate Letter", author: "Rell" }),
      artifact("DA-2", { title: "Lower Gate Letter", author: "Rell", derived_from: ["DA-1"] })
    ],
    activeArtifacts: ["DA-1", "DA-2"]
  });

  assert.deepEqual(verdicts, []);
});

test("story_da_duplicate_heuristic is scoped to full-world, story DA/page pre-apply, and touched story DA/page files", () => {
  assert.equal(storyDaDuplicateHeuristic.applies_to(context([])), true);
  assert.equal(
    storyDaDuplicateHeuristic.applies_to(
      context([], {
        run_mode: "pre-apply",
        patch_plan: { patches: [{ op: "append_story_diegetic_artifact_record" }] } as unknown as PatchPlanEnvelope
      })
    ),
    true
  );
  assert.equal(
    storyDaDuplicateHeuristic.applies_to(
      context([], {
        run_mode: "pre-apply",
        patch_plan: { patches: [{ op: "create_slt_record" }] } as unknown as PatchPlanEnvelope
      })
    ),
    false
  );
  assert.equal(
    storyDaDuplicateHeuristic.applies_to(
      context([], {
        run_mode: "incremental",
        touched_files: ["stories/test-story/_source/artifacts/DA-1.yaml"]
      })
    ),
    true
  );
});

interface FixtureOptions {
  artifacts: Array<Record<string, unknown>>;
  activeArtifacts: string[];
}

function runDuplicateHeuristic(options: FixtureOptions) {
  const records = [
    page("PG-1", ["DA-1"]),
    page("PG-2", options.activeArtifacts),
    ...options.artifacts.map((item) =>
      ({
        ...record(
          "story_diegetic_artifact_record",
          `test-story:${String(item.id)}`,
          `stories/test-story/_source/artifacts/${String(item.id)}.yaml`,
          item
        ),
        story_slug: "test-story"
      })
    )
  ];

  return storyDaDuplicateHeuristic.run(undefined, context(records));
}

function page(id: string, activeArtifacts: string[]) {
  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      branch_id: "BR-1",
      parent_page_id: id === "PG-1" ? null : "PG-1",
      branch_path: id === "PG-1" ? ["PG-1"] : ["PG-1", id],
      turn_index: Number(id.split("-")[1] ?? "0"),
      state_snapshot: {
        active_records: {
          DA: activeArtifacts
        }
      }
    }),
    story_slug: "test-story"
  };
}

function artifact(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    supersedes: null,
    title: "Lower Gate Letter",
    author: "Rell",
    genre: "private letter",
    body: "Meet me at the lower gate.",
    intended_audience: "Mira",
    circulation: "private",
    truth_relation: "contested",
    derived_from: [],
    ...overrides
  };
}
