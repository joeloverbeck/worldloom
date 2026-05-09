import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { canonicalOpHash, submitPatchPlan, type PatchPlanEnvelope } from "@worldloom/patch-engine";
import { build } from "@worldloom/world-index/commands/build";
import YAML from "yaml";

import { getCanonicalVocabulary } from "../../src/tools/get-canonical-vocabulary";
import { getRecord } from "../../src/tools/get-record";
import { validatePatchPlan } from "../../src/tools/validate-patch-plan";
import type { PatchPlanEnvelope as McpPatchPlanEnvelope } from "../../src/tools/_shared";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const WORLD_SLUG = "spec22-capstone";
const STORY_SLUG = "harborwatch";

test("SPEC-22 patch-engine round-trip validates, submits, and re-reads ARC_TRACE records", async () => {
  const root = createSpec22RepoRoot();
  const secret = Buffer.from("spec22-capstone-secret");
  const secretPath = path.join(root, "tools", "world-mcp", ".secret");
  writeFileSync(secretPath, secret, "utf8");

  try {
    const envelope = buildArcTraceEnvelope("ARCTRACE-0001");

    const validation = await withWorldMcpCwd(root, () =>
      validatePatchPlan({ patch_plan: envelope as unknown as McpPatchPlanEnvelope })
    );
    assert.ok("status" in validation);
    assert.equal(validation.status, "pass", JSON.stringify(validation.verdicts, null, 2));
    assert.deepEqual(validation.verdicts, []);
    assert.ok(validation.validators_run.some((entry) => entry.validator_name === "arc_trace_evidence_alignment"));

    const receipt = await submitPatchPlan(envelope, signToken(envelope, secret), {
      worldRoot: root,
      hmacSecretPath: secretPath,
      preApplyValidator: () => ({
        ok: true,
        validators_run: [{ validator_name: "spec22_capstone_injected_preapply", status: "pass", duration_ms: 0 }]
      })
    });

    assert.ok(!("ok" in receipt), JSON.stringify(receipt));
    assert.deepEqual(receipt.id_allocations_consumed.arc_trace_ids, ["ARCTRACE-0001"]);

    const writtenPath = path.join(
      root,
      "worlds",
      WORLD_SLUG,
      "stories",
      STORY_SLUG,
      "_source",
      "arc-traces",
      "ARCTRACE-0001.yaml"
    );
    assert.ok(existsSync(writtenPath));
    assert.deepEqual(YAML.parse(readFileSync(writtenPath, "utf8")), arcTraceRecord("ARCTRACE-0001"));

    const reread = await withWorldMcpCwd(root, () =>
      getRecord({ world_slug: WORLD_SLUG, story_slug: STORY_SLUG, record_id: "ARCTRACE-0001" })
    );
    assert.ok("record" in reread);
    assert.deepEqual(reread.record, {
      record_kind: "arc_trace_node",
      ...arcTraceRecord("ARCTRACE-0001")
    });
  } finally {
    cleanup(root);
  }
});

test("SPEC-22 validator coverage is executable and mirrored by page-cycle gate prose", () => {
  const registry = readRepoFile("tools/validators/src/public/registry.ts");
  const bootstrapGates = readRepoFile(".claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md");
  const pageCycle = readRepoFile(".claude/skills/branching-story-page-cycle/SKILL.md");
  const pageCycleGates = readRepoFile(".claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md");
  const expectedValidators = [
    "arc_schema_compliance",
    "choice_worthiness_completeness",
    "stop_policy_parsability",
    "effect_model_legality",
    "effect_model_replay_safety",
    "arc_trace_evidence_alignment",
    "narrative_point_classification",
    "arc_envelope_conformance"
  ];

  for (const validatorName of expectedValidators) {
    assert.ok(
      existsSync(path.join(REPO_ROOT, "tools", "validators", "src", "rules", `${validatorName}.ts`)),
      `${validatorName} rule file should exist`
    );
    assert.match(registry, new RegExp(toCamelCase(validatorName)));
  }

  for (const phase9GateName of [
    "arc_envelope_conformance",
    "effect_model_replay_safety",
    "arc_trace_evidence_alignment",
    "narrative_point_classification",
    "choice_worthiness_completeness"
  ]) {
    assert.match(`${bootstrapGates}\n${pageCycle}\n${pageCycleGates}`, new RegExp(phase9GateName));
  }

  assert.match(bootstrapGates, /17-gate|17 validation gates/);
  assert.match(pageCycle, /17 gates|17 validation gates/);
});

test("SPEC-22 canonical vocabulary classes expose the expected live counts", async () => {
  const expected = [
    ["commitment_class", 20],
    ["arc_archetype", 20],
    ["narrative_point", 5],
    ["strong_axis", 8],
    ["strong_outcome", 8],
    ["stop_predicate", 19]
  ] as const;

  for (const [vocabularyClass, count] of expected) {
    const result = await getCanonicalVocabulary({ class: vocabularyClass });
    assert.ok(!("code" in result));
    assert.equal(result.canonical_values.length, count);
  }
});

test("SPEC-22 world-index ingests 50 ARC_TRACE records under the verification budget", () => {
  const root = createSpec22RepoRoot();

  try {
    for (let index = 1; index <= 50; index += 1) {
      writeStoryRecord(root, "arc-traces", `ARCTRACE-${pad4(index)}.yaml`, arcTraceRecord(`ARCTRACE-${pad4(index)}`));
    }

    const startedAt = Date.now();
    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);
    const durationMs = Date.now() - startedAt;

    assert.ok(durationMs < 10_000, `expected 50 ARC_TRACE records to build in <10s, got ${durationMs}ms`);

    const Database = require("better-sqlite3") as typeof import("better-sqlite3");
    const db = new Database(path.join(root, "worlds", WORLD_SLUG, "_index", "world.db"), {
      readonly: true
    });
    try {
      const row = db
        .prepare("SELECT COUNT(*) AS count FROM arc_trace_node WHERE id LIKE '%:ARCTRACE-%'")
        .get() as { count: number };
      assert.equal(row.count, 50);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("SPEC-22 sibling skill contracts expose v2 arc interop surfaces", () => {
  const bootstrap = [
    readRepoFile(".claude/skills/branching-story-bootstrap/SKILL.md"),
    readRepoFile(".claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md"),
    readRepoFile(".claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md")
  ].join("\n");
  const healthAudit = [
    readRepoFile(".claude/skills/branching-story-health-audit/SKILL.md"),
    readRepoFile(".claude/skills/branching-story-health-audit/templates/story-audit-report.md")
  ].join("\n");
  const promotion = [
    readRepoFile(".claude/skills/story-fact-promotion-to-canon/SKILL.md"),
    readRepoFile(".claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml")
  ].join("\n");

  assert.match(bootstrap, /target_pool_size = max\(8, ceil\(world_complexity_factor .* 10\)\)/);
  assert.match(bootstrap, /scene_commitment_arc/);
  assert.doesNotMatch(bootstrap, /v1 SLT/);
  assert.match(healthAudit, /mean arcs between menus/);
  assert.match(healthAudit, /menu-emitting page ratio/);
  assert.doesNotMatch(healthAudit, /words-per-arc-page/);
  assert.match(promotion, /arc_effect_promotion/);
  assert.match(promotion, /effect_model\.variants\[\]/);
  assert.match(promotion, /required_effects\[\]/);
});

test("SPEC-22 migration and Hook 3 coverage are visible in live repo contracts", () => {
  const redBunnyPath = path.join(REPO_ROOT, "worlds", "erotica-world", "stories", "red-bunny");
  const indexPath = path.join(REPO_ROOT, "worlds", "erotica-world", "stories", "INDEX.md");
  const hardGate = readRepoFile("docs/HARD-GATE-DISCIPLINE.md");

  assert.equal(existsSync(redBunnyPath), false);
  if (existsSync(indexPath)) {
    assert.doesNotMatch(readFileSync(indexPath, "utf8"), /red-bunny/);
  }
  assert.match(hardGate, /worlds\/<slug>\/stories\/<story-slug>\/_source\//);
  assert.match(hardGate, /Story-bundle `_source\/<class>\/\*\.yaml` records/);
});

function createSpec22RepoRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "worldloom-spec22-capstone-"));
  const world = path.join(root, "worlds", WORLD_SLUG);
  mkdirSync(path.join(root, "tools", "world-mcp"), { recursive: true });
  mkdirSync(path.join(world, "_source", "entities"), { recursive: true });
  writeFileSync(path.join(root, "tools", "world-mcp", "package.json"), "{}\n", "utf8");
  writeFileSync(path.join(world, "WORLD_KERNEL.md"), "# SPEC-22 Capstone\n", "utf8");
  writeFileSync(
    path.join(world, "ONTOLOGY.md"),
    ["# Ontology", "", "## Categories in Use", "- institution", "", "## Relation Types in Use", "- observes"].join("\n"),
    "utf8"
  );
  writeFileSync(
    path.join(world, "_source", "entities", "ENT-0001.yaml"),
    YAML.stringify({
      id: "ENT-0001",
      canonical_name: "Brinewick",
      entity_kind: "place",
      aliases: [],
      originating_cf: null,
      scope_notes: "Fixture entity for SPEC-22 capstone tests."
    }),
    "utf8"
  );
  writeStoryRecord(root, "pages", "PG-0001.yaml", {
    id: "PG-0001",
    story_id: "STORY-0001",
    branch_path: ["PG-0001"],
    storylet_realized: "SLT-0001",
    applied_event_ops: ["SE-0001"],
    state_snapshot: {
      applied_effect_variant: null,
      narrative_point_classification: "NATURAL_COMMITMENT_HINGE",
      arc_trace_id: null,
      arc_trace_emitted: false
    }
  });
  const storylet = YAML.parse(
    readRepoFile("tools/validators/tests/fixtures/story-storylet-complete.yaml")
  ) as Record<string, unknown>;
  storylet.story_id = "STORY-0001";
  writeStoryRecord(root, "storylets", "SLT-0001.yaml", storylet);
  writeStoryRecord(root, "events", "SE-0001.yaml", {
    id: "SE-0001",
    story_id: "STORY-0001",
    ops: [{ op_type: "fact_create", target: "SF-0001" }]
  });
  writeStoryMarkdown(root, "pages-prose/PG-0001.md", "Brinewick keeps watch. The watch continued with care.\n");
  assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);
  return root;
}

function buildArcTraceEnvelope(id: string): PatchPlanEnvelope {
  return {
    plan_id: `PLAN-SPEC22-${id}`,
    target_world: WORLD_SLUG,
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: { arc_trace_ids: [id] },
    patches: [
      {
        op: "create_arc_trace_record",
        target_world: WORLD_SLUG,
        target_file: `stories/${STORY_SLUG}/_source/arc-traces/${id}.yaml`,
        payload: {
          story_slug: STORY_SLUG,
          record: arcTraceRecord(id)
        }
      }
    ]
  };
}

function arcTraceRecord(id: string): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-0001",
    created_at_page: "PG-0001",
    arc_realized: "SLT-0001",
    effect_variant_applied: "partial-repair",
    realized_beats: [
      {
        beat_id: "beat-1",
        function: "maintain-watch",
        evidence_span: { start: 0, end: 18 },
        realized: "true"
      }
    ],
    observed_actions: [
      {
        actor: "STENT-0001",
        action: "keeps watch",
        target: "salt gate",
        evidence_span: { start: 0, end: 18 }
      }
    ],
    observed_claims: [
      {
        claim: "watch continued",
        source: "inference",
        canon_status: "story_local",
        evidence_span: { start: 21, end: 40 }
      }
    ],
    possible_violations: [],
    stop_condition_hit: {
      id: "help-accepted",
      category: "normal_exit",
      evidence_span: { start: 21, end: 40 }
    },
    effect_evidence: [
      {
        effect_ref: 0,
        realized: "true",
        evidence_span: { start: 21, end: 40 }
      }
    ],
    semantic_critic_verdict: {
      status: "pass",
      reasons: [],
      required_revision_constraints: []
    }
  };
}

async function withWorldMcpCwd<T>(root: string, run: () => T | Promise<T>): Promise<T> {
  const originalCwd = process.cwd();
  try {
    process.chdir(path.join(root, "tools", "world-mcp"));
    return await run();
  } finally {
    process.chdir(originalCwd);
  }
}

function writeStoryRecord(root: string, directory: string, fileName: string, record: Record<string, unknown>): void {
  const targetDirectory = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), YAML.stringify(record), "utf8");
}

function writeStoryMarkdown(root: string, relativePath: string, content: string): void {
  const targetPath = path.join(root, "worlds", WORLD_SLUG, "stories", STORY_SLUG, relativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, "utf8");
}

function signToken(envelope: PatchPlanEnvelope, secret: Buffer): string {
  const payload = JSON.stringify({
    plan_id: envelope.plan_id,
    world_slug: envelope.target_world,
    patch_hashes: envelope.patches.map(canonicalOpHash),
    issued_at: "2026-05-09T00:00:00.000Z",
    expires_at: "2999-01-01T00:00:00.000Z"
  });
  const signature = createHmac("sha256", secret).update(Buffer.from(payload, "utf8")).digest("hex");
  return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function pad4(value: number): string {
  return String(value).padStart(4, "0");
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}
