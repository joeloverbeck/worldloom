import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TestContext } from "node:test";

import Database from "better-sqlite3";
import YAML from "yaml";

import { openIndex } from "@worldloom/world-index/index/open";
import type {
  CanonFactRecord,
  ChangeLogEntry,
  CharacterDossier,
  DiegeticArtifactFrontmatter,
  InvariantRecord,
  MysteryRecord,
  NamedEntityRecord,
  OpenQuestionRecord,
  SectionRecord
} from "@worldloom/world-index/public/types";

import { canonicalOpHash } from "../src/approval/verify-token.js";
import type { IdAllocations, PatchOperation, PatchPlanEnvelope } from "../src/envelope/schema.js";
import { contentHashForYaml, PatchEngineOpError, serializeStableYaml } from "../src/ops/shared.js";
import type { OpContext, StagedWrite } from "../src/ops/types.js";

export const WORLD_SLUG = "minimal-world";

export interface TestWorld {
  worldRoot: string;
  worldSlug: string;
  db: Database.Database;
  ctx: OpContext;
}

export function createIndexedTestWorld(t: TestContext): TestWorld {
  const worldRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patch-engine-integration-"));
  const worldPath = path.join(worldRoot, "worlds", WORLD_SLUG);
  fs.mkdirSync(path.join(worldPath, "_source"), { recursive: true });
  fs.writeFileSync(path.join(worldPath, "WORLD_KERNEL.md"), "# Kernel\n\nA minimal indexed fixture world.\n", "utf8");
  fs.writeFileSync(path.join(worldPath, "ONTOLOGY.md"), "# Ontology\n\n## Categories in Use\n\n- entity\n", "utf8");

  const db = openIndex(worldRoot, WORLD_SLUG);
  const ctx = { worldRoot, db };
  const world = { worldRoot, worldSlug: WORLD_SLUG, db, ctx };
  seedStandardRecords(world);

  t.after(() => {
    db.close();
    fs.rmSync(worldRoot, { recursive: true, force: true });
  });

  return world;
}

export function createTestWorld(t: TestContext): TestWorld {
  const worldRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patch-engine-test-"));
  const worldPath = path.join(worldRoot, "worlds", WORLD_SLUG);
  fs.mkdirSync(worldPath, { recursive: true });

  const db = new Database(":memory:");
  createSchema(db);
  const ctx = { worldRoot, db };

  t.after(() => {
    db.close();
    fs.rmSync(worldRoot, { recursive: true, force: true });
  });

  return { worldRoot, worldSlug: WORLD_SLUG, db, ctx };
}

export function baseEnvelope(allocations: IdAllocations = {}): PatchPlanEnvelope {
  return {
    plan_id: "PLAN-TEST-0001",
    target_world: WORLD_SLUG,
    approval_token: "unused-in-unit-tests",
    verdict: "approved",
    originating_skill: "unit-test",
    expected_id_allocations: allocations,
    patches: []
  };
}

export function writeSecret(worldRoot: string, secret = Buffer.from("integration-test-secret")): string {
  const secretPath = path.join(worldRoot, "tools", "world-mcp", ".secret");
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secretPath;
}

export function nextId(db: Database.Database, prefix: string, width: number, zeroPad = true): string {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedPrefix}-(\\d+)$`);
  const rows = db.prepare("SELECT node_id FROM nodes ORDER BY node_id").all() as Array<{ node_id: string }>;
  let maxValue = 0;
  for (const row of rows) {
    const match = regex.exec(row.node_id);
    if (match !== null) {
      maxValue = Math.max(maxValue, Number.parseInt(match[1] ?? "0", 10));
    }
  }
  const nextValue = maxValue + 1;
  return `${prefix}-${zeroPad ? String(nextValue).padStart(width, "0") : String(nextValue)}`;
}

export function seedRecord(
  world: TestWorld,
  nodeId: string,
  nodeType: string,
  filePath: string,
  record: Record<string, unknown>
): string {
  const absolutePath = path.join(world.worldRoot, "worlds", world.worldSlug, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, serializeStableYaml(record), "utf8");
  const hash = contentHashForYaml(record);
  world.db
    .prepare(
      `
        INSERT INTO nodes (
          node_id, world_slug, file_path, heading_path, byte_start, byte_end,
          line_start, line_end, node_type, body, content_hash, anchor_checksum,
          summary, created_at_index_version
        )
        VALUES (?, ?, ?, NULL, 0, 0, 1, 1, ?, ?, ?, ?, NULL, 1)
      `
    )
    .run(nodeId, world.worldSlug, filePath, nodeType, serializeStableYaml(record), hash, hash);
  return hash;
}

export function seedStandardRecords(world: TestWorld): {
  cfHash: string;
  invHash: string;
  mHash: string;
  oqHash: string;
  secHash: string;
} {
  return {
    cfHash: seedRecord(world, "CF-0001", "canon_fact_record", "_source/canon/CF-0001.yaml", canonFact("CF-0001")),
    invHash: seedRecord(world, "ONT-1", "invariant", "_source/invariants/ONT-1.yaml", invariant("ONT-1")),
    mHash: seedRecord(world, "M-1", "mystery_reserve_entry", "_source/mystery-reserve/M-1.yaml", mystery("M-1")),
    oqHash: seedRecord(world, "OQ-0001", "open_question_entry", "_source/open-questions/OQ-0001.yaml", openQuestion("OQ-0001")),
    secHash: seedRecord(
      world,
      "SEC-ELF-001",
      "section",
      "_source/everyday-life/SEC-ELF-001.yaml",
      section("SEC-ELF-001")
    )
  };
}

export function addPatchedByEdge(world: TestWorld, sourceNodeId = "SEC-ELF-001", targetNodeId = "CF-0002"): void {
  world.db
    .prepare(
      `
        INSERT INTO edges (source_node_id, target_node_id, target_unresolved_ref, edge_type, world_slug)
        VALUES (?, ?, NULL, 'patched_by', ?)
      `
    )
    .run(sourceNodeId, targetNodeId, world.worldSlug);
}

export function assertYamlEquals(staged: StagedWrite, expected: unknown): void {
  const parsed = YAML.parse(fs.readFileSync(staged.temp_file_path, "utf8"));
  assert.deepEqual(parsed, JSON.parse(JSON.stringify(expected)));
}

export async function assertOpError(
  action: () => Promise<unknown>,
  code: PatchEngineOpError["code"]
): Promise<void> {
  await assert.rejects(async () => action(), (error) => error instanceof PatchEngineOpError && error.code === code);
}

export function signedToken(params: {
  envelope: PatchPlanEnvelope;
  secret: Buffer;
  expiresAt?: string;
  planId?: string;
  worldSlug?: string;
  patchHashes?: string[];
}): string {
  const payload = JSON.stringify({
    plan_id: params.planId ?? params.envelope.plan_id,
    world_slug: params.worldSlug ?? params.envelope.target_world,
    patch_hashes: params.patchHashes ?? params.envelope.patches.map(canonicalOpHash),
    issued_at: "2026-04-25T00:00:00.000Z",
    expires_at: params.expiresAt ?? "2026-04-26T00:00:00.000Z"
  });
  const signature = createHmac("sha256", params.secret).update(Buffer.from(payload, "utf8")).digest("hex");
  return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}

export function canonFact(id = "CF-0099"): CanonFactRecord {
  return {
    id,
    title: `Fact ${id}`,
    status: "hard_canon",
    type: "world_rule",
    statement: "A compact canonical fact for patch-engine tests.",
    scope: { geographic: "global", temporal: "current", social: "public" },
    truth_scope: { world_level: true, diegetic_status: "objective" },
    domains_affected: ["everyday_life"],
    distribution: { why_not_universal: ["Access remains limited."] },
    required_world_updates: ["SEC-ELF-001"],
    source_basis: { direct_user_approval: true },
    notes: "Initial note."
  };
}

export function changeLog(changeId = "CH-0099"): ChangeLogEntry {
  return {
    change_id: changeId,
    date: "2026-04-25",
    change_type: "addition",
    affected_fact_ids: ["CF-0099"],
    summary: "Adds a compact test fact.",
    reason: ["Unit test fixture."],
    scope: {
      local_or_global: "global",
      changes_ordinary_life: true,
      creates_new_story_engines: false,
      mystery_reserve_effect: "unchanged"
    },
    downstream_updates: ["SEC-ELF-001"],
    impact_on_existing_texts: [],
    severity_before_fix: 1,
    severity_after_fix: 0,
    retcon_policy_checks: {
      no_silent_edit: true,
      replacement_noted: true,
      no_stealth_diegetic_rewrite: true,
      net_contradictions_not_increased: true,
      world_identity_preserved: true
    }
  };
}

export function invariant(id = "ONT-99"): InvariantRecord {
  return {
    id,
    category: "ontological",
    title: `Invariant ${id}`,
    statement: "The test world obeys this invariant.",
    rationale: "It keeps fixture behavior stable.",
    examples: ["Stable fixture."],
    non_examples: ["Contradictory fixture."],
    break_conditions: "User-approved revision.",
    revision_difficulty: "high",
    extensions: []
  };
}

export function mystery(id = "M-99"): MysteryRecord {
  return {
    id,
    title: `Mystery ${id}`,
    status: "reserved",
    knowns: ["The boundary exists."],
    unknowns: ["The answer is withheld."],
    common_interpretations: ["Many in-world theories exist."],
    disallowed_cheap_answers: ["Do not flatten the reserve."],
    domains_touched: ["everyday_life"],
    future_resolution_safety: "medium",
    extensions: []
  };
}

export function openQuestion(id = "OQ-0099"): OpenQuestionRecord {
  return {
    id,
    topic: `Question ${id}`,
    body: "A compact open question.",
    when_to_resolve: "When a future canon change requires it.",
    extensions: []
  };
}

export function entity(id = "ENT-0099"): NamedEntityRecord {
  return {
    id,
    canonical_name: "Test Entity",
    entity_kind: "institution",
    aliases: ["Fixture Entity"],
    originating_cf: "CF-0099",
    scope_notes: "Used by patch-engine tests."
  };
}

export function section(id = "SEC-ELF-099"): SectionRecord {
  return {
    id,
    file_class: "everyday-life",
    order: 99,
    heading: "Fixture Section",
    heading_level: 2,
    body: "Initial section body.",
    touched_by_cf: [],
    extensions: []
  };
}

export function extension(originatingCf = "CF-0002") {
  return {
    originating_cf: originatingCf,
    change_id: "CH-0002",
    date: "2026-04-25",
    label: "Fixture extension",
    body: "Extension body."
  };
}

export function character(id = "CHAR-0099"): CharacterDossier {
  return {
    character_id: id,
    slug: "test-character",
    name: "Test Character",
    species: "human",
    age_band: "adult",
    place_of_origin: "Fixture Town",
    current_location: "Fixture Town",
    date: "2026-04-25",
    social_position: "local witness",
    profession: "scribe",
    kinship_situation: "not specified",
    religious_ideological_environment: "local custom",
    major_local_pressures: ["fixture pressure"],
    intended_narrative_role: "test fixture",
    world_consistency: { canon_links: ["CF-0001"] },
    source_basis: { direct_user_approval: true }
  };
}

export function diegeticArtifact(id = "DA-0099"): DiegeticArtifactFrontmatter {
  return {
    artifact_id: id,
    slug: "test-artifact",
    title: "Test Artifact",
    artifact_type: "letter",
    author: "Test Character",
    author_character_id: "CHAR-0099",
    date: "2026-04-25",
    place: "Fixture Town",
    audience: "local readers",
    communicative_purpose: "record a fixture",
    desired_relation_to_truth: "accurate but local",
    author_profile: { knowledge: "local" },
    epistemic_horizon: { limits: ["fixture only"] },
    claim_map: [],
    world_consistency: { canon_links: ["CF-0001"] },
    source_basis: { direct_user_approval: true }
  };
}

export function createOp<T extends PatchOperation>(op: T): T {
  return op;
}

function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE nodes (
      node_id TEXT PRIMARY KEY,
      world_slug TEXT NOT NULL,
      file_path TEXT NOT NULL,
      heading_path TEXT,
      byte_start INTEGER NOT NULL,
      byte_end INTEGER NOT NULL,
      line_start INTEGER NOT NULL,
      line_end INTEGER NOT NULL,
      node_type TEXT NOT NULL,
      body TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      anchor_checksum TEXT NOT NULL,
      summary TEXT,
      created_at_index_version INTEGER NOT NULL
    );
    CREATE TABLE edges (
      edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT,
      target_unresolved_ref TEXT,
      edge_type TEXT NOT NULL,
      world_slug TEXT NOT NULL
    );
    CREATE TABLE approval_tokens_consumed (
      token_hash TEXT PRIMARY KEY,
      consumed_at TEXT NOT NULL,
      plan_id TEXT NOT NULL
    );
  `);
}
