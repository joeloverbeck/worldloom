import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import YAML from "yaml";

import type { PatchOperation } from "../../src/envelope/schema.js";
import {
  stageAppendDiegeticArtifactRecord,
  stageRepairDiegeticArtifactClaimMapMetadata
} from "../../src/ops/append-diegetic-artifact-record.js";
import { contentHashForText, serializeStableYaml } from "../../src/ops/shared.js";
import { assertOpError, baseEnvelope, createOp, createTestWorld, diegeticArtifact } from "../harness.js";

test("append_diegetic_artifact_record writes under diegetic-artifacts", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const op = createOp({ op: "append_diegetic_artifact_record", target_world: env.target_world, target_file: "diegetic-artifacts/test-artifact.md", payload: { da_record: diegeticArtifact("DA-0099"), body_markdown: "Body.", filename: "test-artifact.md" } } satisfies Extract<PatchOperation, { op: "append_diegetic_artifact_record" }>);

  const staged = await stageAppendDiegeticArtifactRecord(env, op, world.ctx);

  assert.equal(staged.target_file_path, path.join(world.worldRoot, "worlds", world.worldSlug, "diegetic-artifacts/test-artifact.md"));
  assert.match(fs.readFileSync(staged.temp_file_path, "utf8"), /artifact_id: DA-0099/);
});

test("append_diegetic_artifact_record rejects traversal and existing files", async (t) => {
  const world = createTestWorld(t);
  const env = baseEnvelope();
  const payload = { da_record: diegeticArtifact("DA-0099"), body_markdown: "Body.", filename: "test-artifact.md" };
  const existingPath = path.join(world.worldRoot, "worlds", world.worldSlug, "diegetic-artifacts/test-artifact.md");
  fs.mkdirSync(path.dirname(existingPath), { recursive: true });
  fs.writeFileSync(existingPath, "exists", "utf8");

  await assertOpError(() => stageAppendDiegeticArtifactRecord(env, createOp({ op: "append_diegetic_artifact_record", target_world: env.target_world, target_file: "../test-artifact.md", payload } satisfies Extract<PatchOperation, { op: "append_diegetic_artifact_record" }>), world.ctx), "target_file_outside_world");
  await assertOpError(() => stageAppendDiegeticArtifactRecord(env, createOp({ op: "append_diegetic_artifact_record", target_world: env.target_world, target_file: "diegetic-artifacts/test-artifact.md", payload } satisfies Extract<PatchOperation, { op: "append_diegetic_artifact_record" }>), world.ctx), "file_already_exists");
});

test("repair_diegetic_artifact_claim_map_metadata retags only unbacked canonically true DA claims", async (t) => {
  const world = createTestWorld(t);
  const frontmatter = diegeticArtifact("DA-0001");
  frontmatter.claim_map = [
    {
      claim: "I saw the fixture event.",
      canon_status: "canonically_true",
      narrator_belief: "true",
      source: "witnessed",
      contradiction_risk: "none",
      mode: "direct",
      cf_id: null,
      mr_id: null,
      repair_trace: null
    },
    {
      claim: "The fixture venue exists.",
      canon_status: "canonically_true",
      narrator_belief: "true",
      source: "witnessed",
      contradiction_risk: "none",
      mode: "direct",
      cf_id: "CF-0001",
      mr_id: null,
      repair_trace: null
    }
  ];
  const source = seedDiegeticArtifactHybrid(world, frontmatter, "## Body\n\nArtifact prose stays intact.");
  const env = baseEnvelope();
  const op = createOp({
    op: "repair_diegetic_artifact_claim_map_metadata",
    target_world: env.target_world,
    target_file: "diegetic-artifacts/test-artifact.md",
    expected_content_hash: contentHashForText(source),
    payload: {
      target_record_id: "DA-0001",
      claim_map_updates: [
        {
          index: 0,
          expected_canon_status: "canonically_true",
          expected_cf_id: null,
          canon_status: "partially_true",
          cf_id: null,
          repair_trace_note: "Retagged because no resolvable CF backs this local artifact claim."
        }
      ]
    }
  } satisfies Extract<PatchOperation, { op: "repair_diegetic_artifact_claim_map_metadata" }>);

  const staged = await stageRepairDiegeticArtifactClaimMapMetadata(env, op, world.ctx);
  const parsed = parseHybrid(fs.readFileSync(staged.temp_file_path, "utf8"));
  const claimMap = parsed.frontmatter.claim_map as Array<Record<string, any>>;

  assert.equal(claimMap[0]?.claim, "I saw the fixture event.");
  assert.equal(claimMap[0]?.canon_status, "partially_true");
  assert.equal(claimMap[0]?.cf_id, null);
  assert.equal(
    (claimMap[0]?.repair_trace as Record<string, unknown>).valda_004,
    "Retagged because no resolvable CF backs this local artifact claim."
  );
  assert.equal(claimMap[1]?.canon_status, "canonically_true");
  assert.equal(claimMap[1]?.cf_id, "CF-0001");
  assert.match(parsed.body, /Artifact prose stays intact/);
});

test("repair_diegetic_artifact_claim_map_metadata rejects unsupported claim-map changes", async (t) => {
  const world = createTestWorld(t);
  const frontmatter = diegeticArtifact("DA-0001");
  frontmatter.claim_map = [
    {
      claim: "Already backed.",
      canon_status: "canonically_true",
      narrator_belief: "true",
      source: "witnessed",
      contradiction_risk: "none",
      mode: "direct",
      cf_id: "CF-0001",
      mr_id: null,
      repair_trace: null
    }
  ];
  seedDiegeticArtifactHybrid(world, frontmatter, "## Body\n\nArtifact prose.");
  const env = baseEnvelope();

  await assertOpError(
    () =>
      stageRepairDiegeticArtifactClaimMapMetadata(
        env,
        createOp({
          op: "repair_diegetic_artifact_claim_map_metadata",
          target_world: env.target_world,
          target_file: "diegetic-artifacts/test-artifact.md",
          payload: {
            target_record_id: "DA-0001",
            claim_map_updates: [
              {
                index: 0,
                expected_canon_status: "canonically_true",
                expected_cf_id: null,
                canon_status: "partially_true",
                cf_id: null,
                repair_trace_note: "Should fail because the current cf_id is not null."
              }
            ]
          }
        } satisfies Extract<PatchOperation, { op: "repair_diegetic_artifact_claim_map_metadata" }>),
        world.ctx
      ),
    "record_hash_drift"
  );
});

function seedDiegeticArtifactHybrid(
  world: ReturnType<typeof createTestWorld>,
  frontmatter: Record<string, unknown>,
  body: string
): string {
  const filePath = path.join("diegetic-artifacts", "test-artifact.md");
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
        VALUES (?, ?, NULL, ?, NULL, 0, 0, 1, 1, 'diegetic_artifact_record', ?, ?, ?, NULL, 1)
      `
    )
    .run(String(frontmatter.artifact_id), world.worldSlug, filePath, content, hash, hash);
  return content;
}

function parseHybrid(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = /^---\n([\s\S]*?)---\n?([\s\S]*)$/.exec(content);
  assert.ok(match);
  return {
    frontmatter: JSON.parse(JSON.stringify(YAML.parse(match[1] ?? ""))) as Record<string, unknown>,
    body: match[2] ?? ""
  };
}
