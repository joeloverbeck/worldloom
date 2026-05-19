import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { build } from "@worldloom/world-index/commands/build";

import { createServer } from "../../src/server.js";
import { MCP_TOOL_NAMES } from "../../src/tool-names.js";
import { getStoryStateProvenance } from "../../src/tools/get-story-state-provenance.js";
import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";

const WORLD_SLUG = "spec45-e2e";
const STORY_SLUG = "provenance-round-trip";

function writeFile(root: string, relativePath: string, lines: string[]): void {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
}

function writeWorldRecord(root: string, directory: string, fileName: string, lines: string[]): void {
  writeFile(root, path.join("worlds", WORLD_SLUG, "_source", directory, fileName), lines);
}

function writeStoryRecord(root: string, directory: string, fileName: string, lines: string[]): void {
  writeFile(
    root,
    path.join("worlds", WORLD_SLUG, "stories", STORY_SLUG, "_source", directory, fileName),
    lines
  );
}

function buildSpec45World(root: string): void {
  writeFile(root, path.join("worlds", WORLD_SLUG, "WORLD_KERNEL.md"), ["# Spec 45 E2E Fixture"]);
  writeFile(root, path.join("worlds", WORLD_SLUG, "ONTOLOGY.md"), [
    "# Ontology",
    "",
    "## Categories in Use",
    "- place",
    "",
    "## Relation Types in Use",
    "- causes",
    "",
    "## Notes on Use",
    "Spec 45 fixture."
  ]);
  writeWorldRecord(root, "canon", "CF-1.yaml", [
    "id: CF-1",
    "title: Bell Fact",
    "status: hard_canon",
    "type: event",
    "statement: A bell may ring in the fixture.",
    "scope:",
    "  geographic: local",
    "  temporal: current",
    "  social: public",
    "truth_scope:",
    "  world_level: true",
    "  diegetic_status: objective",
    "domains_affected: [everyday_life]",
    "required_world_updates: [EVERYDAY_LIFE]",
    "source_basis:",
    "  direct_user_approval: true",
    "modification_history: []"
  ]);
  writeWorldRecord(root, "change-log", "CH-1.yaml", [
    "change_id: CH-1",
    "date: 2026-05-18",
    "change_type: addition",
    "affected_fact_ids: [CF-1]",
    "summary: Fixture change.",
    "reason: [Fixture setup.]",
    "scope:",
    "  local_or_global: local",
    "  changes_ordinary_life: false",
    "  creates_new_story_engines: false",
    "  mystery_reserve_effect: unchanged",
    "downstream_updates: [EVERYDAY_LIFE]",
    "impact_on_existing_texts: []",
    "severity_before_fix: 0",
    "severity_after_fix: 0",
    "retcon_policy_checks:",
    "  no_silent_edit: true",
    "  replacement_noted: true",
    "  no_stealth_diegetic_rewrite: true",
    "  net_contradictions_not_increased: true",
    "  world_identity_preserved: true",
    "originating_cf: CF-1"
  ]);
  writeWorldRecord(root, "entities", "ENT-1.yaml", [
    "id: ENT-1",
    "canonical_name: Bell Tower",
    "entity_kind: place",
    "aliases: []",
    "originating_cf: CF-1",
    "scope_notes: Fixture entity."
  ]);
  writeWorldRecord(root, "everyday-life", "SEC-ELF-1.yaml", [
    "id: SEC-ELF-1",
    "file_class: EVERYDAY_LIFE",
    "order: 1",
    "heading: Bell routines",
    "heading_level: 2",
    "body: Bells ring in the fixture.",
    "touched_by_cf: [CF-1]"
  ]);

  writeStoryRecord(root, "pages", "PG-1.yaml", [
    "id: PG-1",
    "story_id: STORY-45",
    "branch_id: BR-1",
    "parent_page_id: null",
    "branch_path: [PG-1]",
    "state_snapshot:",
    "  objective_facts: [SF-1]"
  ]);
  writeStoryRecord(root, "facts", "SF-1.yaml", [
    "id: SF-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "subject: STENT-1",
    "predicate: hears",
    "object: the bell",
    "epistemic_class: objective",
    "truth_value: true"
  ]);
  writeStoryRecord(root, "beliefs", "BEL-1.yaml", [
    "id: BEL-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "holder: STENT-1",
    "claim: The bell is near.",
    "belief_mode: believes",
    "truth_relation: true",
    "confidence: high",
    "visibility: shared"
  ]);
  writeStoryRecord(root, "beliefs", "BEL-9.yaml", [
    "id: BEL-9",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "holder: STENT-1",
    "claim: Legacy belief without provenance edges.",
    "belief_mode: believes",
    "truth_relation: unknown",
    "confidence: low",
    "visibility: private"
  ]);
  writeStoryRecord(root, "entities", "STENT-1.yaml", [
    "id: STENT-1",
    "story_id: STORY-45",
    "world_ent_id: ENT-1",
    "name: Bell Keeper",
    "role_in_story: [primary_actor]",
    "present_at_start: true",
    "story_only: false"
  ]);
  writeStoryRecord(root, "clocks", "CLK-1.yaml", [
    "id: CLK-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "title: Bell Clock",
    "clock_kind: danger",
    "driver: STENT-1",
    "value: 1",
    "max: 6",
    "status: active"
  ]);
  writeStoryRecord(root, "events", "SE-1.yaml", [
    "id: SE-1",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "event_kind: story_start",
    "actor: system",
    "commitment:",
    "  selected_slt_id: null",
    "  selection_source: none",
    "world_logic_rationale: >-",
    "  The bell clock is introduced through structured event provenance.",
    "record_introductions:",
    "  - record_id: CLK-1",
    "    class: CLK",
    "    trigger: deadline_declared",
    "    evidence: [PG-1, SF-1]",
    "    distinct_from: []",
    "state_delta:",
    "  create: [CLK-1]",
    "  supersede: []",
    "  close: []"
  ]);
  writeStoryRecord(root, "events", "SE-2.yaml", [
    "id: SE-2",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "event_kind: selected_choice",
    "actor: STENT-1",
    "commitment:",
    "  selected_slt_id: null",
    "  selection_source: none",
    "world_logic_rationale: No structured introductions.",
    "state_delta:",
    "  create: []",
    "  supersede: [CLK-1]",
    "  close: []"
  ]);
  writeStoryRecord(root, "events", "SE-3.yaml", [
    "id: SE-3",
    "story_id: STORY-45",
    "created_at_page: PG-1",
    "event_kind: selected_choice",
    "actor: STENT-1",
    "commitment:",
    "  selected_slt_id: null",
    "  selection_source: none",
    "world_logic_rationale: No structured introductions.",
    "state_delta:",
    "  create: []",
    "  supersede: [CLK-1]",
    "  close: []"
  ]);
}

async function withSpec45World<T>(run: (root: string) => Promise<T>): Promise<T> {
  const root = createTempRepoRoot();

  try {
    buildSpec45World(root);
    assert.equal(build(root, WORLD_SLUG, { quiet: true }), 0);
    return await run(root);
  } finally {
    destroyTempRepoRoot(root);
  }
}

test("SPEC-45 MCP capstone returns provenance from an indexed synthetic bundle", async () => {
  await withSpec45World(async (root) => {
    const clock = await withRepoRoot(root, () =>
      getStoryStateProvenance({
        record_id: "CLK-1",
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG
      })
    );
    assert.ok(!("code" in clock));
    assert.deepEqual(clock, {
      record_id: "CLK-1",
      record_class: "CLK",
      creating_se_id: "SE-1",
      modifying_se_ids: ["SE-2", "SE-3"],
      evidence_records: ["PG-1", "SF-1"]
    });

    const legacy = await withRepoRoot(root, () =>
      getStoryStateProvenance({
        record_id: "BEL-9",
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG
      })
    );
    assert.ok(!("code" in legacy));
    assert.deepEqual(legacy, {
      record_id: "BEL-9",
      record_class: "BEL",
      creating_se_id: null,
      modifying_se_ids: [],
      evidence_records: []
    });
  });
});

test("SPEC-45 MCP capstone exposes get_story_state_provenance through describe_capabilities", async () => {
  await withSpec45World(async (root) => {
    const originalCwd = process.cwd();
    const server = createServer();
    const client = new Client({ name: "worldloom-spec45-e2e", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      process.chdir(path.join(root, "tools", "world-mcp"));
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const result = await client.callTool({
        name: MCP_TOOL_NAMES.describe_capabilities,
        arguments: {}
      });
      assert.notEqual(result.isError, true);

      const structured = result.structuredContent as {
        tools: Array<{ name: string }>;
      };
      assert.ok(
        structured.tools.some((tool) => tool.name === MCP_TOOL_NAMES.get_story_state_provenance)
      );

      const provenance = await client.callTool({
        name: MCP_TOOL_NAMES.get_story_state_provenance,
        arguments: {
          record_id: "CLK-1",
          world_slug: WORLD_SLUG,
          story_slug: STORY_SLUG
        }
      });
      assert.notEqual(provenance.isError, true);
      assert.deepEqual(provenance.structuredContent, {
        record_id: "CLK-1",
        record_class: "CLK",
        creating_se_id: "SE-1",
        modifying_se_ids: ["SE-2", "SE-3"],
        evidence_records: ["PG-1", "SF-1"]
      });
    } finally {
      await Promise.all([client.close(), server.close()]);
      process.chdir(originalCwd);
    }
  });
});
