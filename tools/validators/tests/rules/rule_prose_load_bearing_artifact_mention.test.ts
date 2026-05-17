import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { ruleProseLoadBearingArtifactMention } from "../../src/rules/rule_prose_load_bearing_artifact_mention.js";
import { context, record } from "../structural/helpers.js";

test("prose_load_bearing_artifact_mention accepts prose with matching active DA", async () => {
  const verdicts = await runProseArtifactMention({
    prose: "Rell read the letter again before choosing the ferry road.",
    activeArtifacts: ["DA-1"],
    artifacts: [artifact("DA-1", { genre: "private letter" })]
  });

  assert.deepEqual(verdicts, []);
});

test("prose_load_bearing_artifact_mention warns when letter prose lacks active DA", async () => {
  const verdicts = await runProseArtifactMention({
    prose: "Rell read the letter again before choosing the ferry road.",
    activeArtifacts: []
  });

  const verdict = verdicts.find((item) => item.code === "prose_load_bearing_artifact_mention_without_da");
  assert.equal(verdict?.severity, "warn");
  assert.equal(verdict?.validator, "prose_load_bearing_artifact_mention");
  assert.match(verdict?.message ?? "", /load-bearing letter/);
  assert.deepEqual((verdict?.detail as { page_id?: string; artifact_noun?: string })?.page_id, "PG-2");
});

test("prose_load_bearing_artifact_mention fails on quoted artifact content without DA", async () => {
  const verdicts = await runProseArtifactMention({
    prose: 'Rell read the decree aloud: "By order of the River Guard, no ferry shall cross after moonrise."',
    activeArtifacts: []
  });

  const verdict = verdicts.find((item) => item.code === "prose_load_bearing_artifact_mention_without_da");
  assert.equal(verdict?.severity, "fail");
  assert.equal((verdict?.detail as { quoted_content_detected?: boolean })?.quoted_content_detected, true);
});

test("prose_load_bearing_artifact_mention ignores clear metaphor", async () => {
  const verdicts = await runProseArtifactMention({
    prose: "Her words were a letter to her future self, not a real letter anyone could read.",
    activeArtifacts: []
  });

  assert.deepEqual(verdicts, []);
});

test("prose_load_bearing_artifact_mention applies to full-world, incremental, and story pre-apply runs", () => {
  assert.equal(ruleProseLoadBearingArtifactMention.applies_to(context([])), true);
  assert.equal(
    ruleProseLoadBearingArtifactMention.applies_to(
      context([], {
        run_mode: "incremental",
        touched_files: ["stories/test-story/pages-prose/PG-2.md"]
      })
    ),
    true
  );
  assert.equal(
    ruleProseLoadBearingArtifactMention.applies_to(
      context([], {
        run_mode: "pre-apply",
        patch_plan: { patches: [{ op: "create_pg_record" }] } as unknown as PatchPlanEnvelope
      })
    ),
    true
  );
  assert.equal(
    ruleProseLoadBearingArtifactMention.applies_to(
      context([], {
        run_mode: "pre-apply",
        patch_plan: { patches: [{ op: "create_slt_record" }] } as unknown as PatchPlanEnvelope
      })
    ),
    false
  );
});

interface FixtureOptions {
  prose: string;
  activeArtifacts: string[];
  artifacts?: Array<Record<string, unknown>>;
}

async function runProseArtifactMention(options: FixtureOptions) {
  const records = [
    page("PG-2", options.activeArtifacts),
    ...(options.artifacts ?? options.activeArtifacts.map((id) => artifact(id))).map((item) =>
      record(
        "story_diegetic_artifact_record",
        `test-story:${String(item.id)}`,
        `stories/test-story/_source/artifacts/${String(item.id)}.yaml`,
        item
      )
    )
  ];

  return ruleProseLoadBearingArtifactMention.run(
    {
      files: [
        {
          path: "stories/test-story/pages-prose/PG-2.md",
          content: options.prose
        }
      ]
    },
    context(records, { story_slug: "test-story" })
  );
}

function page(id: string, activeArtifacts: string[]) {
  return record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: "PG-1",
    branch_path: ["PG-1", id],
    turn_index: 2,
    state_snapshot: {
      active_records: {
        DA: activeArtifacts
      }
    }
  });
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
