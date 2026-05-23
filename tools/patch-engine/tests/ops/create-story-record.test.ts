import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";
import { baseEnvelope, createTestWorld, assertOpError, assertYamlEquals, createOp } from "../harness.js";
import type { PatchOperation } from "../../src/envelope/schema.js";
import {
  stageCreateStoryRecord,
  stageRepairStoryCharacterAuthorityBodyIntegrity,
  stageRemoveStoryCharacterAuthorityBodyHashNoteField,
  stageRemoveStoryCharacterAuthorityFrontmatterField,
  stageStoryCharacterAuthorityRecord
} from "../../src/ops/create-story-record.js";
import { contentHashForText, serializeStableYaml } from "../../src/ops/shared.js";

test("create_slt_record writes story-bundle YAML under the story _source tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ slt_ids: ["SLT-0001"] });
  const op = {
    op: "create_slt_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "SLT-0001",
        hard_preconds: []
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_slt_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "storylets",
      "SLT-0001.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_bel_record writes BEL YAML under the story _source tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ bel_ids: ["BEL-0001"] });
  const op = {
    op: "create_bel_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "BEL-0001",
        holder: "STENT-0001",
        claim: "Marla believes Kern controls the harbor ledgers."
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_bel_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "beliefs",
      "BEL-0001.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_clk_record writes CLK YAML under the story _source clocks tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ clk_ids: ["CLK-1"] });
  const op = {
    op: "create_clk_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "CLK-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        title: "Harbor patrol alert",
        clock_kind: "exposure",
        driver: "group:harbor watch",
        linked_records: ["THR-1"],
        value: 1,
        max: 4,
        salience: "medium",
        visibility: "factional",
        thresholds: [],
        tick_history: [{ event: "SE-1", delta: 1, cause: "The ledger was seen." }],
        status: "active"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_clk_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "clocks",
      "CLK-1.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("supersede_clk_record writes replacement CLK YAML through the story-record path", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ clk_ids: ["CLK-2"] });
  const op = {
    op: "supersede_clk_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "CLK-2",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        supersedes: "CLK-1",
        title: "Harbor patrol alert",
        clock_kind: "exposure",
        driver: "group:harbor watch",
        linked_records: ["THR-1"],
        value: 2,
        max: 4,
        salience: "medium",
        visibility: "factional",
        thresholds: [],
        tick_history: [],
        status: "active"
      }
    }
  } satisfies Extract<PatchOperation, { op: "supersede_clk_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "clocks",
      "CLK-2.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_stsec_record writes STSEC YAML under the story _source secrets tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ stsec_ids: ["STSEC-1"] });
  const op = {
    op: "create_stsec_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STSEC-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        secret_kind: "motive",
        secret_claim: "Kern hid the ledgers.",
        truth_anchor: "SF-1",
        holders: ["STENT-1"],
        salience: "high",
        protected_mystery_refs: [],
        clue_carriers: [],
        source_records: ["BEL-1"],
        status: "hidden",
        reveal_event: null,
        reveal_records: []
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_stsec_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "secrets",
      "STSEC-1.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("supersede_stsec_record writes replacement STSEC YAML through the story-record path", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ stsec_ids: ["STSEC-2"] });
  const op = {
    op: "supersede_stsec_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STSEC-2",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        supersedes: "STSEC-1",
        secret_kind: "motive",
        secret_claim: "Kern hid the ledgers.",
        holders: ["STENT-1"],
        salience: "high",
        source_records: ["BEL-2"],
        status: "partially_revealed"
      }
    }
  } satisfies Extract<PatchOperation, { op: "supersede_stsec_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "secrets",
      "STSEC-2.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_stq_record writes STQ YAML under the story _source story-questions tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ stq_ids: ["STQ-1"] });
  const op = {
    op: "create_stq_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STQ-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        setup_kind: "setup",
        question_or_setup: "The locked drawer remains unopened.",
        salience: "high",
        audience_visibility: "explicit",
        source_event: "SE-1",
        source_records: ["STOBJ-1"],
        status: "open"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_stq_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "story-questions",
      "STQ-1.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("supersede_stq_record writes replacement STQ YAML through the story-record path", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ stq_ids: ["STQ-2"] });
  const op = {
    op: "supersede_stq_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STQ-2",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        supersedes: "STQ-1",
        setup_kind: "dramatic_question",
        question_or_setup: "Who hid the ledger?",
        salience: "high",
        audience_visibility: "implied",
        source_event: "SE-2",
        source_records: ["BEL-1"],
        payoff_of: "STQ-1",
        status: "complicated"
      }
    }
  } satisfies Extract<PatchOperation, { op: "supersede_stq_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "story-questions",
      "STQ-2.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_stplan_record writes STPLAN YAML under the story _source plans tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ stplan_ids: ["STPLAN-1"] });
  const op = {
    op: "create_stplan_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STPLAN-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        created_by_event: "SE-1",
        holder: "STENT-1",
        root_intention: "STINT-1",
        objective: "Recover the harbor ledger before Kern destroys it.",
        plan_status: "active",
        belief_basis: ["BEL-1"],
        current_step: {
          action_family: "investigate",
          target_records: ["STOBJ-1"],
          success_condition: { predicates: [] }
        },
        expires_when: "The ledger is recovered or destroyed."
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_stplan_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "plans",
      "STPLAN-1.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_stemo_record writes STEMO YAML under the story _source emotions tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ stemo_ids: ["STEMO-1"] });
  const op = {
    op: "create_stemo_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STEMO-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        created_by_event: "SE-1",
        holder: "STENT-1",
        status: "dissociated",
        affect_kind: null,
        orientation: { toward_records: [] },
        appraisal_basis: [],
        trigger_event: "SE-1",
        behavioral_pressure: [],
        agency_effect: "none",
        expires_when: "The actor reorients to the threat."
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_stemo_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "emotions",
      "STEMO-1.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_ststat_record writes STSTAT YAML under the story _source status tree", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ ststat_ids: ["STSTAT-0001"] });
  const op = {
    op: "create_ststat_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "STSTAT-0001",
        story_id: "STORY-0001",
        created_at_page: "PG-0001",
        entity: "STENT-0001",
        life: "alive",
        agency: "free",
        location: "STLOC-0001"
      }
    }
  } satisfies Extract<PatchOperation, { op: "create_ststat_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "status",
      "STSTAT-0001.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("create_slt_record rejects missing story-scoped id allocation", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const op = {
    op: "create_slt_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: { id: "SLT-0001" }
    }
  } satisfies Extract<PatchOperation, { op: "create_slt_record" }>;

  await assertOpError(() => stageCreateStoryRecord(env, op, world.ctx), "missing_expected_id_allocation");
});

test("append_story_diegetic_artifact_record writes story-local artifact YAML", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ story_da_ids: ["DA-0001"] });
  const op = {
    op: "append_story_diegetic_artifact_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        id: "DA-0001",
        title: "A story-local artifact"
      }
    }
  } satisfies Extract<PatchOperation, { op: "append_story_diegetic_artifact_record" }>;

  const staged = await stageCreateStoryRecord(env, op, world.ctx);

  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "_source",
      "artifacts",
      "DA-0001.yaml"
    )
  );
  assertYamlEquals(staged, op.payload.record);
});

test("append_story_character_authority_record writes story-local STCHAR markdown", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope({ stchar_ids: ["STCHAR-1"] });
  const op = {
    op: "append_story_character_authority_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: stcharRecord("STCHAR-1"),
      body_markdown: "## Profile\n\nMarla speaks with clipped certainty."
    }
  } satisfies Extract<PatchOperation, { op: "append_story_character_authority_record" }>;

  const [staged] = await stageStoryCharacterAuthorityRecord(env, op, world.ctx);

  assert.ok(staged);
  assert.equal(
    staged.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "story-characters",
      "STCHAR-1.md"
    )
  );
  const parsed = parseHybrid(fs.readFileSync(staged.temp_file_path, "utf8"));
  assert.deepEqual(parsed.frontmatter, op.payload.record);
  assert.equal(parsed.body.trim(), op.payload.body_markdown);
});

test("supersede_story_character_authority_record writes replacement and lifecycle-marks predecessor", async (t) => {
  const world = createTestWorld(t);
  const predecessor = stcharRecord("STCHAR-1");
  seedStcharHybrid(world, "marla-kern-seduction", predecessor, "## Profile\n\nOriginal profile.");
  const env = baseEnvelope({ stchar_ids: ["STCHAR-2"] });
  const op = {
    op: "supersede_story_character_authority_record",
    target_world: env.target_world,
    payload: {
      story_slug: "marla-kern-seduction",
      record: {
        ...stcharRecord("STCHAR-2"),
        supersedes: "STCHAR-1",
        profile_revision: 2
      },
      body_markdown: "## Profile\n\nRevised profile."
    }
  } satisfies Extract<PatchOperation, { op: "supersede_story_character_authority_record" }>;

  const staged = await stageStoryCharacterAuthorityRecord(env, op, world.ctx);

  assert.equal(staged.length, 2);
  const predecessorPatch = parseHybrid(fs.readFileSync(staged[0]!.temp_file_path, "utf8"));
  assert.equal(predecessorPatch.frontmatter.status, "superseded");
  assert.equal(predecessorPatch.frontmatter.superseded_by, "STCHAR-2");
  assert.equal(predecessorPatch.body.trim(), "## Profile\n\nOriginal profile.");
  const replacement = parseHybrid(fs.readFileSync(staged[1]!.temp_file_path, "utf8"));
  assert.deepEqual(replacement.frontmatter, op.payload.record);
  assert.equal(
    staged[1]!.target_file_path,
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "story-characters",
      "STCHAR-2.md"
    )
  );
});

test("remove_story_character_authority_frontmatter_field removes legacy tamper hash fields", async (t) => {
  const world = createTestWorld(t);
  const frontmatter = {
    ...stcharRecord("STCHAR-1"),
    profile_hash: `sha256:${"a".repeat(64)}`,
    voice_block_hash: `sha256:${"b".repeat(64)}`,
    source_char_hash: `sha256:${"c".repeat(64)}`,
    page_packet_hash: `sha256:${"d".repeat(64)}`
  };
  seedStcharHybrid(world, "marla-kern-seduction", frontmatter, "## Profile\n\nOriginal profile.");
  const env = baseEnvelope();
  const source = fs.readFileSync(
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "story-characters",
      "STCHAR-1.md"
    ),
    "utf8"
  );
  const op = createOp({
    op: "remove_story_character_authority_frontmatter_field",
    target_world: env.target_world,
    target_file: "stories/marla-kern-seduction/story-characters/STCHAR-1.md",
    expected_content_hash: contentHashForText(source),
    payload: {
      story_slug: "marla-kern-seduction",
      target_record_id: "STCHAR-1",
      field_name: "profile_hash"
    }
  } satisfies Extract<PatchOperation, { op: "remove_story_character_authority_frontmatter_field" }>);

  const staged = await stageRemoveStoryCharacterAuthorityFrontmatterField(env, op, world.ctx);
  const parsed = parseHybrid(fs.readFileSync(staged.temp_file_path, "utf8"));

  assert.equal(parsed.frontmatter.profile_hash, undefined);
  assert.equal(parsed.frontmatter.voice_block_hash, frontmatter.voice_block_hash);
  assert.equal(parsed.frontmatter.source_char_hash, frontmatter.source_char_hash);
  assert.equal(parsed.frontmatter.page_packet_hash, frontmatter.page_packet_hash);
  assert.equal(parsed.body.trim(), "## Profile\n\nOriginal profile.");
});

test("remove_story_character_authority_frontmatter_field rejects unsupported frontmatter fields", async (t) => {
  const world = createTestWorld(t);
  seedStcharHybrid(world, "marla-kern-seduction", stcharRecord("STCHAR-1"), "## Profile\n\nOriginal profile.");
  const env = baseEnvelope();

  await assertOpError(
    () =>
      stageRemoveStoryCharacterAuthorityFrontmatterField(
        env,
        createOp({
          op: "remove_story_character_authority_frontmatter_field",
          target_world: env.target_world,
          target_file: "stories/marla-kern-seduction/story-characters/STCHAR-1.md",
          payload: {
            story_slug: "marla-kern-seduction",
            target_record_id: "STCHAR-1",
            field_name: "unknown_hash"
          }
        } as unknown as Extract<PatchOperation, { op: "remove_story_character_authority_frontmatter_field" }>),
        world.ctx
      ),
    "unsupported_operation"
  );
});

test("remove_story_character_authority_body_hash_note_field removes legacy tamper hash note fields", async (t) => {
  const world = createTestWorld(t);
  const frontmatter = {
    ...stcharRecord("STCHAR-1"),
    page_packet_hash: `sha256:${"d".repeat(64)}`
  };
  const body = [
    "## Validation / Audit Anchors",
    "",
    "- source_char_hash: deterministic sha256 over the full CHAR-1 dossier file bytes.",
    "- Hashes: profile_hash over the full body markdown; voice_block_hash over the `## Page-Plan Voice Block` section; page_packet_hash over the §16a packet projection authored for this bundle.",
    "- Invariants respected: ONT-1."
  ].join("\n");
  seedStcharHybrid(world, "marla-kern-seduction", frontmatter, body);
  const env = baseEnvelope();
  const source = fs.readFileSync(
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "story-characters",
      "STCHAR-1.md"
    ),
    "utf8"
  );
  const op = createOp({
    op: "remove_story_character_authority_body_hash_note_field",
    target_world: env.target_world,
    target_file: "stories/marla-kern-seduction/story-characters/STCHAR-1.md",
    expected_content_hash: contentHashForText(source),
    payload: {
      story_slug: "marla-kern-seduction",
      target_record_id: "STCHAR-1",
      field_name: "profile_hash"
    }
  } satisfies Extract<PatchOperation, { op: "remove_story_character_authority_body_hash_note_field" }>);

  const staged = await stageRemoveStoryCharacterAuthorityBodyHashNoteField(env, op, world.ctx);
  const parsed = parseHybrid(fs.readFileSync(staged.temp_file_path, "utf8"));

  assert.equal(parsed.frontmatter.page_packet_hash, frontmatter.page_packet_hash);
  assert.match(parsed.body, /source_char_hash/);
  assert.doesNotMatch(parsed.body, /profile_hash over the full body markdown/);
  assert.match(parsed.body, /voice_block_hash over the `## Page-Plan Voice Block` section/);
  assert.match(parsed.body, /page_packet_hash/);
  assert.match(parsed.body, /Invariants respected: ONT-1/);
});

test("remove_story_character_authority_body_hash_note_field removes final hash note lines", async (t) => {
  const world = createTestWorld(t);
  seedStcharHybrid(
    world,
    "marla-kern-seduction",
    stcharRecord("STCHAR-1"),
    [
      "## Validation / Audit Anchors",
      "",
      "- source_char_hash: deterministic sha256 over the full CHAR-1 dossier file bytes.",
      "- Hashes: voice_block_hash over the `## Page-Plan Voice Block` section.",
      "- Invariants respected: ONT-1."
    ].join("\n")
  );
  const env = baseEnvelope();
  const source = fs.readFileSync(
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "story-characters",
      "STCHAR-1.md"
    ),
    "utf8"
  );
  const op = createOp({
    op: "remove_story_character_authority_body_hash_note_field",
    target_world: env.target_world,
    target_file: "stories/marla-kern-seduction/story-characters/STCHAR-1.md",
    expected_content_hash: contentHashForText(source),
    payload: {
      story_slug: "marla-kern-seduction",
      target_record_id: "STCHAR-1",
      field_name: "voice_block_hash"
    }
  } satisfies Extract<PatchOperation, { op: "remove_story_character_authority_body_hash_note_field" }>);

  const stagedVoice = await stageRemoveStoryCharacterAuthorityBodyHashNoteField(env, op, world.ctx);
  const parsedVoice = parseHybrid(fs.readFileSync(stagedVoice.temp_file_path, "utf8"));
  assert.doesNotMatch(parsedVoice.body, /^- Hashes:/m);

  fs.writeFileSync(
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "story-characters",
      "STCHAR-1.md"
    ),
    fs.readFileSync(stagedVoice.temp_file_path, "utf8")
  );

  const opSource = createOp({
    op: "remove_story_character_authority_body_hash_note_field",
    target_world: env.target_world,
    target_file: "stories/marla-kern-seduction/story-characters/STCHAR-1.md",
    payload: {
      story_slug: "marla-kern-seduction",
      target_record_id: "STCHAR-1",
      field_name: "source_char_hash"
    }
  } satisfies Extract<PatchOperation, { op: "remove_story_character_authority_body_hash_note_field" }>);
  const stagedSource = await stageRemoveStoryCharacterAuthorityBodyHashNoteField(env, opSource, world.ctx);
  const parsedSource = parseHybrid(fs.readFileSync(stagedSource.temp_file_path, "utf8"));
  assert.doesNotMatch(parsedSource.body, /^- source_char_hash:/m);
  assert.match(parsedSource.body, /Invariants respected: ONT-1/);
});

test("repair_story_character_authority_body_integrity replaces body and source map without stamping hashes", async (t) => {
  const world = createTestWorld(t);
  const frontmatter = stcharRecord("STCHAR-1");
  seedStcharHybrid(world, "marla-kern-seduction", frontmatter, "## Profile\n\nOld profile.");
  const env = baseEnvelope();
  const source = fs.readFileSync(
    path.join(
      world.worldRoot,
      "worlds",
      world.worldSlug,
      "stories",
      "marla-kern-seduction",
      "story-characters",
      "STCHAR-1.md"
    ),
    "utf8"
  );
  const body = stcharBody();
  const sourceMap: Extract<
    PatchOperation,
    { op: "repair_story_character_authority_body_integrity" }
  >["payload"]["source_operational_fact_map"] = [
    {
      source_field: "signature_scene_behaviors",
      disposition: "compressed",
      target_section: "Prose Rendering Constraints",
      rationale: "Carried into the signature rendering constraints."
    }
  ];
  const op = createOp({
    op: "repair_story_character_authority_body_integrity",
    target_world: env.target_world,
    target_file: "stories/marla-kern-seduction/story-characters/STCHAR-1.md",
    expected_content_hash: contentHashForText(source),
    payload: {
      story_slug: "marla-kern-seduction",
      target_record_id: "STCHAR-1",
      body_markdown: body,
      source_operational_fact_map: sourceMap
    }
  } satisfies Extract<PatchOperation, { op: "repair_story_character_authority_body_integrity" }>) as Extract<
    PatchOperation,
    { op: "repair_story_character_authority_body_integrity" }
  >;

  const staged = await stageRepairStoryCharacterAuthorityBodyIntegrity(env, op, world.ctx);
  const parsed = parseHybrid(fs.readFileSync(staged.temp_file_path, "utf8"));

  assert.deepEqual(parsed.frontmatter.source_operational_fact_map, sourceMap);
  assert.equal(parsed.frontmatter.profile_hash, undefined);
  assert.equal(parsed.frontmatter.voice_block_hash, undefined);
  assert.equal(parsed.frontmatter.id, "STCHAR-1");
  assert.equal(parsed.body, body);
});

function stcharRecord(id: string): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-1",
    story_slug: "marla-kern-seduction",
    world_slug: "minimal-world",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_sections_used: ["frontmatter"],
    generated_at_page: "story_bootstrap",
    created_by_skill: "unit-test",
    supersedes: null,
    superseded_by: null,
    status: "active",
    bound_stent_ids: ["STENT-1"],
    profile_revision: 1,
    body_schema_version: "stchar.v1"
  };
}

function stcharBody(): string {
  return [
    "# Test STCHAR",
    "",
    "## Story-Facing Identity",
    "",
    "Identity authority.",
    "",
    "## Source Distillation",
    "",
    "Source authority.",
    "",
    "## Stable Persona Core",
    "",
    "Stable persona.",
    "",
    "## Emotional Appraisal Map",
    "",
    "Emotional appraisals.",
    "",
    "## Pressure Behavior",
    "",
    "Pressure behavior.",
    "",
    "## Voice Bible / Dialogue Authority",
    "",
    "Voice authority.",
    "",
    "## Page-Plan Voice Block",
    "",
    "Page voice block.",
    "",
    "## Perception and Embodiment",
    "",
    "Perception authority.",
    "",
    "## Agency and Planning Tendencies",
    "",
    "Agency authority.",
    "",
    "### Operational capabilities and affordances",
    "",
    "Can act through known skills and available tools.",
    "",
    "### Capability limits, costs, and access constraints",
    "",
    "Limits and costs remain explicit.",
    "",
    "## Relationship-Specific Behavior",
    "",
    "Relationship behavior.",
    "",
    "## Story-State Derivation Guide",
    "",
    "Story-state guidance.",
    "",
    "## Prose Rendering Constraints",
    "",
    "Rendering constraints.",
    "",
    "### Signature scene behaviors to render",
    "",
    "Render the signature behavior.",
    "",
    "## Validation / Audit Anchors",
    "",
    "Audit anchors."
  ].join("\n");
}

function seedStcharHybrid(
  world: ReturnType<typeof createTestWorld>,
  storySlug: string,
  frontmatter: Record<string, unknown>,
  body: string
): void {
  const id = String(frontmatter.id);
  const filePath = path.join("stories", storySlug, "story-characters", `${id}.md`);
  const absolutePath = path.join(world.worldRoot, "worlds", world.worldSlug, filePath);
  const content = `---\n${serializeStableYaml(frontmatter)}---\n${body}\n`;
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
  const hash = contentHashForText(content);
  world.db
    .prepare(
      `
        INSERT INTO nodes (
          node_id, world_slug, story_slug, file_path, heading_path, byte_start, byte_end,
          line_start, line_end, node_type, body, content_hash, anchor_checksum,
          summary, created_at_index_version
        )
        VALUES (?, ?, ?, ?, NULL, 0, 0, 1, 1, 'story_character_authority_record', ?, ?, ?, NULL, 1)
      `
    )
    .run(`${storySlug}:${id}`, world.worldSlug, storySlug, filePath, serializeStableYaml(frontmatter), hash, hash);
}

function parseHybrid(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = /^---\n([\s\S]*?)---\n?([\s\S]*)$/.exec(content);
  assert.ok(match);
  return {
    frontmatter: JSON.parse(JSON.stringify(YAML.parse(match[1] ?? ""))) as Record<string, unknown>,
    body: match[2] ?? ""
  };
}
