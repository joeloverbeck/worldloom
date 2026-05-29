/*
SPEC-93 manual dry-run runbook

Purpose:
Exercise the LLM-owned planless bootstrap -> turn-cycle -> scene-plan ->
scene-prose-attach flow that cannot be fully invoked from node:test, while the
automated tests below cover the deterministic no-zombie-gates and planless PG
schema/hash invariants.

1. Create a disposable fixture root outside the repository, then copy or seed a
   story bundle under <tmp>/worlds/<world_slug>/stories/<story_slug>/.
2. Invoke branching-story-bootstrap in that temp root. Verify the root state
   writes include BR/SE/PG/CHC records only, no pages-prose-plans/PG-1.md, no
   PG.plan.plan_hash, and no PG.prose_plan_path.
3. Invoke branching-story-turn-cycle from the committed root PG. Verify the
   skill retrieves parent PG story records via get_record/get_records or
   get_context_packet with story_slug, emits SE + PG + CHC records only, and
   does not read a prior prose plan for state-delta reasoning.
4. Invoke branching-story-scene-plan over the committed PG range, then render
   prose to scene-prose/SCN-<n>.md.
5. Invoke branching-story-scene-prose-attach against the temp copy. Expected
   writes are scene-prose/SCN-<n>.md, scene-prose-receipts/SCN-<n>.yaml, and any
   allowed direct-write INDEX update. PG and other _source state files must not
   change during scene attach.
6. Verify from the temp root:
   - find worlds/<world_slug>/stories/<story_slug>/pages-prose-plans -type f
     reports no new PG page-plan artifacts, or the directory is absent.
   - node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --pg <planless-pg>
     emits state_hash only.
   - world-validate <world_slug> or package-local validators report no gate 3
     Mystery Reserve firewall or scene_range_forbidden_mystery_resolution FAILs.

Do not run this runbook against the real worlds/<slug>/ tree. It is deliberately
temp-root only.
*/

import assert from "node:assert/strict";
import { type Dirent, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { computePgStateHash } from "@worldloom/world-index/hash/content";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "../structural/helpers.js";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const SWEEP_ROOTS = [".claude/skills", "tools", "docs"];
const RETIRED_PATTERNS = [
  "page_plan_drafts",
  "hook6-guard-story-markdown-hash",
  "hook7-guard-prose-receipt-hash",
  "branching-story-prose-attach"
] as const;

const LEGACY_READ_PATTERNS = [
  "pages-prose-plans",
  "prose_plan_path",
  "page_plan_",
  "prose_receipt_"
] as const;

const HISTORICAL_PATH_PARTS = [
  "/archive/",
  "/docs/plans/",
  "/docs/triage/",
  "/docs/brainstorming/",
  "/reports/",
  "/tickets/"
] as const;

const LEGACY_READ_PATH_PARTS = [
  "/tools/story-explorer/",
  "/tools/world-index/",
  "/tools/world-mcp/tests/",
  "/tools/patch-engine/tests/",
  "/tools/validators/tests/",
  "/tools/validators/src/schemas/story-page.schema.json",
  "/tools/validators/src/schemas/story-scene.schema.json",
  "/tools/validators/src/structural/no-char-authority-in-story-runtime.ts",
  "/tools/validators/src/structural/forbidden-stchar-tamper-hash-fields.ts",
  "/tools/validators/src/structural/turn-driver-pov-observer-firewall.ts",
  "/tools/validators/src/structural/pg-se-turn-driver-consistency.ts",
  "/tools/validators/src/structural/stchar-utils.ts",
  "/tools/validators/src/structural/scene-prose-receipt-content.ts",
  "/tools/validators/src/structural/scene-prose-receipt-schema-compliance.ts",
  "/tools/validators/src/rules/rule_choice_set_noncollapse.ts",
  "/tools/validators/README.md",
  "/.claude/skills/_shared-templates/story-record-schemas.md",
  "/.claude/skills/_shared-templates/story-state-contract.md",
  "/.claude/skills/branching-story-scene-plan/SKILL.md",
  "/.claude/skills/branching-story-scene-prose-attach/SKILL.md",
  "/.claude/skills/branching-story-scene-prose-attach/references/write-and-validation.md",
  "/.claude/skills/branching-story-health-audit/SKILL.md",
  "/.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md",
  "/.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md",
  "/.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md",
  "/.claude/skills/story-fact-promotion-to-canon/SKILL.md",
  "/.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml",
  "/tools/hooks/README.md",
  "/tools/world-mcp/README.md",
  "/tools/world-mcp/src/cli/compute-pg-hashes.ts",
  "/docs/FOUNDATIONS.md",
  "/docs/WORKFLOWS.md",
  "/docs/REPOSITORY-MAP.md"
] as const;

const META_HISTORICAL_PATH_PARTS = [
  "/.claude/skills/mcp-integration-audit/",
  "/.claude/skills/reassess-spec/",
  "/.claude/skills/skill-streamlining-audit/",
  "/.claude/skills/spec-to-tickets/"
] as const;

test("SPEC-93 capstone classifies removal-completeness sweep hits", () => {
  const hits = sweepRetiredPatterns();
  const unclassified = hits.filter((hit) => classifyHit(hit) === "unclassified");

  assert.deepEqual(
    unclassified.map((hit) => `${hit.relativePath}:${hit.lineNumber}:${hit.pattern}`),
    []
  );

  for (const retired of RETIRED_PATTERNS) {
    assert.equal(
      hits.some((hit) => hit.pattern === retired && classifyHit(hit) === "unclassified"),
      false,
      `${retired} should appear only in historical/archive/testing provenance`
    );
  }
});

test("SPEC-93 capstone validates planless and legacy PG schema/hash behavior", async () => {
  const legacyPg = legacyPgRecord();
  const planlessPg = planlessPgRecord();

  assert.deepEqual(await recordSchemaCompliance.run({}, context([pageRecord(legacyPg)])), []);
  assert.deepEqual(await recordSchemaCompliance.run({}, context([pageRecord(planlessPg)])), []);

  const legacyHash = computePgStateHash({ ...legacyPg, state_hash: "stale" });
  const planlessHash = computePgStateHash({ ...planlessPg, state_hash: "stale" });

  assert.equal(computePgStateHash({ ...legacyPg, state_hash: legacyHash }), legacyHash);
  assert.equal(computePgStateHash({ ...planlessPg, state_hash: planlessHash }), planlessHash);
  assert.notEqual(planlessHash, legacyHash);
});

test("SPEC-93 capstone verifies computePgStateHash does not special-case prose_plan_path", () => {
  const content = readFileSync(path.join(REPO_ROOT, "tools/world-index/src/hash/content.ts"), "utf8");

  assert.match(content, /PG_STATE_HASH_EXCLUDED_FIELDS[\s\S]*"state_hash"/);
  assert.doesNotMatch(content, /prose_plan_path/);
  assert.doesNotMatch(content, /plan_hash/);
});

function sweepRetiredPatterns(): SweepHit[] {
  const hits: SweepHit[] = [];
  for (const root of SWEEP_ROOTS) {
    walk(path.join(REPO_ROOT, root), (absolutePath) => {
      const relativePath = path.relative(REPO_ROOT, absolutePath);
      if (!shouldScan(relativePath)) {
        return;
      }
      const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const pattern of [...RETIRED_PATTERNS, ...LEGACY_READ_PATTERNS]) {
          if (line.includes(pattern)) {
            hits.push({ relativePath, lineNumber: index + 1, line, pattern });
          }
        }
      });
    });
  }
  return hits;
}

function shouldScan(relativePath: string): boolean {
  if (relativePath.includes("/dist/") || relativePath.includes("/node_modules/")) {
    return false;
  }
  return /\.(?:md|ts|tsx|js|json|yaml|yml|example)$/.test(relativePath);
}

function walk(directory: string, visit: (absolutePath: string) => void): void {
  for (const entry of readdirSafe(directory)) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, visit);
      continue;
    }
    if (entry.isFile()) {
      visit(absolutePath);
    }
  }
}

function readdirSafe(directory: string): Dirent[] {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function classifyHit(hit: SweepHit): "historical" | "legacy-read" | "unclassified" {
  if (isHistorical(hit)) {
    return "historical";
  }
  const normalized = `/${hit.relativePath}`;
  if (LEGACY_READ_PATH_PARTS.some((part) => normalized.includes(part))) {
    return "legacy-read";
  }
  return "unclassified";
}

function isHistorical(hit: SweepHit): boolean {
  const normalized = `/${hit.relativePath}`;
  return HISTORICAL_PATH_PARTS.some((part) => normalized.includes(part)) ||
    META_HISTORICAL_PATH_PARTS.some((part) => normalized.includes(part)) ||
    /\b(?:historical|historically|legacy|retired|grandfathered|SPEC-9[23])\b/i.test(hit.line);
}

function legacyPgRecord(): Record<string, unknown> {
  return {
    id: "PG-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: null,
    branch_path: ["PG-1"],
    turn_index: 0,
    input: {
      choice_id: null,
      manual_action_text: null,
      resolved_event_id: "SE-1"
    },
    state_hash_parent: null,
    prose_plan_path: "pages-prose-plans/PG-1.md",
    plan: {
      plan_hash: "0".repeat(64)
    },
    state_hash: "1".repeat(64),
    state_snapshot: {
      canon_revision: "CH-1",
      active_records: {
        STCHAR: ["STCHAR-1"]
      }
    },
    emitted_choices: [],
    validation_trace: {
      input_legality: "PASS: root story event selected"
    }
  };
}

function planlessPgRecord(): Record<string, unknown> {
  const parsed = legacyPgRecord();
  delete parsed.prose_plan_path;
  delete parsed.plan;
  return parsed;
}

function pageRecord(parsed: Record<string, unknown>) {
  return record("page_record", String(parsed.id ?? "PG-1"), "stories/foo/_source/pages/PG-1.yaml", parsed);
}

interface SweepHit {
  relativePath: string;
  lineNumber: number;
  line: string;
  pattern: string;
}
